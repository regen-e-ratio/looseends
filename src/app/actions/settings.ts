"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { endSession, requireUser } from "@/lib/auth";
import { checkIn, resetAfterRelease, sendReminder } from "@/lib/switch";
import { GRACE_OPTIONS, INTERVAL_OPTIONS } from "@/lib/config";
import type { FormState } from "./vault";

const { users, recipients } = schema;


export async function saveNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = z.string().trim().min(1).max(120).safeParse(formData.get("name"));
  if (!name.success) return { fieldErrors: { name: ["Please enter your name."] } };
  await db.update(users).set({ name: name.data }).where(eq(users.id, user.id));
  const next = String(formData.get("next") ?? "");
  // Only internal app paths are allowed as a redirect target.
  if (/^\/(dashboard|items\/new\?kind=[a-z]+)$/.test(next)) redirect(next);
  revalidatePath("/settings");
  return {};
}

export async function saveSwitchAction(_prev: FormState, formData: FormData): Promise<FormState & { ok?: boolean }> {
  const user = await requireUser();
  const enabled = formData.get("enabled") === "on";
  const interval = Number(formData.get("interval"));
  const grace = Number(formData.get("grace"));
  if (!INTERVAL_OPTIONS.includes(interval as never) || !GRACE_OPTIONS.includes(grace as never)) {
    return { error: "Please choose valid options." };
  }
  if (enabled) {
    const count = (await db.select({ id: recipients.id }).from(recipients).where(eq(recipients.userId, user.id))).length;
    if (count === 0) return { error: "Add at least one trusted contact before turning the switch on." };
  }
  await db.update(users).set({ switchEnabled: enabled, checkInIntervalDays: interval, gracePeriodDays: grace }).where(eq(users.id, user.id));
  // Changing settings counts as a check-in, so the new schedule starts today.
  if (user.switchStatus !== "triggered") await checkIn(user.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function sendTestReminderAction(): Promise<FormState & { ok?: boolean }> {
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
  if (user.switchStatus !== "triggered") await checkIn(user.id);
  revalidatePath("/", "layout");
  redirect("/dashboard?checkedIn=1");
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
