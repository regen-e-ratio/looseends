"use client";

import { Analytics as VercelAnalytics, type BeforeSendEvent } from "@vercel/analytics/next";

const KEEP_PARAMS = /^(from|utm_(source|medium|campaign|content|term))$/;
const UUID = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi;

/**
 * Removes anything secret or personal from a URL before it is sent to analytics:
 * access-link tokens, check-in / sign-in tokens and record ids. Keeps landing-page
 * attribution (from, utm_*) so the funnel /for/<slug> → /login?from=<slug> → /welcome is visible.
 */
export function redactUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = url.pathname.replace(/^\/access\/[^/]+/, "/access/[token]").replace(UUID, "/[id]");
  for (const key of [...url.searchParams.keys()]) {
    if (!KEEP_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.hash = "";
  return url.toString();
}

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  return { ...event, url: redactUrl(event.url) };
}

/** Vercel Web Analytics: cookieless page views. Only sends data on Vercel deployments. */
export function Analytics() {
  return <VercelAnalytics beforeSend={beforeSend} />;
}
