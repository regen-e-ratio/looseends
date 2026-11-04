import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appUrl } from "@/lib/config";
import { emailProvider } from "@/lib/email";
import { checkoutSettings, webhookSecret } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Configuration self-check. Reports only booleans — never secret values. */
export async function GET() {
  let database = false;
  let migrated = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
    const r = await db.execute(sql`select to_regclass('public.users') is not null as ok`);
    migrated = Boolean((r as unknown as { ok: boolean }[])[0]?.ok);
  } catch {}
  const checks = {
    database,
    migrated,
    encryptionKey: (process.env.ENCRYPTION_KEY?.length ?? 0) >= 32,
    cronSecret: Boolean(process.env.CRON_SECRET),
    emailProvider: emailProvider(),
    emailFrom: Boolean(process.env.EMAIL_FROM),
    appUrl: appUrl(),
    /** "sandbox" (test payments), "production", or "off" until the Paddle variables are set. */
    payments: checkoutSettings()?.environment ?? "off",
    paddleWebhookSecret: Boolean(webhookSecret()),
    legalName: Boolean(process.env.LEGAL_NAME),
  };
  const ok = database && migrated && checks.encryptionKey && checks.cronSecret && checks.emailProvider !== "console";
  return Response.json({ ok, ...checks }, { status: ok ? 200 : 503 });
}
