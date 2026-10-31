"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const links = [
  { href: "/dashboard", label: "My vault", match: ["/dashboard", "/items"] },
  { href: "/contacts", label: "Trusted contacts", match: ["/contacts", "/preview"] },
  { href: "/settings", label: "Check-in & settings", match: ["/settings"] },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="order-last flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
      {links.map((l) => {
        const active = l.match.some((m) => path.startsWith(m));
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cx(
              "whitespace-nowrap rounded-md px-3 py-1.5 font-medium",
              active ? "bg-teal-50 text-teal-800" : "text-stone-600 hover:bg-stone-100",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
