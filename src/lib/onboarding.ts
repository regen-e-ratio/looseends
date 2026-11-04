import type { ItemKind } from "./items";

/** One-tap suggestions in onboarding phase 1. `amount` is only a placeholder hint, never saved by itself. */
export type QuickAdd = { title: string; kind: Extract<ItemKind, "subscription" | "investment" | "crypto" | "bank">; hint: string };

const SUBSCRIPTIONS: QuickAdd[] = [
  { title: "Netflix", kind: "subscription", hint: "€15.99 / month" },
  { title: "Spotify", kind: "subscription", hint: "€11.99 / month" },
  { title: "Amazon Prime", kind: "subscription", hint: "€8.99 / month" },
  { title: "Disney+", kind: "subscription", hint: "€9.99 / month" },
  { title: "iCloud storage", kind: "subscription", hint: "€2.99 / month" },
  { title: "Gym membership", kind: "subscription", hint: "€35 / month" },
  { title: "Mobile phone plan", kind: "subscription", hint: "€20 / month" },
  { title: "Newspaper", kind: "subscription", hint: "€12 / month" },
];

/** Extra suggestions for people who arrived from an audience's ad (users.signupSource). */
const BY_AUDIENCE: Record<string, QuickAdd[]> = {
  investors: [
    { title: "Brokerage account", kind: "investment", hint: "≈ €20,000" },
    { title: "Workplace pension", kind: "investment", hint: "≈ €30,000" },
    { title: "Savings account", kind: "bank", hint: "≈ €8,000" },
  ],
  crypto: [
    { title: "Hardware wallet", kind: "crypto", hint: "≈ $25,000" },
    { title: "Exchange account", kind: "crypto", hint: "≈ $3,000" },
  ],
};

export function quickAddSuggestions(signupSource: string | null): QuickAdd[] {
  return [...(signupSource ? BY_AUDIENCE[signupSource] ?? [] : []), ...SUBSCRIPTIONS];
}

export const ONBOARDING_KINDS = ["subscription", "investment", "crypto", "bank"] as const;
