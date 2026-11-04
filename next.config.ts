import type { NextConfig } from "next";

const securityHeaders = [
  // Access and check-in links carry secret tokens in the URL, so never leak them via Referer.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Content-Security-Policy. Next.js needs inline scripts for hydration ('unsafe-inline'); everything else is
 * locked to our own origin, so injected markup could not load code from, or send data to, another site.
 * Fonts are self-hosted by next/font, and Vercel Web Analytics is served from /_vercel on this domain.
 */
function csp(frameAncestors: string): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

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
      {
        source: "/((?!for(?:/|$)).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp("'none'") },
        ],
      },
      {
        source: "/for/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: csp("'self'") },
        ],
      },
      { source: "/for", headers: [{ key: "Content-Security-Policy", value: csp("'self'") }] },
      ...["/access/:path*", "/claim/:path*", "/check-in", "/auth/:path*", "/api/:path*", "/login", "/onboarding", "/dashboard", "/vault", "/contacts/:path*", "/settings", "/preview/:path*"].map(
        (source) => ({ source, headers: noindex }),
      ),
    ];
  },
};

export default nextConfig;
