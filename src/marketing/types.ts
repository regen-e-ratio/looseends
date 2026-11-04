/**
 * The long-form homepage ("the normal landing page"). Its copy lives in ./pages/home.ts and the layout
 * in src/components/marketing/landing-template.tsx. Single-screen ads per audience live in ./ads.
 */
export type LandingPage = {
  /** URL segment: /for/<slug>. Lowercase letters, digits and dashes. The home page uses "". */
  slug: string;
  /** Internal note: who this page targets and where its traffic comes from. Never shown. */
  audience: string;
  meta: { title: string; description: string };

  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    cta: string;
    /** Short reassurance points under the button, e.g. "Encrypted". */
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
