"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { endSession, requireUser } from "@/lib/auth";
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

const { users, recipients } = schema;


export async function saveNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = z.string().trim().min(1).max(120).safeParse(formData.get("name"));
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
    await sendReminder(user, { test: true });
  } catch (err) {
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
  await db.delete(users).where(eq(users.id, user.id));
  await endSession();
  redirect("/?deleted=1");
}
