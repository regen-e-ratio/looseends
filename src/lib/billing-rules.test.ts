import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  accessLevel,
  billingFields,
  paddleSubscriptionSchema,
  shouldApply,
  userIdFromCustomData,
  verifyPaddleSignature,
  type BillingFields,
} from "./billing-rules";

// --- access levels
assert.equal(accessLevel({ billingStatus: "none" }), "none");
for (const s of ["active", "trialing", "past_due"] as const) assert.equal(accessLevel({ billingStatus: s }), "member", s);
for (const s of ["paused", "canceled"] as const) assert.equal(accessLevel({ billingStatus: s }), "frozen", s);

// --- signatures
const secret = "pdl_ntfset_test_secret";
const body = '{"event_type":"subscription.created","data":{}}';
const now = 1_790_000_000_000;
const ts = Math.floor(now / 1000);
const sign = (t: number, b = body, s = secret) => createHmac("sha256", s).update(`${t}:${b}`).digest("hex");
assert.ok(verifyPaddleSignature(body, `ts=${ts};h1=${sign(ts)}`, secret, now), "valid signature");
assert.ok(verifyPaddleSignature(body, `ts=${ts};h1=${"0".repeat(64)};h1=${sign(ts)}`, secret, now), "any h1 during rotation");
assert.ok(!verifyPaddleSignature(body + " ", `ts=${ts};h1=${sign(ts)}`, secret, now), "body changed");
assert.ok(!verifyPaddleSignature(body, `ts=${ts};h1=${sign(ts, body, "other")}`, secret, now), "wrong secret");
assert.ok(!verifyPaddleSignature(body, `ts=${ts - 600};h1=${sign(ts - 600)}`, secret, now), "too old");
assert.ok(!verifyPaddleSignature(body, `ts=${ts + 600};h1=${sign(ts + 600)}`, secret, now), "from the future");
assert.ok(!verifyPaddleSignature(body, `h1=${sign(ts)}`, secret, now), "no timestamp");
assert.ok(!verifyPaddleSignature(body, `ts=${ts}`, secret, now), "no hash");
assert.ok(!verifyPaddleSignature(body, `ts=${ts};h1=zz`, secret, now), "not hex");
assert.ok(!verifyPaddleSignature(body, "", secret, now), "empty header");

// --- custom data
const uid = "7d3b1a52-0c1e-4f7a-9b8e-2f6c5d4a3b21";
assert.equal(userIdFromCustomData({ userId: uid }), uid);
assert.equal(userIdFromCustomData({ userId: "1 OR 1=1" }), null);
assert.equal(userIdFromCustomData(null), null);

// --- subscription parsing
const sub = paddleSubscriptionSchema.parse({
  id: "sub_01abc",
  status: "active",
  customer_id: "ctm_01xyz",
  updated_at: "2026-11-04T10:00:00.123456Z",
  current_billing_period: { starts_at: "2026-11-04T10:00:00Z", ends_at: "2027-11-04T10:00:00Z" },
  scheduled_change: { action: "cancel", effective_at: "2027-11-04T10:00:00Z", resume_at: null },
  custom_data: { userId: uid },
  items: [{ price: { id: "pri_01" } }],
});
const f = billingFields(sub);
assert.equal(f.billingStatus, "active");
assert.equal(f.billingCancelsAt?.toISOString(), "2027-11-04T10:00:00.000Z");
assert.equal(f.billingPeriodEndsAt?.toISOString(), "2027-11-04T10:00:00.000Z");
assert.equal(billingFields({ ...sub, scheduled_change: { action: "pause", effective_at: new Date() } }).billingCancelsAt, null);

// --- ordering
const at = (iso: string) => new Date(iso);
const state = (p: Partial<BillingFields>): BillingFields => ({
  billingStatus: "none",
  billingCustomerId: null,
  billingSubscriptionId: null,
  billingPeriodEndsAt: null,
  billingCancelsAt: null,
  billingUpdatedAt: null,
  ...p,
});
const A = (status: BillingFields["billingStatus"], iso: string) => state({ billingStatus: status, billingSubscriptionId: "sub_a", billingUpdatedAt: at(iso) });
const B = (status: BillingFields["billingStatus"], iso: string) => state({ billingStatus: status, billingSubscriptionId: "sub_b", billingUpdatedAt: at(iso) });
const cases: [string, BillingFields, BillingFields, boolean][] = [
  ["first subscription", state({}), A("active", "2026-01-01"), true],
  ["newer state of the same subscription", A("active", "2026-01-01"), A("canceled", "2026-02-01"), true],
  ["late (older) webhook is ignored", A("canceled", "2026-02-01"), A("active", "2026-01-01"), false],
  ["same event twice is harmless", A("active", "2026-01-01"), A("active", "2026-01-01"), true],
  ["renewing after it ended: new subscription", A("canceled", "2026-02-01"), B("active", "2026-03-01"), true],
  ["old subscription ending never removes access", B("active", "2026-03-01"), A("canceled", "2026-04-01"), false],
  ["two active subscriptions: newest wins", A("active", "2026-03-01"), B("active", "2026-03-02"), true],
  ["two active subscriptions: older ignored", B("active", "2026-03-02"), A("active", "2026-03-01"), false],
];
for (const [name, stored, incoming, expected] of cases) assert.equal(shouldApply(stored, incoming), expected, name);

console.log("billing-rules: all tests passed");
