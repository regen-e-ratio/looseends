import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { CtaLink } from "@/components/marketing/cta-link";
import { LogoMark } from "@/components/logo";
import { cx } from "@/components/ui";
import { APP_NAME } from "@/lib/config";

/**
 * Full-screen, no-scroll ad page: logo bar, one centred "poster", and a one-line footer.
 * Designed to fit phone (375×667 and up) and laptop screens without scrolling.
 */
export function AdFrame({
  className,
  style,
  logo,
  footer = "Free to start · Encrypted · We never ask for passwords",
  children,
}: {
  className?: string;
  style?: CSSProperties;
  logo: { bg: string; fg: string; text: string };
  footer?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("relative isolate flex min-h-dvh flex-col overflow-hidden", className)} style={style}>
      <header className="relative z-10 flex items-center justify-between px-5 pt-4 sm:px-10 sm:pt-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" style={{ color: logo.text }}>
          <LogoMark bg={logo.bg} fg={logo.fg} className="h-7 w-7" />
          {APP_NAME}
        </Link>
        <Link href="/login" className="text-sm font-medium opacity-80 hover:opacity-100" style={{ color: logo.text }}>
          Sign in
        </Link>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 py-4 sm:px-10">{children}</main>
      <footer className="relative z-10 px-5 pb-3 text-center text-xs opacity-70 sm:px-10" style={{ color: logo.text }}>
        {footer}
      </footer>
    </div>
  );
}

/** The ad's button: goes to the homepage, carrying the audience and UTM parameters. */
export function AdCta({ from, children, className, style }: { from: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <CtaLink href="/" from={from} className={cx("px-7 py-3.5 text-lg", className)} style={style}>
      {children}
    </CtaLink>
  );
}

/** Headline size that scales with the smaller of width and height, so it never forces a scroll. */
export const fitHeadline = "text-[clamp(2rem,min(6.2vw,6.6vh),4.6rem)] leading-[1.04]";
/** Visuals are hidden on short phone screens to keep everything on one screen. */
export const visualWhenRoom = "max-lg:[@media(max-height:799px)]:hidden";
