import type { NextConfig } from "next";

const securityHeaders = [
  // Access and check-in links carry secret tokens in the URL, so never leak them via Referer.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // Marketing pages (/ and /for/*) may be indexed; everything else — and especially the token links — never.
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      // Nothing may be framed — except the ad pages, by our own /for gallery.
      { source: "/((?!for(?:/|$)).*)", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      { source: "/for/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      ...["/access/:path*", "/claim/:path*", "/check-in", "/auth/:path*", "/api/:path*", "/login", "/welcome", "/dashboard", "/items/:path*", "/contacts/:path*", "/settings", "/preview/:path*"].map(
        (source) => ({ source, headers: noindex }),
      ),
    ];
  },
};

export default nextConfig;
