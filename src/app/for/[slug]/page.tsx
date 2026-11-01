import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingTemplate } from "@/components/marketing/landing-template";
import { LANDING_PAGES, getLandingPage } from "@/marketing";

// Every landing page is generated at build time; unknown slugs are a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/for/[slug]">): Promise<Metadata> {
  const page = getLandingPage((await params).slug);
  if (!page) return {};
  return {
    title: { absolute: page.meta.title },
    description: page.meta.description,
    alternates: { canonical: `/for/${page.slug}` },
    openGraph: { title: page.meta.title, description: page.meta.description, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function CampaignPage({ params }: PageProps<"/for/[slug]">) {
  const page = getLandingPage((await params).slug);
  if (!page) notFound();
  return <LandingTemplate page={page} />;
}
