/**
 * A marketing landing page. Each audience/ad campaign gets one config file in ./pages,
 * registered in ./index.ts, and is served statically at /for/<slug>.
 * All copy lives here; the layout lives in src/components/marketing/landing-template.tsx.
 */
export type LandingPage = {
  /** URL segment: /for/<slug>. Lowercase letters, digits and dashes. The home page uses "". */
  slug: string;
  /** Internal note: who this page targets and where its traffic comes from. Never shown. */
  audience: string;
  meta: { title: string; description: string };
  /** Where a new user who signed up from this page lands after entering their name. */
  startHref: string;

  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    cta: string;
    /** Short reassurance points under the button, e.g. "Free to use". */
    bullets: string[];
  };
  /** Mock of what a trusted contact would receive — the hero visual. Use generic names, no real brands. */
  preview: PreviewContent;
  problem: { title: string; intro?: string; points: { title: string; body: string }[] };
  features: { title: string; intro?: string; items: { icon: string; title: string; body: string }[] };
  /** Defaults to the shared 3 steps (src/marketing/shared.ts). */
  steps?: { title: string; body: string }[];
  /** Page-specific questions; the shared FAQs are appended after these. An item with the `id` of a shared FAQ replaces it. */
  faq: { id?: string; q: string; a: string }[];
  closing: { headline: string; body: string; cta: string };
};

export type PreviewContent = {
  ownerName: string;
  recipientName: string;
  /** Shown as a handwritten-style letter at the top of the preview. */
  letter?: { title: string; body: string };
  items: { icon: string; title: string; lines: string[] }[];
};
