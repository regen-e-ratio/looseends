import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set to a random string of at least 32 characters");
  }
  // Derive a fixed 256-bit key from whatever string the operator provided.
  cachedKey = createHash("sha256").update(`afterword:v1:${secret}`).digest();
  return cachedKey;
}

/** AES-256-GCM. Output format: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(value: string): string {
  const [version, iv, tag, ct] = value.split(".");
  if (version !== "v1" || !iv || !tag || ct === undefined) throw new Error("Unrecognised ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

export function encryptNullable(v: string | null | undefined): string | null {
  return v ? encrypt(v) : null;
}
export function decryptNullable(v: string | null | undefined): string | null {
  return v ? decrypt(v) : null;
}

/** Random URL-safe token and its sha256 hash (only the hash is stored). */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
