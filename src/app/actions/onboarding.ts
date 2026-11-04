"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { normalizeEmail, requireUser } from "@/lib/auth";
import { GRACE_OPTIONS, INTERVAL_OPTIONS } from "@/lib/config";
import { contactAddedEmail, sendEmail } from "@/lib/email";
import { ONBOARDING_KINDS } from "@/lib/onboarding";
import { restartSchedule, sendMissingClaimInvites } from "@/lib/switch";
import { encodePayload } from "@/lib/vault";
import { assertUserEmailAllowed } from "@/lib/rate-limit";
import { oneLineName } from "@/lib/validation";

const { users, items, recipients } = schema;

export type StepState = { ok?: boolean; error?: string; saved?: number };

const stepOneSchema = z.object({
  name: oneLineName("Please tell us your name."),
  messageTitle: z.string().trim().max(200).default(""),
  messageBody: z.string().trim().max(20_000).default(""),
  things: z
    .array(z.object({ title: z.string().trim().min(1).max(200), reference: z.string().trim().max(200).default(""), kind: z.enum(ONBOARDING_KINDS) }))
    .max(30)
    .default([]),
});

function parseJson(value: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(value ?? "[]"));
  } catch {
    return [];
  }
}

/** Phase 1: name, an optional message and quick-added subscriptions / accounts. */
export async function saveStepOneAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const user = await requireUser();
  const parsed = stepOneSchema.safeParse({
    name: formData.get("name") ?? "",
    messageTitle: formData.get("messageTitle") ?? "",
    messageBody: formData.get("messageBody") ?? "",
    things: parseJson(formData.get("things")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { name, messageTitle, messageBody, things } = parsed.data;

  const rows = [
    ...(messageBody ? [{ kind: "message", payload: { title: messageTitle || "To my family", notes: messageBody } }] : []),
    // `reference` is how the account can be found (login email, last digits or where it's kept).
    ...things.map((t) => ({ kind: t.kind, payload: { title: t.title, reference: t.reference } })),
  ].map((r, i) => ({
    userId: user.id,
    // Keep the order they were entered in (lists are sorted by creation time).
    createdAt: new Date(Date.now() + i),
    kind: r.kind,
    shareWithAll: true,
    payload: encodePayload({ reference: "", notes: "", ...r.payload }),
  }));

  await db.transaction(async (tx) => {
    await tx.update(users).set({ name }).where(eq(users.id, user.id));
    if (rows.length) await tx.insert(items).values(rows);
  });
  revalidatePath("/onboarding");
  return { ok: true, saved: rows.length };
}

const contactsSchema = z
  .array(
    z.object({
      name: oneLineName("Every person needs a name."),
      email: z.preprocess((v) => normalizeEmail(String(v ?? "")), z.email("Please check the email addresses.")),
    }),
  )
  .min(1, "Add at least one person, or skip this step for now.")
  .max(25);

/** Phase 2: trusted contacts. No emails yet — what they receive depends on the mode chosen in phase 3. */
export async function saveStepTwoAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const user = await requireUser();
  const parsed = contactsSchema.safeParse(parseJson(formData.get("contacts")));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const existing = await db.select({ email: recipients.email }).from(recipients).where(eq(recipients.userId, user.id));
  const seen = new Set([user.email, ...existing.map((r) => r.email)]);
  if (parsed.data.some((c) => c.email === user.email)) return { error: "Add someone you trust — not your own email address." };
  const fresh = parsed.data.filter((c) => !seen.has(c.email) && seen.add(c.email));
  if (existing.length + fresh.length > 25) return { error: "You can add up to 25 people." };

  if (fresh.length) {
    await db
      .insert(recipients)
      .values(
        fresh.map((c, i) => ({
          userId: user.id,
          name: c.name,
          email: c.email,
          createdAt: new Date(Date.now() + i), // keep the order they were entered in
        })),
      );
  }
  revalidatePath("/onboarding");
  return { ok: true, saved: fresh.length };
}

/** Phase 3: choose how a release is triggered, switch it on (when there are contacts) and finish. */
export async function finishOnboardingAction(_prev: StepState, formData: FormData): Promise<StepState> {
  const user = await requireUser();
  const mode = formData.get("mode") === "claim" ? "claim" : "checkin";
  const interval = Number(formData.get("interval"));
  const grace = Number(formData.get("grace"));
  if (!INTERVAL_OPTIONS.includes(interval as never) || !GRACE_OPTIONS.includes(grace as never)) {
    return { error: "Please choose valid options." };
  }
  const contacts = await db.select().from(recipients).where(eq(recipients.userId, user.id));

  const [saved] = await db
    .update(users)
    .set({
      switchMode: mode,
      switchEnabled: contacts.length > 0,
      checkInIntervalDays: interval,
      gracePeriodDays: grace,
      onboardedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();
  await restartSchedule(saved);

  if (saved.switchEnabled && mode === "claim") {
    await sendMissingClaimInvites(saved);
  } else if (mode === "checkin" && formData.get("notify") === "on") {
    const pending = await db
      .select()
      .from(recipients)
      .where(and(eq(recipients.userId, user.id), isNull(recipients.notifiedAt)));
    for (const r of pending) {
      try {
        await assertUserEmailAllowed(user.id);
        await sendEmail(contactAddedEmail({ to: r.email, recipientName: r.name, ownerName: saved.name || saved.email, ownerEmail: saved.email }));
        await db.update(recipients).set({ notifiedAt: new Date() }).where(eq(recipients.id, r.id));
      } catch (err) {
        console.error("contact notification failed", err);
      }
    }
  }
  redirect("/dashboard?welcome=1");
}

/** "Skip setup": never show onboarding again; the dashboard checklist takes over. */
export async function skipOnboardingAction() {
  const user = await requireUser();
  await db.update(users).set({ onboardedAt: new Date() }).where(eq(users.id, user.id));
  redirect("/dashboard");
}
