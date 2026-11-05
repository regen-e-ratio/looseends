export const APP_NAME = process.env.APP_NAME || "Loose Ends";

/** Absolute base URL used in emails. */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SESSION_DAYS = 30;
export const LOGIN_TOKEN_MINUTES = 20;
/** During the grace period, re-send the reminder every 1–3 days so there are always several reminders. */
export function reminderEveryDays(gracePeriodDays: number): number {
  return Math.min(3, Math.max(1, Math.floor(gracePeriodDays / 3)));
}

export const INTERVAL_OPTIONS = [7, 14, 30, 60, 90, 180] as const;
export const GRACE_OPTIONS = [3, 7, 14, 30] as const;

/**
 * The one plan, as the website describes it. Writing a vault and adding contacts are free; the plan turns the release
 * switch on. Prices are charged by Paddle (see SETUP.md): keep these in sync
 * with the price in Paddle. EU prices include VAT; US sales tax is added at checkout.
 */
export const PLAN = {
  eur: "€39",
  usd: "$39",
  period: "year",
  includes: [
    "Your release switch: check-in reminders, or let your contacts claim",
    "Your vault delivered to the right people, each seeing only what you chose",
    "Unlimited accounts, subscriptions, wallets, messages and contacts",
    "Encrypted, private, never sold or shared",
  ],
  refundDays: 14,
} as const;

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@looseends.life";

/** Who runs Loose Ends, as shown on the legal pages (set LEGAL_NAME and LEGAL_ADDRESS in Vercel). */
export const OPERATOR = {
  name: process.env.LEGAL_NAME || "",
  address: process.env.LEGAL_ADDRESS || "",
};
