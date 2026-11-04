import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, OPERATOR, SUPPORT_EMAIL } from "@/lib/config";
import { Logo } from "./logo";

export const LEGAL_UPDATED = "4 November 2026";

/** "Loose Ends is run by …", from LEGAL_NAME / LEGAL_ADDRESS. */
export function Operator() {
  return (
    <>
      {APP_NAME} is run by {OPERATOR.name || `the ${APP_NAME} team`}
      {OPERATOR.address ? `, ${OPERATOR.address}` : ""}. You can reach us at{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
    </>
  );
}

/** Plain, readable layout for the terms, privacy notice and refund policy. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-3xl px-4 py-5">
        <Logo />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 space-y-4 leading-relaxed text-stone-700 [&_a]:text-teal-800 [&_a]:underline [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1" aria-label="Legal">
          <Link href="/" className="hover:text-stone-800">{APP_NAME}</Link>
          <Link href="/terms" className="hover:text-stone-800">Terms</Link>
          <Link href="/privacy" className="hover:text-stone-800">Privacy</Link>
          <Link href="/refunds" className="hover:text-stone-800">Refunds</Link>
        </nav>
      </footer>
    </div>
  );
}
