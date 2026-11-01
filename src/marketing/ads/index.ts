import { cryptoA } from "./crypto-a";
import { cryptoB } from "./crypto-b";
import { cryptoC } from "./crypto-c";
import { familyA } from "./family-a";
import { familyB } from "./family-b";
import { familyC } from "./family-c";
import { investorsA } from "./investors-a";
import { investorsB } from "./investors-b";
import { investorsC } from "./investors-c";
import type { Audience } from "./types";

/**
 * Ad audiences. Each is reachable at /for/<slug> (its default variant) and /for/<slug>/<variant>.
 * To add an audience or a design alternative: create a component file in this folder and list it here.
 */
export const AUDIENCES: Audience[] = [
  {
    slug: "family",
    name: "Family letters",
    audience: "Older adults (60+), and adult children helping a parent. Leads with the last letter; practical things second.",
    startHref: "/items/new?kind=message",
    defaultVariant: "a",
    variants: [familyA, familyB, familyC],
  },
  {
    slug: "investors",
    name: "Investors",
    audience: "Young professionals (25–40) investing through apps. Leads with scattered accounts nobody else knows about.",
    startHref: "/items/new?kind=investment",
    defaultVariant: "a",
    variants: [investorsA, investorsB, investorsC],
  },
  {
    slug: "crypto",
    name: "Crypto holders",
    audience: "Self-custody crypto holders. Security-literate and sceptical: leads with 'we never store your keys'.",
    startHref: "/items/new?kind=crypto",
    defaultVariant: "a",
    variants: [cryptoA, cryptoB, cryptoC],
  },
];

export function getAudience(slug: string): Audience | undefined {
  return AUDIENCES.find((a) => a.slug === slug);
}

export function getVariant(slug: string, variantId?: string) {
  const audience = getAudience(slug);
  if (!audience) return undefined;
  const variant = audience.variants.find((v) => v.id === (variantId ?? audience.defaultVariant));
  return variant && { audience, variant };
}
