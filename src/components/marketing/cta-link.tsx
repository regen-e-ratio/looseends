"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "../ui";

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/**
 * Call-to-action link that carries attribution forward: the audience slug (`from`, or the one already
 * in the current URL) and the ad's UTM parameters. Ad → homepage → /login all keep them, so the new
 * account records where it came from. Pass `forward={false}` for plain links (e.g. "Go to my vault").
 */
export function CtaLink({
  from,
  children,
  className,
  href = "/login",
  forward = true,
  style,
}: {
  from?: string;
  children: ReactNode;
  className?: string;
  href?: string;
  forward?: boolean;
  style?: CSSProperties;
}) {
  const [target, setTarget] = useState(() => (forward && from ? `${href}?from=${encodeURIComponent(from)}` : href));

  useEffect(() => {
    if (!forward) return;
    const params = new URLSearchParams();
    const here = new URLSearchParams(window.location.search);
    const source = from ?? here.get("from");
    if (source && /^[a-z0-9-]{1,40}$/.test(source)) params.set("from", source);
    for (const key of UTM) {
      const v = here.get(key);
      if (v) params.set(key, v.slice(0, 100));
    }
    const qs = params.toString();
    // Reading the URL is only possible after hydration on a statically generated page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(qs ? `${href}?${qs}` : href);
  }, [from, href, forward]);

  return (
    <Link
      href={target}
      style={style}
      className={cx(
        "inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}
