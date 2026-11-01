import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Recipient, User } from "@/db/schema";
import { decrypt, encrypt, hashToken, newToken } from "./crypto";
import { appUrl, reminderEveryDays } from "./config";
import {
  claimInviteEmail,
  claimPendingEmail,
  claimRejectedEmail,
  releaseEmail,
  releasedNoticeEmail,
  reminderEmail,
  sendEmail,
} from "./email";

const { users, recipients } = schema;
const DAY = 86_400_000;

export type SwitchAction = "none" | "start_warning" | "remind" | "trigger" | "release_pending";

export function nextCheckInDue(u: Pick<User, "lastCheckInAt" | "checkInIntervalDays">): Date {
  return new Date(u.lastCheckInAt.getTime() + u.checkInIntervalDays * DAY);
}

/**
 * When the vault will be released if nobody stops it. While a warning/claim is pending this is
 * its start + grace period; otherwise (check-in mode) the next due date + grace period.
 */
export function releaseDate(
  u: Pick<User, "lastCheckInAt" | "checkInIntervalDays" | "gracePeriodDays" | "warningStartedAt" | "switchStatus" | "switchMode">,
): Date {
  const start =
    u.switchStatus === "warning" && u.warningStartedAt ? u.warningStartedAt : u.switchMode === "claim" ? new Date() : nextCheckInDue(u);
  return new Date(start.getTime() + u.gracePeriodDays * DAY);
}

/** Pure decision function — easy to reason about and test. */
export function evaluateSwitch(u: User, now: Date): SwitchAction {
  if (!u.switchEnabled) return "none";
  if (u.switchStatus === "triggered") return "release_pending";
  if (u.switchStatus === "active") {
    // Claim mode never starts on its own: only a trusted contact's request does (see startClaim).
    if (u.switchMode === "claim") return "none";
    return now >= nextCheckInDue(u) ? "start_warning" : "none";
  }
  // warning
  if (now >= releaseDate(u)) return "trigger";
  const last = u.lastReminderAt?.getTime() ?? 0;
  return now.getTime() - last >= reminderEveryDays(u.gracePeriodDays) * DAY - 60 * 60_000 ? "remind" : "none";
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

export async function sendReminder(u: User, opts: { test?: boolean } = {}): Promise<void> {
  const token = await checkInToken(u);
  const link = `${appUrl()}/check-in?u=${u.id}&t=${token}`;
  if (u.switchMode === "claim" && u.switchStatus === "warning" && u.claimRecipientId) {
    const claimant = await db.query.recipients.findFirst({ where: eq(recipients.id, u.claimRecipientId) });
    await sendEmail(
      claimPendingEmail({
        to: u.email,
        name: u.name,
        claimantName: claimant?.name ?? "A trusted contact",
        link,
        releaseDate: releaseDate(u),
        reminder: Boolean(u.lastReminderAt && u.warningStartedAt && u.lastReminderAt > u.warningStartedAt),
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

const RESET = {
  switchStatus: "active",
  warningStartedAt: null,
  lastReminderAt: null,
  checkInToken: null,
  claimRecipientId: null,
} as const;

/** Signed-in visits count as a check-in at most this often. */
const AUTO_CHECK_IN_EVERY_MS = 60 * 60_000;

export function isClaimPending(u: Pick<User, "switchMode" | "switchStatus" | "claimRecipientId">): boolean {
  return u.switchMode === "claim" && u.switchStatus === "warning" && Boolean(u.claimRecipientId);
}

export function needsAutoCheckIn(u: User, now = new Date()): boolean {
  if (u.switchStatus === "triggered") return false;
  if (u.switchMode === "checkin" && u.switchStatus === "warning") return true;
  return now.getTime() - u.lastCheckInAt.getTime() > AUTO_CHECK_IN_EVERY_MS;
}

/**
 * Passive sign of life: signing in or visiting the app.
 * - check-in mode: resets the timer and stops any reminders.
 * - claim mode: only records the visit. A pending claim is never cancelled implicitly — someone with
 *   access to the owner's signed-in device must not be able to block it; the owner rejects it explicitly.
 * Does nothing once the vault has been released (that needs resetAfterRelease).
 */
export async function recordActivity(u: User): Promise<User> {
  if (u.switchStatus === "triggered") return u;
  const now = new Date();
  const [updated] = await db
    .update(users)
    .set(isClaimPending(u) ? { lastCheckInAt: now } : { lastCheckInAt: now, ...RESET })
    .where(eq(users.id, u.id))
    .returning();
  return updated ?? u;
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
  await db.update(users).set({ lastCheckInAt: new Date(), ...RESET }).where(eq(users.id, u.id));
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
  await db.update(recipients).set({ accessTokenHash: null, releasedAt: null }).where(eq(recipients.userId, userId));
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

/** Emails a contact a fresh personal "request access" link (any previous link stops working). */
export async function sendClaimInvite(owner: User, r: Recipient): Promise<void> {
  const { token, hash } = newToken();
  await db.update(recipients).set({ claimTokenHash: hash }).where(eq(recipients.id, r.id));
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
  await db.update(recipients).set({ claimLinkSentAt: new Date(), notifiedAt: new Date() }).where(eq(recipients.id, r.id));
}

/** Sends claim links to every contact that doesn't have one yet. Returns how many were sent / failed. */
export async function sendMissingClaimInvites(owner: User): Promise<{ sent: number; failed: number }> {
  const missing = await db
    .select()
    .from(recipients)
    .where(and(eq(recipients.userId, owner.id), isNull(recipients.claimTokenHash)));
  let sent = 0;
  let failed = 0;
  for (const r of missing) {
    try {
      await sendClaimInvite(owner, r);
      sent++;
    } catch (err) {
      console.error(`claim invite to recipient ${r.id} failed`, err);
      await db.update(recipients).set({ claimTokenHash: null }).where(eq(recipients.id, r.id));
      failed++;
    }
  }
  return { sent, failed };
}

/** Leaving claim mode: every claim link stops working. */
export async function revokeClaimLinks(ownerId: string): Promise<void> {
  await db.update(recipients).set({ claimTokenHash: null, claimLinkSentAt: null }).where(eq(recipients.userId, ownerId));
}

export type ClaimView =
  | { state: "invalid" }
  | { state: "inactive"; ownerName: string }
  | { state: "released"; ownerName: string }
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
  const found = await findClaimant(token);
  if (!found) return { state: "invalid" };
  const now = new Date();
  // Atomic: only one claim can be pending, and only while claim mode is on.
  const [updated] = await db
    .update(users)
    .set({ switchStatus: "warning", warningStartedAt: now, lastReminderAt: now, claimRecipientId: found.r.id })
    .where(and(eq(users.id, found.owner.id), eq(users.switchStatus, "active"), eq(users.switchMode, "claim"), eq(users.switchEnabled, true)))
    .returning();
  if (updated) {
    await sendReminder(updated).catch((e) => console.error("claim notice to owner failed", e));
  }
  return getClaimView(token);
}

async function releaseToRecipients(u: User): Promise<{ sent: number; failed: number }> {
  const pending = await db
    .select()
    .from(recipients)
    .where(and(eq(recipients.userId, u.id), isNull(recipients.releasedAt)));
  let sent = 0;
  let failed = 0;
  for (const r of pending) {
    const { token, hash } = newToken();
    await db.update(recipients).set({ accessTokenHash: hash }).where(eq(recipients.id, r.id));
    try {
      await sendEmail(
        releaseEmail({
          to: r.email,
          recipientName: r.name,
          ownerName: u.name || u.email,
          ownerEmail: u.email,
          link: `${appUrl()}/access/${token}`,
        }),
      );
      await db.update(recipients).set({ releasedAt: new Date() }).where(eq(recipients.id, r.id));
      sent++;
    } catch (err) {
      console.error(`release email to recipient ${r.id} failed`, err);
      failed++; // retried on the next cron run with a fresh token
    }
  }
  return { sent, failed };
}

export async function processUser(u: User, now = new Date()): Promise<SwitchAction> {
  const action = evaluateSwitch(u, now);
  switch (action) {
    case "start_warning": {
      const [updated] = await db
        .update(users)
        .set({ switchStatus: "warning", warningStartedAt: now, lastReminderAt: now })
        .where(eq(users.id, u.id))
        .returning();
      await sendReminder(updated);
      break;
    }
    case "remind": {
      const [updated] = await db.update(users).set({ lastReminderAt: now }).where(eq(users.id, u.id)).returning();
      await sendReminder(updated);
      break;
    }
    case "trigger": {
      const [updated] = await db
        .update(users)
        .set({ switchStatus: "triggered", triggeredAt: now, checkInToken: null, claimRecipientId: null })
        .where(eq(users.id, u.id))
        .returning();
      const { sent } = await releaseToRecipients(updated);
      await sendEmail(releasedNoticeEmail({ to: u.email, count: sent })).catch((e) => console.error(e));
      break;
    }
    case "release_pending":
      await releaseToRecipients(u);
      break;
  }
  return action;
}

/** Called daily by Vercel Cron. */
export async function runSwitchCheck(now = new Date()) {
  const candidates = await db.select().from(users).where(eq(users.switchEnabled, true));
  const summary: Record<SwitchAction | "error", number> = {
    none: 0,
    start_warning: 0,
    remind: 0,
    trigger: 0,
    release_pending: 0,
    error: 0,
  };
  for (const u of candidates) {
    try {
      summary[await processUser(u, now)]++;
    } catch (err) {
      console.error(`switch check failed for user ${u.id}`, err);
      summary.error++;
    }
  }
  return { checked: candidates.length, ...summary };
}
