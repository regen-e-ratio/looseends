"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "../ui";

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/**
 * Sign-up button for landing pages. Carries the landing page slug and the ad's UTM parameters
 * through to /login so the new account records where it came from.
 */
export function CtaLink({ from, children, className, href = "/login" }: { from?: string; children: ReactNode; className?: string; href?: string }) {
  const [target, setTarget] = useState(() => (from ? `${href}?from=${encodeURIComponent(from)}` : href));

  useEffect(() => {
    if (href !== "/login") return;
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    const here = new URLSearchParams(window.location.search);
    for (const key of UTM) {
      const v = here.get(key);
      if (v) params.set(key, v.slice(0, 100));
    }
    const qs = params.toString();
    // Reading the URL is only possible after hydration on a statically generated page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(qs ? `${href}?${qs}` : href);
  }, [from, href]);

  return (
    <Link
      href={target}
      className={cx(
        "inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}
