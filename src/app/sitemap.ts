import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/config";
import { AUDIENCES } from "@/marketing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return [{ url: base }, ...["terms", "privacy", "refunds"].map((p) => ({ url: `${base}/${p}` })), ...AUDIENCES.map((a) => ({ url: `${base}/for/${a.slug}` }))];
}
