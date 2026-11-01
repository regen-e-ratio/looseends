import Link from "next/link";
import { Logo } from "@/components/logo";
import { LANDING_PAGES } from "@/marketing";

export const metadata = { title: "Landing pages", robots: { index: false, follow: false } };

/** Internal index of all campaign landing pages, for reviewing them and copying ad URLs. */
export default function LandingIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Landing pages</h1>
      <p className="mt-1 text-stone-600">
        One page per audience. Add <code className="rounded bg-stone-100 px-1">?utm_source=…&amp;utm_campaign=…</code> to ad URLs to track
        which ad brought each signup.
      </p>
      <ul className="mt-6 space-y-3">
        {LANDING_PAGES.map((p) => (
          <li key={p.slug} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <Link href={`/for/${p.slug}`} className="font-semibold text-teal-800 hover:underline">
              /for/{p.slug}
            </Link>
            <p className="mt-1 text-sm font-medium">{p.hero.headline}</p>
            <p className="mt-1 text-sm text-stone-500">{p.audience}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
