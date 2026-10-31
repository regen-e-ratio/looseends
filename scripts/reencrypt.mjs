// One-time data migration: re-encrypts values written with the old "afterword" key (format "v1.")
// into the current "looseends" key (format "v2."). Runs during `npm run build` (via migrate.mjs) and is
// idempotent — once no "v1." values remain it does nothing. Safe to delete after it has run in production.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const COLUMNS = [
  ["items", "payload"],
  ["recipients", "personal_message"],
  ["users", "check_in_token"],
];

export async function reencryptLegacy(sql) {
  const secret = process.env.ENCRYPTION_KEY;
  const derive = (label) => createHash("sha256").update(`${label}${secret}`).digest();

  let pending = 0;
  for (const [table, col] of COLUMNS) {
    const [{ n }] = await sql`select count(*)::int as n from ${sql(table)} where ${sql(col)} like 'v1.%'`;
    pending += n;
  }
  if (pending === 0) return;
  if (!secret || secret.length < 32) throw new Error(`${pending} legacy encrypted values found but ENCRYPTION_KEY is not set`);

  const oldKey = derive("afterword:v1:");
  const newKey = derive("looseends:v2:");
  const decrypt = (value) => {
    const [, iv, tag, ct] = value.split(".");
    const d = createDecipheriv("aes-256-gcm", oldKey, Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  };
  const encrypt = (plain) => {
    const iv = randomBytes(12);
    const c = createCipheriv("aes-256-gcm", newKey, iv);
    const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
    return ["v2", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
  };

  await sql.begin(async (tx) => {
    for (const [table, col] of COLUMNS) {
      const rows = await tx`select id, ${tx(col)} as v from ${tx(table)} where ${tx(col)} like 'v1.%'`;
      for (const r of rows) {
        await tx`update ${tx(table)} set ${tx(col)} = ${encrypt(decrypt(r.v))} where id = ${r.id}`;
      }
    }
  });
  console.log(`✔ Re-encrypted ${pending} legacy values with the new key`);
}
