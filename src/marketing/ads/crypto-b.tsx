import { AdCta, AdFrame, fitHeadline, visualWhenRoom } from "./frame";
import { grotesk, mono } from "./fonts";
import type { AdProps, AdVariant } from "./types";

function SplitKnowledge({ from }: AdProps) {
  return (
    <AdFrame
      className={grotesk.className}
      logo={{ bg: "#22D3EE", fg: "#0E0726", text: "#F5F3FF" }}
      style={{
        background:
          "radial-gradient(50% 60% at 15% 20%, rgba(192,38,211,.35), transparent 70%), radial-gradient(50% 60% at 90% 80%, rgba(34,211,238,.28), transparent 70%), #0E0726",
        color: "#F5F3FF",
      }}
      footer="€39 a year · No seed phrases, ever · Revoke access in one click"
    >
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <p className={`${mono.className} text-sm text-cyan-300`}>{"// inheritance for self-custody"}</p>
          <h1 className={`${fitHeadline} mt-4 font-bold tracking-tight`}>
            Your coins shouldn&apos;t die with your&nbsp;
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">keys.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(1rem,2.2vh,1.2rem)] leading-relaxed text-violet-100/75">
            Split the recovery map between people you trust. One learns where the device is, another where the backup is. No single
            person — and no single breach — has everything.
          </p>
          <AdCta
            from={from}
            className="mt-8 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 font-bold text-[#0E0726] shadow-lg shadow-fuchsia-500/30 hover:brightness-110"
          >
            Protect my stack
          </AdCta>
        </div>
        <div className={`relative mx-auto w-full max-w-md ${visualWhenRoom}`} aria-hidden="true">
          <div className="grid grid-cols-2 gap-4">
            {[
              { who: "Mia", knows: "where the hardware wallet is", c: "from-fuchsia-500/25" },
              { who: "Sam", knows: "where the steel backup is", c: "from-cyan-400/25" },
            ].map((p) => (
              <div key={p.who} className={`rounded-2xl border border-white/15 bg-gradient-to-b ${p.c} to-white/[0.03] p-4 backdrop-blur`}>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg font-bold">{p.who[0]}</div>
                <p className="mt-3 font-semibold">{p.who} knows</p>
                <p className="text-sm text-violet-100/70">{p.knows}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto h-10 w-px bg-gradient-to-b from-white/40 to-transparent" />
          <div className={`${mono.className} rounded-2xl border border-white/15 bg-white/[0.05] p-4 text-sm backdrop-blur`}>
            <p className="text-cyan-300">recovery = mia ∩ sam</p>
            <p className="mt-1 text-violet-100/70">seed phrase: never stored here</p>
            <p className="text-violet-100/70">released only if you stop checking in</p>
          </div>
        </div>
      </div>
    </AdFrame>
  );
}

export const cryptoB: AdVariant = {
  id: "b",
  name: "Split knowledge",
  concept: "Deep purple + cyan neon glass. Sells the security angle: split the recovery map between two people.",
  meta: {
    title: "Your coins shouldn't die with your keys — Loose Ends",
    description: "Split your wallet recovery map between people you trust. No seed phrases, ever.",
  },
  themeColor: "#0E0726",
  Component: SplitKnowledge,
};
