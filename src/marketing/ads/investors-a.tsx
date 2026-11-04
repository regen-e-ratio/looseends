import { AdCta, AdFrame, fitHeadline, visualWhenRoom } from "./frame";
import { grotesk } from "./fonts";
import type { AdProps, AdVariant } from "./types";

const rows = [
  { name: "Brokerage · ETFs", value: "€18,400", shared: true },
  { name: "Workplace pension", value: "€32,100", shared: true },
  { name: "Savings app", value: "€9,000", shared: true },
  { name: "Crypto exchange", value: "€2,300", shared: false },
];

function MoneyMap({ from }: AdProps) {
  return (
    <AdFrame
      className={grotesk.className}
      logo={{ bg: "#C6F432", fg: "#0B0F14", text: "#F4F7FA" }}
      style={{
        background:
          "radial-gradient(60% 60% at 80% 30%, rgba(198,244,50,.16), transparent 70%), linear-gradient(#0B0F14, #0B0F14)",
        color: "#F4F7FA",
      }}
      footer="€39 a year · Takes 15 minutes · We never ask for logins"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
        style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }}
      />
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#C6F432]">For people building wealth</p>
          <h1 className={`${fitHeadline} mt-4 font-bold tracking-tight`}>
            Your money lives in 10&nbsp;apps. Your family knows about <span className="text-[#C6F432]">0</span>.
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(1rem,2.2vh,1.25rem)] leading-relaxed text-white/70">
            Keep a private map of every account — and pass it on automatically to the people you choose if something happens to you.
          </p>
          <AdCta from={from} className="mt-8 rounded-xl bg-[#C6F432] font-bold text-[#0B0F14] hover:bg-[#D7FF5C]">
            Map my accounts
          </AdCta>
        </div>

        <div className={`mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl lg:p-6 backdrop-blur ${visualWhenRoom}`} aria-hidden="true">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-white/60">Your money map</p>
            <p className="text-sm text-white/60">4 accounts</p>
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight lg:text-4xl">≈ €61,800</p>
          <div className="mt-3 divide-y divide-white/10 lg:mt-5">
            {rows.map((r) => (
              <div key={r.name} className="flex items-center justify-between py-2 text-[15px] lg:py-3">
                <span>{r.name}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-white/80">{r.value}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.shared ? "bg-[#C6F432]/15 text-[#C6F432]" : "bg-white/10 text-white/50"}`}>
                    {r.shared ? "→ Priya" : "→ Sam"}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#C6F432]/10 px-3 py-2 text-sm text-[#C6F432] max-lg:hidden">
            <span className="h-2 w-2 rounded-full bg-[#C6F432]" /> Switch active · next check-in in 87 days
          </div>
        </div>
      </div>
    </AdFrame>
  );
}

export const investorsA: AdVariant = {
  id: "a",
  name: "Money map",
  concept: "Dark fintech dashboard with lime highlights: your accounts, a total, and who gets each one.",
  meta: {
    title: "Your money lives in 10 apps. Your family knows about 0. — Loose Ends",
    description: "Keep a private map of every account and pass it on automatically to the people you choose.",
  },
  themeColor: "#0B0F14",
  Component: MoneyMap,
};
