/**
 * The release switch's decision rules. Pure functions (no database, no email), so they can be unit-tested
 * and reasoned about on their own. src/lib/switch.ts carries them out.
 */
import type { User } from "@/db/schema";
import { reminderEveryDays } from "./config";

export const DAY = 86_400_000;
/** Vercel Cron starts anywhere within the scheduled hour, so time comparisons allow for drift. */
export const SLACK_MS = 2 * 60 * 60_000;
/** Signed-in visits count as a check-in at most this often. */
const AUTO_CHECK_IN_EVERY_MS = 60 * 60_000;

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

export function isClaimPending(u: Pick<User, "switchMode" | "switchStatus" | "claimRecipientId">): boolean {
  return u.switchMode === "claim" && u.switchStatus === "warning" && Boolean(u.claimRecipientId);
}

export function needsAutoCheckIn(u: User, now = new Date()): boolean {
  if (u.switchStatus === "triggered") return false;
  if (u.switchMode === "checkin" && u.switchStatus === "warning") return true;
  return now.getTime() - u.lastCheckInAt.getTime() > AUTO_CHECK_IN_EVERY_MS;
}

/**
 * What the daily job should do for this user.
 * `lastReminderAt` is the last reminder that was actually delivered: nothing is ever released before the
 * owner has received at least one reminder in the current warning period.
 */
export function evaluateSwitch(u: User, now: Date): SwitchAction {
  if (!u.switchEnabled) return "none";
  if (u.switchStatus === "triggered") return "release_pending";
  const t = now.getTime();
  if (u.switchStatus === "active") {
    // Claim mode never starts on its own: only a trusted contact's request does.
    if (u.switchMode === "claim") return "none";
    return t >= nextCheckInDue(u).getTime() - SLACK_MS ? "start_warning" : "none";
  }
  // warning: check-in reminders are running, or a claim is pending.
  if (u.switchMode === "claim" && !u.claimRecipientId) return "none"; // inconsistent state: never release on it
  if (!u.lastReminderAt) return "remind"; // no reminder has reached the owner yet: keep trying, never release
  if (t >= releaseDate(u).getTime() - SLACK_MS) return "trigger";
  return t - u.lastReminderAt.getTime() >= reminderEveryDays(u.gracePeriodDays) * DAY - SLACK_MS ? "remind" : "none";
}
