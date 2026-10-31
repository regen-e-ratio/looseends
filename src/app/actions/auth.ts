"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { consumeLoginToken, createLoginToken, endSession, normalizeEmail, startSession } from "@/lib/auth";
import { appUrl } from "@/lib/config";
import { loginEmail, sendEmail } from "@/lib/email";
import { checkIn } from "@/lib/switch";

export type LoginState = { error?: string; sentTo?: string };

export async function requestLoginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.email().safeParse(normalizeEmail(String(formData.get("email") ?? "")));
  if (!parsed.success) return { error: "Please enter a valid email address." };
  const email = parsed.data;

  const token = await createLoginToken(email);
  if (!token) return { error: "Too many sign-in emails were requested. Please wait 15 minutes and try again." };

  try {
    await sendEmail(loginEmail(email, `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`));
  } catch (err) {
    console.error("login email failed", err);
    return { error: "We couldn't send the email right now. Please try again in a moment." };
  }
  return { sentTo: email };
}

export async function verifyLoginAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const email = token ? await consumeLoginToken(token) : null;
  if (!email) redirect("/auth/verify?error=expired");

  await db.insert(schema.users).values({ email }).onConflictDoNothing({ target: schema.users.email });
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) throw new Error("user upsert failed");

  // Signing in proves you're alive (unless the vault was already released — that needs an explicit reset).
  if (user.switchStatus !== "triggered") await checkIn(user.id);
  await startSession(user.id);
  redirect(user.name ? "/dashboard" : "/welcome");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}
