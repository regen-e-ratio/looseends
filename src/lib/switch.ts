import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { decrypt, encrypt, newToken } from "./crypto";
import { appUrl, reminderEveryDays } from "./config";
import { releaseEmail, releasedNoticeEmail, reminderEmail, sendEmail } from "./email";

const { users, recipients } = schema;
const DAY = 86_400_000;

export type SwitchAction = "none" | "start_warning" | "remind" | "trigger" | "release_pending";

export function nextCheckInDue(u: Pick<User, "lastCheckInAt" | "checkInIntervalDays">): Date {
  return new Date(u.lastCheckInAt.getTime() + u.checkInIntervalDays * DAY);
}

/** When the vault will be released if the user keeps ignoring reminders. */
export function releaseDate(
  u: Pick<User, "lastCheckInAt" | "checkInIntervalDays" | "gracePeriodDays" | "warningStartedAt" | "switchStatus">,
): Date {
  const warningStart = u.switchStatus === "warning" && u.warningStartedAt ? u.warningStartedAt : nextCheckInDue(u);
  return new Date(warningStart.getTime() + u.gracePeriodDays * DAY);
}

/** Pure decision function — easy to reason about and test. */
export function evaluateSwitch(u: User, now: Date): SwitchAction {
  if (!u.switchEnabled) return "none";
  if (u.switchStatus === "triggered") return "release_pending";
  if (u.switchStatus === "active") return now >= nextCheckInDue(u) ? "start_warning" : "none";
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

/** Record that the user is alive. Callers must not use this once the vault was released (use resetAfterRelease). */
export async function checkIn(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ lastCheckInAt: new Date(), switchStatus: "active", warningStartedAt: null, lastReminderAt: null, checkInToken: null })
    .where(eq(users.id, userId));
}

export async function checkInWithToken(userId: string, token: string): Promise<"ok" | "invalid" | "released"> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u || !u.checkInToken) return "invalid";
  const expected = Buffer.from(decrypt(u.checkInToken));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  if (u.switchStatus === "triggered") return "released";
  await checkIn(u.id);
  return "ok";
}

/** After a (false-alarm) release: revoke every access link and restart the timer. */
export async function resetAfterRelease(userId: string): Promise<void> {
  await db.update(recipients).set({ accessTokenHash: null, releasedAt: null }).where(eq(recipients.userId, userId));
  await db.update(users).set({ triggeredAt: null }).where(eq(users.id, userId));
  await checkIn(userId);
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
        .set({ switchStatus: "triggered", triggeredAt: now, checkInToken: null })
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
