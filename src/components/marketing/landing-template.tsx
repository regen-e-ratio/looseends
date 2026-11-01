import Link from "next/link";
import type { LandingPage } from "@/marketing/types";
import { DEFAULT_STEPS, SHARED_FAQ } from "@/marketing/shared";
import { APP_NAME } from "@/lib/config";
import { Logo } from "../logo";
import { CtaLink } from "./cta-link";
import { PreviewCard } from "./preview-card";

/** Renders any landing page config. Keep all copy in src/marketing/pages/*. */
export function LandingTemplate({ page, signedIn = false }: { page: LandingPage; signedIn?: boolean }) {
  const from = page.slug || undefined;
  const steps = page.steps ?? DEFAULT_STEPS;
  const overridden = new Set(page.faq.map((f) => f.id).filter(Boolean));
  const faq = [...page.faq, ...SHARED_FAQ.filter((f) => !f.id || !overridden.has(f.id))];
  const primary = "bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600";

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Logo />
        {signedIn ? (
          <Link href="/dashboard" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-stone-50">
            Open my vault
          </Link>
        ) : (
          <Link href="/login" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-stone-50">
            Sign in
          </Link>
        )}
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">{page.hero.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">{page.hero.headline}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">{page.hero.subheadline}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {signedIn ? (
                <CtaLink href="/dashboard" className={primary}>
                  Go to my vault
                </CtaLink>
              ) : (
                <CtaLink from={from} className={primary}>
                  {page.hero.cta}
                </CtaLink>
              )}
              <a href="#how" className="text-base font-medium text-stone-700 hover:text-stone-900">
                How it works →
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
              {page.hero.bullets.map((b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <span className="text-teal-700">✓</span> {b}
                </li>
              ))}
            </ul>
          </div>
          <PreviewCard preview={page.preview} />
        </section>

        {/* Problem */}
        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">{page.problem.title}</h2>
            {page.problem.intro && <p className="mt-3 max-w-2xl text-lg text-stone-600">{page.problem.intro}</p>}
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {page.problem.points.map((p, i) => (
                <div key={p.title}>
                  <p className="text-sm font-semibold text-teal-700">0{i + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-stone-600">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">{page.features.title}</h2>
          {page.features.intro && <p className="mt-3 max-w-2xl text-lg text-stone-600">{page.features.intro}</p>}
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {page.features.items.map((f) => (
              <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-stone-600">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-8 bg-teal-50/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-700 font-semibold text-white">{i + 1}</span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-stone-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {faq.map((item) => (
              <details key={item.q} className="group px-5 py-4 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="text-xl text-stone-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-stone-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="bg-teal-800 text-white">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{page.closing.headline}</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-teal-50/90">{page.closing.body}</p>
            <div className="mt-8">
              <CtaLink
                from={from}
                href={signedIn ? "/dashboard" : "/login"}
                className="bg-white text-teal-900 hover:bg-teal-50 focus-visible:ring-white focus-visible:ring-offset-teal-800"
              >
                {signedIn ? "Go to my vault" : page.closing.cta}
              </CtaLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-500">
        {APP_NAME} · Never store passwords or seed phrases — tell people <em>where</em> things are, not your secrets.
      </footer>
    </div>
  );
}
