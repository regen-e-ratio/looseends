import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";
import { LANDING_PAGES } from "@/marketing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return [{ url: base }, ...LANDING_PAGES.map((p) => ({ url: `${base}/for/${p.slug}` }))];
}
