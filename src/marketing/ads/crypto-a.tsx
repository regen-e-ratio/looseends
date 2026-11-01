import { AdCta, AdFrame, fitHeadline, visualWhenRoom } from "./frame";
import { mono } from "./fonts";
import type { AdProps, AdVariant } from "./types";

// [key, value, colour, desktop only]
const lines: [string, string, string?, boolean?][] = [
  ["[hw_wallet]  ", "location: home safe, top shelf"],
  ["[backup]     ", "steel plate @ mum's house"],
  ["[exchange]   ", "2FA on phone · codes in safe", undefined, true],
  ["[helper]     ", "sam knows how to restore it", undefined, true],
  ["[seed]       ", "NEVER STORED ✓", "#39FF88"],
  ["[switch]     ", "armed · check-in every 30d", "#F7931A"],
];

function Terminal({ from }: AdProps) {
  return (
    <AdFrame
      className={mono.className}
      logo={{ bg: "#F7931A", fg: "#050505", text: "#E6E6E6" }}
      style={{ background: "#050505", color: "#E6E6E6" }}
      footer="free · no seed phrases · no wallet connections · no KYC"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 4px)" }}
      />
      <div className="pointer-events-none absolute -bottom-40 -left-40 -z-10 h-[30rem] w-[30rem] rounded-full opacity-25 blur-3xl" style={{ background: "#F7931A" }} />
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <p className="text-sm text-[#39FF88]">$ for self-custody holders</p>
          <h1 className={`${fitHeadline} mt-4 font-extrabold tracking-tight`}>
            Not your keys, not your coins.{" "}
            <span className="text-[#F7931A]">Not your heirs&apos; either — unless they&nbsp;know.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(0.95rem,2.1vh,1.15rem)] leading-relaxed text-white/65">
            Give your people the recovery map — which wallets exist, where the backups are, who can help. Without ever storing a seed
            phrase.
          </p>
          <AdCta from={from} className="mt-8 rounded-md bg-[#F7931A] font-bold text-black hover:bg-[#FFA940]">
            &gt; map_my_wallets --free
          </AdCta>
        </div>
        <div className={`w-full overflow-hidden rounded-xl border border-white/15 bg-[#0D0D0D] shadow-2xl shadow-[#F7931A]/10 ${visualWhenRoom}`} aria-hidden="true">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <span className="h-3 w-3 rounded-full bg-[#28C840]" />
            <span className="ml-2 text-xs text-white/40">~/loose-ends</span>
          </div>
          <div className="space-y-1.5 p-4 text-[0.72rem] sm:p-5 sm:text-[clamp(0.8rem,1.7vh,0.95rem)]">
            <p>
              <span className="text-[#39FF88]">➜</span> cat recovery_map.md
            </p>
            {lines.map(([k, v, color, desktopOnly]) => (
              <p key={k} className={`whitespace-pre ${desktopOnly ? "max-lg:hidden" : ""}`}>
                <span className="text-white/45">{k}</span>
                <span style={{ color: color ?? "#E6E6E6" }}>{v}</span>
              </p>
            ))}
            <p>
              <span className="text-[#39FF88]">➜</span> <span className="inline-block h-4 w-2 animate-pulse bg-[#E6E6E6] align-middle" />
            </p>
          </div>
        </div>
      </div>
    </AdFrame>
  );
}

export const cryptoA: AdVariant = {
  id: "a",
  name: "Terminal",
  concept: "Black terminal aesthetic, monospace, bitcoin orange + terminal green. A recovery map printed in a shell.",
  meta: {
    title: "Not your keys, not your coins. Not your heirs' either. — Loose Ends",
    description: "Give your people the recovery map for your wallets — without ever storing a seed phrase.",
  },
  themeColor: "#050505",
  Component: Terminal,
};
