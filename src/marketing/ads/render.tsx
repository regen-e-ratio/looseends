import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getVariant } from "./index";

/** Shared page/metadata logic for /for/<slug> and /for/<slug>/<variant>. */
export function adMetadata(slug: string, variantId?: string): Metadata {
  const found = getVariant(slug, variantId);
  if (!found) return {};
  const { meta } = found.variant;
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: `/for/${slug}` },
    openGraph: { title: meta.title, description: meta.description, type: "website" },
    // Only the default URL per audience is indexed; alternatives are for comparing designs.
    robots: variantId ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function adViewport(slug: string, variantId?: string): Viewport {
  const found = getVariant(slug, variantId);
  return found ? { themeColor: found.variant.themeColor } : {};
}

export function AdPage({ slug, variantId }: { slug: string; variantId?: string }) {
  const found = getVariant(slug, variantId);
  if (!found) notFound();
  const { Component } = found.variant;
  return <Component from={slug} />;
}
