import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import {
  billingFields,
  paddleSubscriptionSchema,
  paddleTransactionSchema,
  shouldApply,
  userIdFromCustomData,
  type BillingFields,
  type PaddleSubscription,
} from "./billing-rules";

import { accessLevel } from "./billing-rules";
import { activateSwitch } from "./switch";

export { accessLevel, type Access } from "./billing-rules";

const { users } = schema;

/**
 * Paddle settings (Vercel → Settings → Environment Variables; see SETUP.md). The client-side token says which
 * Paddle environment we are in: test_… = sandbox (test cards, no real money), live_… = production.
 */
function paddleEnv() {
  const clientToken = process.env.PADDLE_CLIENT_TOKEN ?? "";
  const sandbox = clientToken.startsWith("test_");
  return {
    clientToken,
    priceId: process.env.PADDLE_PRICE_ID ?? "",
    apiKey: process.env.PADDLE_API_KEY ?? "",
    webhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? "",
    environment: sandbox ? ("sandbox" as const) : ("production" as const),
    apiBase: sandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com",
  };
}

/** What the subscribe page needs to open Paddle's checkout, or null while payments aren't set up. */
export function checkoutSettings(): { token: string; priceId: string; environment: "sandbox" | "production" } | null {
  const env = paddleEnv();
  if (!env.clientToken || !env.priceId || !env.apiKey) return null;
  return { token: env.clientToken, priceId: env.priceId, environment: env.environment };
}

export function webhookSecret(): string {
  return paddleEnv().webhookSecret;
}

export class PaddleError extends Error {}

async function paddleApi(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
  const env = paddleEnv();
  if (!env.apiKey) throw new PaddleError("PADDLE_API_KEY is not set");
  const res = await fetch(`${env.apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.apiKey}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => null)) as { data?: unknown; error?: { code?: string; detail?: string } } | null;
  if (!res.ok) throw new PaddleError(`Paddle ${method} ${path} failed (${res.status}): ${json?.error?.code ?? ""} ${json?.error?.detail ?? ""}`);
  return json?.data;
}

export async function fetchSubscription(id: string): Promise<PaddleSubscription> {
  return paddleSubscriptionSchema.parse(await paddleApi("GET", `/subscriptions/${encodeURIComponent(id)}`));
}

async function fetchTransaction(id: string) {
  return paddleTransactionSchema.parse(await paddleApi("GET", `/transactions/${encodeURIComponent(id)}`));
}

/** Ends a subscription now, with no further charges (used when an account is deleted). */
export async function cancelSubscriptionNow(id: string): Promise<void> {
  try {
    await paddleApi("POST", `/subscriptions/${encodeURIComponent(id)}/cancel`, { effective_from: "immediately" });
  } catch (err) {
    // Already cancelled (our copy can lag behind a webhook) counts as done.
    const current = await fetchSubscription(id).catch(() => null);
    if (current?.status !== "canceled") throw err;
  }
}

/** A short-lived link to Paddle's customer portal: invoices, payment method, cancel. */
export async function customerPortalUrl(customerId: string, subscriptionId: string | null): Promise<string> {
  const data = (await paddleApi("POST", `/customers/${encodeURIComponent(customerId)}/portal-sessions`, {
    subscription_ids: subscriptionId ? [subscriptionId] : [],
  })) as { urls?: { general?: { overview?: string } } };
  const url = data?.urls?.general?.overview;
  if (!url || !url.startsWith("https://")) throw new PaddleError("Paddle returned no portal URL");
  return url;
}

const storedFields = (u: User): BillingFields => ({
  billingStatus: u.billingStatus,
  billingCustomerId: u.billingCustomerId,
  billingSubscriptionId: u.billingSubscriptionId,
  billingPeriodEndsAt: u.billingPeriodEndsAt,
  billingCancelsAt: u.billingCancelsAt,
  billingUpdatedAt: u.billingUpdatedAt,
});

/**
 * Stores a subscription's state on the user, unless what is stored is newer (see shouldApply).
 * Compare-and-set on the stored version, so concurrent webhooks and checkout confirmations can't interleave.
 */
export async function applySubscription(userId: string, sub: PaddleSubscription): Promise<User | null> {
  const incoming = billingFields(sub);
  for (let attempt = 0; attempt < 3; attempt++) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return null;
    if (!shouldApply(storedFields(user), incoming)) return user;
    const wasMember = accessLevel(user) === "member";
    const [saved] = await db
      .update(users)
      .set(incoming)
      .where(
        and(
          eq(users.id, userId),
          user.billingUpdatedAt ? eq(users.billingUpdatedAt, user.billingUpdatedAt) : isNull(users.billingUpdatedAt),
          user.billingSubscriptionId ? eq(users.billingSubscriptionId, user.billingSubscriptionId) : isNull(users.billingSubscriptionId),
        ),
      )
      .returning();
    if (saved) {
      // Paying is how the release switch gets turned on: do it with the settings the user already chose.
      if (!wasMember && accessLevel(saved) === "member" && saved.onboardedAt && !saved.switchEnabled) await activateSwitch(userId);
      return saved;
    }
  }
  throw new Error("Subscription update kept conflicting");
}

/** Which of our users a subscription belongs to: the checkout's custom data, else the ids we stored. */
async function findSubscriptionOwner(sub: PaddleSubscription): Promise<string | null> {
  const fromCheckout = userIdFromCustomData(sub.custom_data);
  if (fromCheckout) return fromCheckout;
  const bySub = await db.query.users.findFirst({ columns: { id: true }, where: eq(users.billingSubscriptionId, sub.id) });
  if (bySub) return bySub.id;
  const byCustomer = await db.query.users.findFirst({ columns: { id: true }, where: eq(users.billingCustomerId, sub.customer_id) });
  return byCustomer?.id ?? null;
}

/**
 * After a checkout, links its subscription to the user who paid and stores its current state.
 * Returns "pending" while Paddle is still creating the subscription.
 */
export async function syncCheckout(userId: string, transactionId: string): Promise<"done" | "pending" | "not_yours"> {
  const txn = await fetchTransaction(transactionId);
  if (userIdFromCustomData(txn.custom_data) !== userId) return "not_yours";
  if (!txn.subscription_id) return "pending";
  await applySubscription(userId, await fetchSubscription(txn.subscription_id));
  return "done";
}

/** Handles one verified webhook event. Throws on temporary failures so Paddle retries. */
export async function handlePaddleEvent(event: { event_type?: unknown; data?: unknown }): Promise<void> {
  const type = typeof event.event_type === "string" ? event.event_type : "";
  if (type.startsWith("subscription.")) {
    const parsed = paddleSubscriptionSchema.safeParse(event.data);
    if (!parsed.success) {
      console.error("Paddle webhook: unexpected subscription payload", type, parsed.error.issues);
      return;
    }
    const userId = await findSubscriptionOwner(parsed.data);
    if (!userId || !(await applySubscription(userId, parsed.data))) {
      console.warn("Paddle webhook: no user for subscription", parsed.data.id);
    }
    return;
  }
  if (type === "transaction.completed" || type === "transaction.paid") {
    const parsed = paddleTransactionSchema.safeParse(event.data);
    if (!parsed.success || !parsed.data.subscription_id) return;
    const userId = userIdFromCustomData(parsed.data.custom_data);
    if (!userId) return;
    // The subscription's own events may have arrived first, without a way to find the user: fetch its state now.
    await applySubscription(userId, await fetchSubscription(parsed.data.subscription_id));
  }
}
