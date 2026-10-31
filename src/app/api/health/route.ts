import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appUrl } from "@/lib/config";
import { emailProvider } from "@/lib/email";

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
  };
  const ok = database && migrated && checks.encryptionKey && checks.cronSecret && checks.emailProvider !== "console";
  return Response.json({ ok, ...checks }, { status: ok ? 200 : 503 });
}
