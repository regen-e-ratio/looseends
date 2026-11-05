"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canTurnOnSwitch, endSession, requireUser } from "@/lib/auth";
import {
  confirmAlive,
  isClaimPending,
  resetAfterRelease,
  restartSchedule,
  revokeClaimLinks,
  sendMissingClaimInvites,
  sendReminder,
} from "@/lib/switch";
import { GRACE_OPTIONS, INTERVAL_OPTIONS } from "@/lib/config";
import type { FormState } from "./vault";
import { assertUserEmailAllowed, RateLimited } from "@/lib/rate-limit";
import { oneLineName } from "@/lib/validation";
import { cancelSubscriptionNow } from "@/lib/billing";

const { users, recipients } = schema;


export async function saveNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = oneLineName().safeParse(formData.get("name") ?? "");
  if (!name.success) return { fieldErrors: { name: ["Please enter your name."] } };
  await db.update(users).set({ name: name.data }).where(eq(users.id, user.id));
  revalidatePath("/settings");
  return {};
}

export type SwitchFormState = FormState & { ok?: boolean; message?: string };

export async function saveSwitchAction(_prev: SwitchFormState, formData: FormData): Promise<SwitchFormState> {
  const user = await requireUser();
  const enabled = formData.get("enabled") === "on";
  const mode = formData.get("mode") === "claim" ? "claim" : "checkin";
  const interval = Number(formData.get("interval"));
  const grace = Number(formData.get("grace"));
  if (!INTERVAL_OPTIONS.includes(interval as never) || !GRACE_OPTIONS.includes(grace as never)) {
    return { error: "Please choose valid options." };
  }
  if (enabled) {
    const count = (await db.select({ id: recipients.id }).from(recipients).where(eq(recipients.userId, user.id))).length;
    if (count === 0) return { error: "Add at least one trusted contact before turning the switch on." };
  }
  // Turning it on needs a subscription: keep the choices, then subscribe (paying turns it on).
  if (enabled && !user.switchEnabled && !canTurnOnSwitch(user)) {
    await db.update(users).set({ switchMode: mode, checkInIntervalDays: interval, gracePeriodDays: grace }).where(eq(users.id, user.id));
    redirect("/subscribe");
  }
  // Leaving claim mode or switching off is the owner's answer to a pending claim: reject it (the contact is told).
  if (isClaimPending(user) && (mode !== "claim" || !enabled)) await confirmAlive(user.id);

  const [saved] = await db
    .update(users)
    .set({ switchEnabled: enabled, switchMode: mode, checkInIntervalDays: interval, gracePeriodDays: grace })
    .where(eq(users.id, user.id))
    .returning();
  // A new schedule starts today (a pending claim keeps running).
  await restartSchedule(saved);

  let message = mode === "claim" ? "Saved." : "Saved. Your timer starts from today.";
  if (mode === "checkin") {
    await revokeClaimLinks(user.id);
  } else if (enabled) {
    const { sent, failed } = await sendMissingClaimInvites(saved);
    if (sent) message = `Saved. We emailed ${sent} contact${sent === 1 ? "" : "s"} their personal link to request access.`;
    if (failed) message += ` ${failed} email${failed === 1 ? "" : "s"} could not be sent — use “Resend link” on the Trusted contacts page.`;
  }
  revalidatePath("/", "layout");
  return { ok: true, message };
}

export async function sendTestReminderAction(): Promise<SwitchFormState> {
  const user = await requireUser();
  try {
    await assertUserEmailAllowed(user.id);
    await sendReminder(user, { test: true });
  } catch (err) {
    if (err instanceof RateLimited) return { error: err.message };
    console.error(err);
    return { error: "Sending failed. Check your email provider settings." };
  }
  return { ok: true };
}

export async function checkInAction() {
  const user = await requireUser();
  const result = await confirmAlive(user.id);
  revalidatePath("/", "layout");
  redirect(result === "rejected" ? "/dashboard?rejected=1" : "/dashboard?checkedIn=1");
}

export async function resetAfterReleaseAction() {
  const user = await requireUser();
  await resetAfterRelease(user.id);
  revalidatePath("/", "layout");
  redirect("/dashboard?checkedIn=1");
}

export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") return { error: 'Type DELETE to confirm.' };
  // Stop billing first: an account that no longer exists must never be charged again.
  if (user.billingSubscriptionId && user.billingStatus !== "canceled") {
    try {
      await cancelSubscriptionNow(user.billingSubscriptionId);
    } catch (err) {
      console.error("cancel on delete", err);
      return { error: "We couldn't cancel your subscription just now, so nothing was deleted. Please try again in a few minutes." };
    }
  }
  await db.delete(users).where(eq(users.id, user.id));
  await db.delete(schema.loginTokens).where(eq(schema.loginTokens.email, user.email));
  await endSession();
  redirect("/?deleted=1");
}
