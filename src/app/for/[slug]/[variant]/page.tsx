import { AUDIENCES } from "@/marketing";
import { AdPage, adMetadata, adViewport } from "@/marketing/ads/render";

// Every design alternative, e.g. /for/crypto/b — for comparing designs and A/B tests.
export const dynamicParams = false;

export function generateStaticParams() {
  return AUDIENCES.flatMap((a) => a.variants.map((v) => ({ slug: a.slug, variant: v.id })));
}

export async function generateMetadata({ params }: PageProps<"/for/[slug]/[variant]">) {
  const { slug, variant } = await params;
  return adMetadata(slug, variant);
}

export async function generateViewport({ params }: PageProps<"/for/[slug]/[variant]">) {
  const { slug, variant } = await params;
  return adViewport(slug, variant);
}

export default async function AdVariantPage({ params }: PageProps<"/for/[slug]/[variant]">) {
  const { slug, variant } = await params;
  return <AdPage slug={slug} variantId={variant} />;
}
