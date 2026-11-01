import { AUDIENCES } from "@/marketing";
import { AdPage, adMetadata, adViewport } from "@/marketing/ads/render";

// Static ad page per audience (its default design). Unknown slugs are a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return AUDIENCES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/for/[slug]">) {
  return adMetadata((await params).slug);
}

export async function generateViewport({ params }: PageProps<"/for/[slug]">) {
  return adViewport((await params).slug);
}

export default async function AudienceAd({ params }: PageProps<"/for/[slug]">) {
  return <AdPage slug={(await params).slug} />;
}
