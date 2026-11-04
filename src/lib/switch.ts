import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, exists, isNull, lt, lte, ne, not, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Recipient, User } from "@/db/schema";
import { decrypt, encrypt, hashToken, newToken } from "./crypto";
import { appUrl } from "./config";
import {
  claimInviteEmail,
  claimPendingEmail,
  claimRejectedEmail,
  releaseEmail,
  releasedNoticeEmail,
  reminderEmail,
  sendEmail,
} from "./email";
import { LIMITS, allow, assertUserEmailAllowed } from "./rate-limit";
import { DAY, SLACK_MS, evaluateSwitch, isClaimPending, releaseDate, type SwitchAction } from "./switch-rules";

export * from "./switch-rules";

const { users, recipients, loginTokens, sessions, rateLimits, jobLeases } = schema;

const RESET = {
  switchStatus: "active",
  warningStartedAt: null,
  lastReminderAt: null,
  checkInToken: null,
  claimRecipientId: null,
} as const;

/**
 * Only update the row if it is still in the warning period we read (compare-and-set). Compared at
 * millisecond precision: that's what we read back into JavaScript, while Postgres may store microseconds.
 */
function sameWarning(u: User) {
  return and(
    eq(users.id, u.id),
    eq(users.switchStatus, "warning"),
    u.warningStartedAt
      ? sql`date_trunc('milliseconds', ${users.warningStartedAt}) = ${u.warningStartedAt.toISOString()}::timestamptz`
      : isNull(users.warningStartedAt),
  );
}

async function recipientCount(userId: string): Promise<number> {
  return (await db.select({ id: recipients.id }).from(recipients).where(eq(recipients.userId, userId))).length;
}

/** Returns (and lazily creates) the stable check-in token for the current warning period. */
async function checkInToken(u: User): Promise<string> {
  if (u.checkInToken) return decrypt(u.checkInToken);
  const { token } = newToken();
  await db.update(users).set({ checkInToken: encrypt(token) }).where(eq(users.id, u.id));
  return token;
}

/** Composes and sends the owner's reminder (a check-in reminder, or a pending-claim notice). Throws on failure. */
export async function sendReminder(u: User, opts: { test?: boolean } = {}): Promise<void> {
  const token = await checkInToken(u);
  const link = `${appUrl()}/check-in?u=${u.id}&t=${token}`;
  if (isClaimPending(u) && u.claimRecipientId) {
    const claimant = await db.query.recipients.findFirst({ where: eq(recipients.id, u.claimRecipientId) });
    await sendEmail(
      claimPendingEmail({
        to: u.email,
        name: u.name,
        claimantName: claimant?.name ?? "A trusted contact",
        link,
        releaseDate: releaseDate(u),
        reminder: Boolean(u.lastReminderAt),
      }),
    );
    return;
  }
  await sendEmail(
    reminderEmail({
      to: u.email,
      name: u.name,
      link,
      releaseDate: releaseDate(u),
      recipientCount: await recipientCount(u.id),
      test: opts.test,
    }),
  );
}

/**
 * Sends the reminder for the current warning period and records it only once it was actually delivered.
 * The first delivered reminder (re)starts the grace period, so after an email outage the owner still gets
 * the full grace period from the first reminder that reached them.
 */
async function deliverReminder(u: User): Promise<boolean> {
  const now = new Date();
  const first = !u.lastReminderAt;
  try {
    await sendReminder(first ? { ...u, warningStartedAt: now } : u);
  } catch (err) {
    console.error(`reminder to user ${u.id} failed`, err);
    return false;
  }
  await db
    .update(users)
    .set(first ? { lastReminderAt: now, warningStartedAt: now } : { lastReminderAt: now })
    .where(sameWarning(u));
  return true;
}

/**
 * Passive sign of life: signing in or visiting the app.
 * - check-in mode: resets the timer and stops any reminders.
 * - claim mode: only records the visit. A pending claim is never cancelled implicitly — someone with
 *   access to the owner's signed-in device must not be able to block it; the owner rejects it explicitly.
 * Does nothing once the vault has been released (that needs resetAfterRelease).
 * Both updates are conditional, so a claim that starts concurrently is never wiped.
 */
export async function recordActivity(u: User): Promise<User> {
  if (u.switchStatus === "triggered") return u;
  const now = new Date();
  const [reset] = await db
    .update(users)
    .set({ lastCheckInAt: now, ...RESET })
    .where(and(eq(users.id, u.id), ne(users.switchStatus, "triggered"), not(and(eq(users.switchMode, "claim"), eq(users.switchStatus, "warning"))!)))
    .returning();
  if (reset) return reset;
  const [touched] = await db
    .update(users)
    .set({ lastCheckInAt: now })
    .where(and(eq(users.id, u.id), ne(users.switchStatus, "triggered")))
    .returning();
  return touched ?? u;
}

/**
 * Explicit "I'm OK" (dashboard button, check-in link, rejecting a claim): resets everything and
 * rejects a pending claim, telling the contact who made it.
 */
export async function confirmAlive(userId: string): Promise<"ok" | "rejected" | "released"> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return "ok";
  if (u.switchStatus === "triggered") return "released";
  const claimantId = isClaimPending(u) ? u.claimRecipientId : null;
  const [updated] = await db
    .update(users)
    .set({ lastCheckInAt: new Date(), ...RESET })
    .where(and(eq(users.id, u.id), ne(users.switchStatus, "triggered")))
    .returning({ id: users.id });
  if (!updated) return "released"; // released in the meantime
  if (!claimantId) return "ok";
  const claimant = await db.query.recipients.findFirst({ where: eq(recipients.id, claimantId) });
  if (claimant) {
    await sendEmail(claimRejectedEmail({ to: claimant.email, recipientName: claimant.name, ownerName: u.name || u.email })).catch((e) =>
      console.error("claim rejected email failed", e),
    );
  }
  return "rejected";
}

export async function checkInWithToken(userId: string, token: string): Promise<"ok" | "rejected" | "invalid" | "released"> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u || !u.checkInToken) return "invalid";
  const expected = Buffer.from(decrypt(u.checkInToken));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  return confirmAlive(u.id);
}

/** After a (false-alarm) release: revoke every access link and restart the timer. */
export async function resetAfterRelease(userId: string): Promise<void> {
  await db
    .update(recipients)
    .set({ accessTokenHash: null, releasedAt: null, releaseAttemptAt: null })
    .where(eq(recipients.userId, userId));
  await db.update(users).set({ triggeredAt: null, lastCheckInAt: new Date(), ...RESET }).where(eq(users.id, userId));
}

/** Changing the switch settings starts a fresh check-in period (but never silently drops a pending claim). */
export async function restartSchedule(u: User): Promise<void> {
  if (u.switchStatus === "triggered" || isClaimPending(u)) return;
  await db.update(users).set({ lastCheckInAt: new Date(), ...RESET }).where(eq(users.id, u.id));
}

/** The contact who made the pending claim was removed: drop the claim without telling anyone. */
export async function dropClaim(ownerId: string): Promise<void> {
  await db.update(users).set({ lastCheckInAt: new Date(), ...RESET }).where(and(eq(users.id, ownerId), eq(users.switchStatus, "warning")));
}

// ---------- claim mode ----------

/**
 * Emails a contact a fresh personal "request access" link. The new link only replaces the old one once
 * the email was sent, so a failed send never leaves the contact without a working link.
 */
export async function sendClaimInvite(owner: User, r: Recipient): Promise<void> {
  await assertUserEmailAllowed(owner.id);
  const { token, hash } = newToken();
  await sendEmail(
    claimInviteEmail({
      to: r.email,
      recipientName: r.name,
      ownerName: owner.name || owner.email,
      ownerEmail: owner.email,
      link: `${appUrl()}/claim/${token}`,
      waitDays: owner.gracePeriodDays,
    }),
  );
  const now = new Date();
  await db.update(recipients).set({ claimTokenHash: hash, claimLinkSentAt: now, notifiedAt: now }).where(eq(recipients.id, r.id));
}

/** Sends claim links to every contact who hasn't received one. Returns how many were sent / failed. */
export async function sendMissingClaimInvites(owner: User): Promise<{ sent: number; failed: number }> {
  const missing = await db
    .select()
    .from(recipients)
    .where(and(eq(recipients.userId, owner.id), isNull(recipients.claimLinkSentAt)));
  let sent = 0;
  let failed = 0;
  for (const r of missing) {
    try {
      await sendClaimInvite(owner, r);
      sent++;
    } catch (err) {
      console.error(`claim invite to recipient ${r.id} failed`, err);
      failed++;
    }
  }
  return { sent, failed };
}

/** Leaving claim mode: every claim link stops working. */
export async function revokeClaimLinks(ownerId: string): Promise<void> {
  await db.update(recipients).set({ claimTokenHash: null, claimLinkSentAt: null }).where(eq(recipients.userId, ownerId));
}

/** One contact's link stops working (e.g. their email address changed). */
export async function revokeClaimLink(recipientId: string): Promise<void> {
  await db.update(recipients).set({ claimTokenHash: null, claimLinkSentAt: null }).where(eq(recipients.id, recipientId));
}

export type ClaimView =
  | { state: "invalid" }
  | { state: "inactive"; ownerName: string }
  | { state: "released"; ownerName: string }
  | { state: "limited"; ownerName: string }
  | { state: "pending"; ownerName: string; byYou: boolean; releaseDate: Date }
  | { state: "open"; ownerName: string; recipientName: string; waitDays: number };

async function findClaimant(token: string) {
  const r = await db.query.recipients.findFirst({ where: eq(recipients.claimTokenHash, hashToken(token)) });
  const owner = r ? await db.query.users.findFirst({ where: eq(users.id, r.userId) }) : undefined;
  return r && owner ? { r, owner } : null;
}

export async function getClaimView(token: string): Promise<ClaimView> {
  const found = await findClaimant(token);
  if (!found) return { state: "invalid" };
  const { r, owner } = found;
  const ownerName = owner.name || owner.email;
  if (owner.switchStatus === "triggered") return { state: "released", ownerName };
  if (!owner.switchEnabled || owner.switchMode !== "claim") return { state: "inactive", ownerName };
  if (owner.switchStatus === "warning") {
    return { state: "pending", ownerName, byYou: owner.claimRecipientId === r.id, releaseDate: releaseDate(owner) };
  }
  return { state: "open", ownerName, recipientName: r.name, waitDays: owner.gracePeriodDays };
}

/** A trusted contact requests access. Starts the owner's waiting period and notifies them. */
export async function startClaim(token: string): Promise<ClaimView> {
  const view = await getClaimView(token);
  if (view.state !== "open") return view;
  const found = (await findClaimant(token))!;
  // A contact can't flood the owner with claims (each one emails the owner).
  if (!(await allow(`claim:${found.r.id}`, LIMITS.claimsPerContactPerDay.limit, LIMITS.claimsPerContactPerDay.window))) {
    return { state: "limited", ownerName: view.ownerName };
  }
  // Atomic: only one claim can be pending, and only while claim mode is on.
  const [updated] = await db
    .update(users)
    .set({ switchStatus: "warning", warningStartedAt: new Date(), lastReminderAt: null, claimRecipientId: found.r.id })
    .where(and(eq(users.id, found.owner.id), eq(users.switchStatus, "active"), eq(users.switchMode, "claim"), eq(users.switchEnabled, true)))
    .returning();
  // If this first notice fails, the daily job keeps retrying, and nothing is released until one arrives.
  if (updated) await deliverReminder(updated);
  return getClaimView(token);
}

// ---------- the daily job ----------

/**
 * Sends release emails. Only contacts that existed when the vault was released get one (people added
 * afterwards were never told anything would be shared). Each contact is "claimed" before sending, so two
 * overlapping runs can never both email the same person (which would also kill the first link).
 */
async function releaseToRecipients(u: User): Promise<{ sent: number; failed: number }> {
  if (!u.triggeredAt) return { sent: 0, failed: 0 };
  const pending = await db
    .select()
    .from(recipients)
    .where(and(eq(recipients.userId, u.id), isNull(recipients.releasedAt), lte(recipients.createdAt, u.triggeredAt)));
  let sent = 0;
  let failed = 0;
  for (const r of pending) {
    const { token, hash } = newToken();
    const [claimed] = await db
      .update(recipients)
      .set({ accessTokenHash: hash, releaseAttemptAt: new Date() })
      .where(
        and(
          eq(recipients.id, r.id),
          isNull(recipients.releasedAt),
          or(isNull(recipients.releaseAttemptAt), lt(recipients.releaseAttemptAt, new Date(Date.now() - 15 * 60_000))),
        ),
      )
      .returning({ id: recipients.id });
    if (!claimed) continue; // another run is sending this one
    try {
      await sendEmail(
        releaseEmail({
          to: r.email,
          recipientName: r.name,
          ownerName: u.name || u.email,
          ownerEmail: u.email,
          link: `${appUrl()}/access/${token}`,
          mode: u.switchMode,
        }),
      );
      await db.update(recipients).set({ releasedAt: new Date() }).where(eq(recipients.id, r.id));
      sent++;
    } catch (err) {
      console.error(`release email to recipient ${r.id} failed`, err);
      failed++; // retried on a later run with a fresh token
    }
  }
  return { sent, failed };
}

/** Carries out one user's next step. Works on a fresh read, and every state change is compare-and-set. */
export async function processUser(snapshot: Pick<User, "id">, now = new Date()): Promise<SwitchAction> {
  const u = await db.query.users.findFirst({ where: eq(users.id, snapshot.id) });
  if (!u) return "none";
  const action = evaluateSwitch(u, now);
  switch (action) {
    case "start_warning": {
      const dueBy = new Date(now.getTime() + SLACK_MS);
      const [started] = await db
        .update(users)
        .set({ switchStatus: "warning", warningStartedAt: now, lastReminderAt: null, checkInToken: null })
        .where(
          and(
            eq(users.id, u.id),
            eq(users.switchStatus, "active"),
            eq(users.switchMode, "checkin"),
            eq(users.switchEnabled, true),
            sql`${users.lastCheckInAt} + ${users.checkInIntervalDays} * interval '1 day' <= ${dueBy.toISOString()}::timestamptz`,
          ),
        )
        .returning();
      if (!started) return "none"; // checked in meanwhile
      if (!(await deliverReminder(started))) throw new Error("reminder could not be delivered (will retry)");
      return action;
    }
    case "remind":
      if (!(await deliverReminder(u))) throw new Error("reminder could not be delivered (will retry)");
      return action;
    case "trigger": {
      const [released] = await db
        .update(users)
        .set({ switchStatus: "triggered", triggeredAt: now, checkInToken: null, claimRecipientId: null })
        .where(sameWarning(u))
        .returning();
      if (!released) return "none"; // the owner responded meanwhile
      const { sent } = await releaseToRecipients(released);
      await sendEmail(releasedNoticeEmail({ to: u.email, count: sent, mode: u.switchMode })).catch((e) => console.error(e));
      return action;
    }
    case "release_pending":
      await releaseToRecipients(u);
      return action;
    default:
      return action;
  }
}

/** Takes a short lease so overlapping runs (Vercel can deliver a cron twice) don't both work. */
async function acquireLease(name: string, seconds: number): Promise<boolean> {
  const until = new Date(Date.now() + seconds * 1000);
  const rows = await db
    .insert(jobLeases)
    .values({ name, lockedUntil: until })
    .onConflictDoUpdate({ target: jobLeases.name, set: { lockedUntil: until }, setWhere: lt(jobLeases.lockedUntil, new Date()) })
    .returning({ name: jobLeases.name });
  return rows.length > 0;
}

async function releaseLease(name: string) {
  await db.update(jobLeases).set({ lockedUntil: new Date(0) }).where(eq(jobLeases.name, name));
}

/** Deletes data that has served its purpose. */
async function housekeeping() {
  await db.delete(loginTokens).where(lt(loginTokens.createdAt, new Date(Date.now() - DAY)));
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(Date.now() - 2 * DAY)));
}

const TIME_BUDGET_MS = 45_000;

/** Called daily by Vercel Cron. Loads only users with something due, oldest first, within a time budget. */
export async function runSwitchCheck(now = new Date()) {
  if (!(await acquireLease("switch-check", 10 * 60))) return { skipped: "another run is in progress" };
  try {
    const startedAt = Date.now();
    const dueBy = new Date(now.getTime() + SLACK_MS);
    const unreleased = db
      .select({ x: sql`1` })
      .from(recipients)
      .where(and(eq(recipients.userId, users.id), isNull(recipients.releasedAt), lte(recipients.createdAt, users.triggeredAt)));
    const candidates = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.switchEnabled, true),
          or(
            eq(users.switchStatus, "warning"),
            and(eq(users.switchStatus, "triggered"), exists(unreleased)),
            and(
              eq(users.switchStatus, "active"),
              eq(users.switchMode, "checkin"),
              sql`${users.lastCheckInAt} + ${users.checkInIntervalDays} * interval '1 day' <= ${dueBy.toISOString()}::timestamptz`,
            ),
          ),
        ),
      )
      .orderBy(asc(users.lastCheckInAt));

    const summary: Record<SwitchAction | "error" | "deferred", number> = {
      none: 0,
      start_warning: 0,
      remind: 0,
      trigger: 0,
      release_pending: 0,
      error: 0,
      deferred: 0,
    };
    for (const [i, c] of candidates.entries()) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        summary.deferred = candidates.length - i; // picked up by the next run
        console.error(`switch check: time budget used, ${summary.deferred} users deferred`);
        break;
      }
      try {
        summary[await processUser(c, now)]++;
      } catch (err) {
        console.error(`switch check failed for user ${c.id}`, err);
        summary.error++;
      }
    }
    await housekeeping().catch((e) => console.error("housekeeping failed", e));
    return { checked: candidates.length, ...summary };
  } finally {
    await releaseLease("switch-check");
  }
}
