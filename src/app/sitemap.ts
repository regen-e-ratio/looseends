import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";
import { AUDIENCES } from "@/marketing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return [{ url: base }, ...AUDIENCES.map((a) => ({ url: `${base}/for/${a.slug}` }))];
}
