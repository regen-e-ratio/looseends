import type { ItemKind } from "./items";

/**
 * How the people you leave behind can find an account. Saved as the item's `reference` field.
 * - email:    the login email (pre-filled with the user's own address, which most services use)
 * - digits:   the last digits of an account number
 * - location: where a device or backup is physically kept
 */
export type IdentifyBy = "email" | "digits" | "location";

export const IDENTIFY: Record<IdentifyBy, { label: string; placeholder: string }> = {
  email: { label: "Account email", placeholder: "Email used for this account" },
  digits: { label: "Last digits of the account", placeholder: "e.g. •••• 1234" },
  location: { label: "Where it's kept", placeholder: "e.g. home safe, top shelf" },
};

/** One-tap suggestions in onboarding phase 1. */
export type QuickAdd = { title: string; kind: Extract<ItemKind, "subscription" | "investment" | "crypto" | "bank">; identify: IdentifyBy };

const SUBSCRIPTIONS: QuickAdd[] = [
  "Netflix",
  "Spotify",
  "Amazon Prime",
  "Disney+",
  "iCloud storage",
  "Gym membership",
  "Mobile phone plan",
  "Newspaper",
].map((title) => ({ title, kind: "subscription", identify: "email" }));

/** Extra suggestions for people who arrived from an audience's ad (users.signupSource). */
const BY_AUDIENCE: Record<string, QuickAdd[]> = {
  investors: [
    { title: "Brokerage account", kind: "investment", identify: "email" },
    { title: "Workplace pension", kind: "investment", identify: "email" },
    { title: "Savings account", kind: "bank", identify: "digits" },
  ],
  crypto: [
    { title: "Hardware wallet", kind: "crypto", identify: "location" },
    { title: "Exchange account", kind: "crypto", identify: "email" },
  ],
};

export function quickAddSuggestions(signupSource: string | null): QuickAdd[] {
  return [...(signupSource ? BY_AUDIENCE[signupSource] ?? [] : []), ...SUBSCRIPTIONS];
}

export const ONBOARDING_KINDS = ["subscription", "investment", "crypto", "bank"] as const;
