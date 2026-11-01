import { crypto } from "./pages/crypto";
import { family } from "./pages/family";
import { home } from "./pages/home";
import { investors } from "./pages/investors";
import type { LandingPage } from "./types";

export type { LandingPage } from "./types";
export { home };

/** Campaign landing pages served at /for/<slug>. To add one: create ./pages/<slug>.ts and list it here. */
export const LANDING_PAGES: LandingPage[] = [family, investors, crypto];

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}

/** Validates an attribution value coming from a URL before it's stored. */
export function isLandingSlug(value: unknown): value is string {
  return typeof value === "string" && LANDING_PAGES.some((p) => p.slug === value);
}
