import { AdCta, AdFrame, fitHeadline, visualWhenRoom } from "./frame";
import { grotesk } from "./fonts";
import type { AdProps, AdVariant } from "./types";

const apps = [
  { icon: "📈", name: "Brokerage", sub: "Index funds" },
  { icon: "🏦", name: "Pension", sub: "2 pots from old jobs" },
  { icon: "💶", name: "Savings", sub: "Emergency fund" },
  { icon: "🪙", name: "Crypto", sub: "Exchange account" },
];

function BrightFintech({ from }: AdProps) {
  return (
    <AdFrame
      className={grotesk.className}
      logo={{ bg: "#6D28D9", fg: "#fff", text: "#0F172A" }}
      style={{ background: "#FAFAFF", color: "#0F172A" }}
      footer="Free · Takes 15 minutes · We never ask for logins"
    >
      <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[40rem] w-[40rem] rounded-full opacity-70 blur-3xl" style={{ background: "radial-gradient(circle, #C4B5FD, transparent 65%)" }} />
      <div className="pointer-events-none absolute -bottom-48 left-1/4 -z-10 h-[34rem] w-[34rem] rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, #7DD3FC, transparent 65%)" }} />
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <h1 className={`${fitHeadline} font-bold tracking-tight`}>
            You diversified your portfolio.{" "}
            <span className="bg-gradient-to-r from-violet-700 to-sky-500 bg-clip-text text-transparent">Now back it&nbsp;up.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(1rem,2.2vh,1.25rem)] leading-relaxed text-slate-600">
            Brokers, pensions, savings apps. Loose Ends keeps a private map of all of it, and hands it to the people you choose if
            something ever happens to you.
          </p>
          <AdCta from={from} className="mt-8 rounded-full bg-violet-700 text-white shadow-lg shadow-violet-700/30 hover:bg-violet-800">
            Back up my accounts →
          </AdCta>
        </div>

        <div className={`relative mx-auto ${visualWhenRoom}`} aria-hidden="true">
          <div className="relative h-[min(560px,62vh)] w-[min(280px,31vh)] rounded-[2.6rem] border-[10px] border-slate-900 bg-white p-4 shadow-2xl max-lg:hidden">
            <div className="mx-auto mb-4 h-5 w-24 rounded-full bg-slate-900" />
            <p className="text-xs font-medium text-slate-400">LOOSE ENDS</p>
            <p className="text-lg font-bold">My accounts</p>
            <div className="mt-3 space-y-2">
              {apps.map((a) => (
                <div key={a.name} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100">{a.icon}</span>
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold">{a.name}</span>
                    <span className="block text-xs text-slate-500">{a.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* On phones only this check-in card is shown; on desktop it floats over the phone mock. */}
          <div className="w-64 rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-slate-200 lg:absolute lg:-left-16 lg:bottom-16 lg:w-60">
            <p className="text-xs text-slate-500">Check-in · now</p>
            <p className="text-sm font-semibold">Still here? Tap to confirm.</p>
            <p className="mt-2 rounded-lg bg-violet-700 py-1.5 text-center text-sm font-semibold text-white">I&apos;m OK ✓</p>
          </div>
        </div>
      </div>
    </AdFrame>
  );
}

export const investorsB: AdVariant = {
  id: "b",
  name: "Bright fintech",
  concept: "Light, airy, violet gradients and a phone showing your accounts and the one-tap check-in.",
  meta: {
    title: "You diversified your portfolio. Now back it up. — Loose Ends",
    description: "Brokers, pensions, savings apps: keep a private map of all of it for the people you choose.",
  },
  themeColor: "#FAFAFF",
  Component: BrightFintech,
};
