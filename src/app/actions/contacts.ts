"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { normalizeEmail, requireUser } from "@/lib/auth";
import { encryptNullable } from "@/lib/crypto";
import { contactAddedEmail, sendEmail } from "@/lib/email";
import type { FormState } from "./vault";

const { recipients } = schema;
const MAX_CONTACTS = 25;

const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name").max(120),
  email: z.preprocess((v) => normalizeEmail(String(v ?? "")), z.email("Please enter a valid email")),
  relationship: z.string().trim().max(120).optional().default(""),
  personalMessage: z.string().trim().max(20_000).optional().default(""),
});

export async function saveContactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    relationship: formData.get("relationship") ?? "",
    personalMessage: formData.get("personalMessage") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, email, relationship, personalMessage } = parsed.data;
  if (email === user.email) return { fieldErrors: { email: ["This is your own email — add someone you trust instead."] } };

  const values = { name, email, relationship: relationship || null, personalMessage: encryptNullable(personalMessage) };

  if (id) {
    const updated = await db
      .update(recipients)
      .set(values)
      .where(and(eq(recipients.id, id), eq(recipients.userId, user.id)))
      .returning({ id: recipients.id });
    if (updated.length === 0) return { error: "Contact not found." };
    redirect("/contacts?saved=1");
  }

  const existing = await db.select({ email: recipients.email }).from(recipients).where(eq(recipients.userId, user.id));
  if (existing.length >= MAX_CONTACTS) return { error: `You can add up to ${MAX_CONTACTS} contacts.` };
  if (existing.some((r) => r.email === email)) return { fieldErrors: { email: ["You already added this person."] } };

  const [row] = await db.insert(recipients).values({ ...values, userId: user.id }).returning({ id: recipients.id });

  let notifyFailed = false;
  if (formData.get("notify") === "on") {
    try {
      await sendEmail(contactAddedEmail({ to: email, recipientName: name, ownerName: user.name || user.email, ownerEmail: user.email }));
      await db.update(recipients).set({ notifiedAt: new Date() }).where(eq(recipients.id, row.id));
    } catch (err) {
      console.error("contact notification failed", err);
      notifyFailed = true;
    }
  }
  redirect(`/contacts?saved=1${notifyFailed ? "&notifyFailed=1" : ""}`);
}

export async function deleteContactAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.delete(recipients).where(and(eq(recipients.id, id), eq(recipients.userId, user.id)));
  redirect("/contacts");
}
