"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { consumeLoginToken, createLoginToken, endSession, normalizeEmail, startSession, startPage } from "@/lib/auth";
import { appUrl } from "@/lib/config";
import { loginEmail, sendEmail } from "@/lib/email";
import { recordActivity } from "@/lib/switch";
import { isLandingSlug } from "@/marketing";
import { LIMITS, allow, clientKey } from "@/lib/rate-limit";

export type LoginState = { error?: string; sentTo?: string };

export async function requestLoginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.email().safeParse(normalizeEmail(String(formData.get("email") ?? "")));
  if (!parsed.success) return { error: "Please enter a valid email address." };
  const email = parsed.data;

  // Every request sends a real email: limit per client and site-wide, not only per address
  // (otherwise anyone could script sign-ups to many addresses and exhaust our sending quota).
  const ip = await clientKey();
  const busy = "Too many sign-in requests right now. Please wait a little and try again.";
  if (ip && !(await allow(`login:ip:${ip}`, LIMITS.loginPerIp.limit, LIMITS.loginPerIp.window))) return { error: busy };
  if (!(await allow("login:global", LIMITS.loginGlobal.limit, LIMITS.loginGlobal.window))) return { error: busy };

  const token = await createLoginToken(email, attributionFrom(formData));
  if (!token) return { error: "Too many sign-in emails were requested. Please wait 15 minutes and try again." };

  try {
    await sendEmail(loginEmail(email, `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`));
  } catch (err) {
    console.error("login email failed", err);
    return { error: "We couldn't send the email right now. Please try again in a moment." };
  }
  return { sentTo: email };
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/** Landing page + ad parameters forwarded by the login form; validated so only known values are stored. */
function attributionFrom(formData: FormData) {
  const from = formData.get("from");
  const campaign = new URLSearchParams();
  for (const key of UTM_KEYS) {
    const v = String(formData.get(key) ?? "").trim();
    if (v) campaign.set(key, v.slice(0, 100));
  }
  return { signupSource: isLandingSlug(from) ? from : null, signupCampaign: campaign.toString() || null };
}

export async function verifyLoginAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const login = token ? await consumeLoginToken(token) : null;
  if (!login) redirect("/auth/verify?error=expired");
  const { email, signupSource, signupCampaign } = login;

  // Attribution is only recorded when the account is created, never overwritten on later sign-ins.
  await db.insert(schema.users).values({ email, signupSource, signupCampaign }).onConflictDoNothing({ target: schema.users.email });
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (!user) throw new Error("user upsert failed");

  // Signing in proves you're alive (check-in mode). It never cancels a pending claim or a release.
  await recordActivity(user);
  await startSession(user.id);
  redirect(startPage(user));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}
