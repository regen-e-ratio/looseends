/**
 * Subscription rules. Pure functions (no database, no network), unit-tested in billing-rules.test.ts.
 * src/lib/billing.ts talks to Paddle and the database.
 *
 * Access levels:
 * - member: a paid (or trialing, or retrying a failed payment) subscription. Full use of the app.
 * - frozen: subscribed before, but the subscription ended. The vault and contacts are read-only, but the
 *   release switch keeps working: when someone dies their card stops working, and that must never stop
 *   their instructions from reaching their people.
 * - none:   never subscribed. Only the subscribe page.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { BillingStatus, User } from "@/db/schema";

export type Access = "member" | "frozen" | "none";

/** past_due: Paddle is still retrying the payment, so keep full access meanwhile. */
const MEMBER_STATUSES: readonly BillingStatus[] = ["active", "trialing", "past_due"];

export function accessLevel(u: Pick<User, "billingStatus">): Access {
  if (MEMBER_STATUSES.includes(u.billingStatus)) return "member";
  return u.billingStatus === "none" ? "none" : "frozen";
}

/** How far a webhook's signing time may be from ours. Late or replayed events are harmless (see shouldApply). */
const SIGNATURE_TOLERANCE_S = 300;

/**
 * Verifies Paddle's `Paddle-Signature: ts=<unix seconds>;h1=<hex hmac>` header: HMAC-SHA256 over
 * `${ts}:${rawBody}` with the notification destination's secret. Several h1 values may appear while a
 * secret is being rotated; any one matching is enough.
 */
export function verifyPaddleSignature(rawBody: string, header: string, secret: string, nowMs = Date.now()): boolean {
  let ts = "";
  const hashes: string[] = [];
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key === "ts") ts = value;
    else if (key === "h1" && value) hashes.push(value);
  }
  if (!/^\d+$/.test(ts) || hashes.length === 0) return false;
  if (Math.abs(nowMs / 1000 - Number(ts)) > SIGNATURE_TOLERANCE_S) return false;
  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest();
  return hashes.some((h) => {
    if (!/^[0-9a-f]+$/i.test(h)) return false;
    const given = Buffer.from(h, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

const timestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "invalid timestamp")
  .transform((s) => new Date(s));

/** The parts of Paddle's subscription entity we use (webhook `data` and GET /subscriptions/{id}). */
export const paddleSubscriptionSchema = z.object({
  id: z.string().regex(/^sub_[a-z0-9]+$/),
  status: z.enum(["active", "trialing", "past_due", "paused", "canceled"]),
  customer_id: z.string().min(1),
  updated_at: timestamp,
  current_billing_period: z.object({ starts_at: timestamp, ends_at: timestamp }).nullish(),
  scheduled_change: z.object({ action: z.string(), effective_at: timestamp }).nullish(),
  custom_data: z.record(z.string(), z.unknown()).nullish(),
});
export type PaddleSubscription = z.infer<typeof paddleSubscriptionSchema>;

/** The parts of Paddle's transaction entity we use. */
export const paddleTransactionSchema = z.object({
  id: z.string(),
  status: z.string(),
  customer_id: z.string().nullish(),
  subscription_id: z.string().regex(/^sub_[a-z0-9]+$/).nullish(),
  custom_data: z.record(z.string(), z.unknown()).nullish(),
});
export type PaddleTransaction = z.infer<typeof paddleTransactionSchema>;

/** Our user id, as the checkout put it in custom_data. Null when absent or malformed. */
export function userIdFromCustomData(customData: Record<string, unknown> | null | undefined): string | null {
  const parsed = z.uuid().safeParse(customData?.userId);
  return parsed.success ? parsed.data : null;
}

export type BillingFields = Pick<
  User,
  "billingStatus" | "billingCustomerId" | "billingSubscriptionId" | "billingPeriodEndsAt" | "billingCancelsAt" | "billingUpdatedAt"
>;

export function billingFields(sub: PaddleSubscription): BillingFields {
  return {
    billingStatus: sub.status,
    billingCustomerId: sub.customer_id,
    billingSubscriptionId: sub.id,
    billingPeriodEndsAt: sub.current_billing_period?.ends_at ?? null,
    billingCancelsAt: sub.scheduled_change?.action === "cancel" ? sub.scheduled_change.effective_at : null,
    billingUpdatedAt: sub.updated_at,
  };
}

/**
 * Whether incoming subscription data should replace what is stored. Paddle may deliver webhooks late or out
 * of order, and a user can end up with two subscriptions (e.g. renewing after one ended):
 * - same subscription: only newer data wins;
 * - another subscription: one that ended never takes away access a current subscription gives.
 */
export function shouldApply(stored: BillingFields, incoming: BillingFields): boolean {
  const newer = !stored.billingUpdatedAt || incoming.billingUpdatedAt!.getTime() >= stored.billingUpdatedAt.getTime();
  if (!stored.billingSubscriptionId || stored.billingSubscriptionId === incoming.billingSubscriptionId) return newer;
  const storedMember = accessLevel(stored) === "member";
  const incomingMember = accessLevel(incoming) === "member";
  if (storedMember && !incomingMember) return false;
  if (storedMember && incomingMember) return newer;
  return true;
}
