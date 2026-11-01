import Link from "next/link";
import { APP_NAME } from "@/lib/config";

/** A thread with a loose, curled end — the Loose Ends mark. */
export function LogoMark({ className = "h-8 w-8", bg = "#0f766e", fg = "#fff" }: { className?: string; bg?: string; fg?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={bg} />
      <path
        d="M5 20c4 0 5-9 10-9s4.5 8 8.5 8c2.6 0 3.3-2.6 1.6-3.6-1.6-.9-3.3.8-2.2 2.6"
        fill="none"
        stroke={fg}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
      <LogoMark />
      <span>{APP_NAME}</span>
    </Link>
  );
}
