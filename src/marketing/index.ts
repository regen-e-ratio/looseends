import { AUDIENCES } from "./ads";
import { home } from "./pages/home";

export type { LandingPage } from "./types";
export type { AdVariant, Audience } from "./ads/types";
export { AUDIENCES, getAudience, getVariant } from "./ads";
export { home };

/** Validates an attribution value coming from a URL before it's stored. */
export function isLandingSlug(value: unknown): value is string {
  return typeof value === "string" && AUDIENCES.some((a) => a.slug === value);
}
