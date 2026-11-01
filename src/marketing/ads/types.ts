import type { ComponentType } from "react";

/** Props every ad component receives. */
export type AdProps = { from: string };

/** One design alternative of an ad, served at /for/<audience>/<id>. */
export type AdVariant = {
  /** Short id used in the URL: a, b, c… */
  id: string;
  /** Concept name shown in the /for gallery. */
  name: string;
  /** One line on the idea behind the design. */
  concept: string;
  meta: { title: string; description: string };
  /** Browser UI colour on mobile — match the page background. */
  themeColor: string;
  Component: ComponentType<AdProps>;
};

/** A target audience: one ad URL (/for/<slug>) with one or more design alternatives. */
export type Audience = {
  slug: string;
  name: string;
  /** Who it's for and what the message leads with. Internal only. */
  audience: string;
  /** Where a new user from this audience starts after sign-up. */
  startHref: string;
  /** Variant served at /for/<slug>. */
  defaultVariant: string;
  variants: AdVariant[];
};
