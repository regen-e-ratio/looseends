import "server-only";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashToken } from "./crypto";

const { rateLimits } = schema;

/**
 * Counts one hit for `key` in the current fixed window and says whether it is still within `limit`.
 * One atomic upsert, so it works across serverless instances without extra infrastructure.
 */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  return row.count <= limit;
}

/**
 * The client's IP as set by Vercel's edge (which overwrites client-sent values), hashed with a server
 * secret so raw IPs are never stored. Null when there is no IP header (local development).
 */
export async function clientKey(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? hashToken(`ip:${process.env.ENCRYPTION_KEY ?? ""}:${ip}`).slice(0, 32) : null;
}

/** Limits for email the app sends on a user's behalf (protects people from spam and our sending quota). */
export const LIMITS = {
  loginPerEmail: { limit: 5, window: 15 * 60 },
  loginPerIp: { limit: 20, window: 60 * 60 },
  /** Circuit breaker for the whole site, e.g. against scripted sign-up floods. */
  loginGlobal: { limit: 300, window: 60 * 60 },
  /** Contact notifications, claim links, resends and test reminders a single user can trigger. */
  userEmailsPerDay: { limit: 60, window: 24 * 60 * 60 },
  /** How often one trusted contact can open a claim. */
  claimsPerContactPerDay: { limit: 3, window: 24 * 60 * 60 },
} as const;

export class RateLimited extends Error {}

/** Throws RateLimited when a user has triggered too many emails today. */
export async function assertUserEmailAllowed(userId: string): Promise<void> {
  const { limit, window } = LIMITS.userEmailsPerDay;
  if (!(await allow(`mail:user:${userId}`, limit, window))) {
    throw new RateLimited("You've sent a lot of emails today. Please try again tomorrow.");
  }
}
