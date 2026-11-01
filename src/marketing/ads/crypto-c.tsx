import { AdCta, AdFrame, visualWhenRoom } from "./frame";
import { grotesk, mono } from "./fonts";
import type { AdProps, AdVariant } from "./types";

function OrangePill({ from }: AdProps) {
  return (
    <AdFrame
      className={grotesk.className}
      logo={{ bg: "#0A0A0A", fg: "#F7931A", text: "#0A0A0A" }}
      style={{ background: "#F7931A", color: "#0A0A0A" }}
      footer="Free · No seed phrases, ever · No wallet connections"
    >
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <h1 className="text-[clamp(2.3rem,min(6.8vw,7.6vh),5.6rem)] font-bold leading-[0.98] tracking-tight">
            There&apos;s no &ldquo;forgot my seed phrase&rdquo; button.
          </h1>
          <p className="mt-6 max-w-xl text-[clamp(1rem,2.2vh,1.25rem)] font-medium leading-relaxed text-black/75">
            If something happens to you, your family needs to know your crypto exists — and how to recover it. Write the map. Keep the
            keys.
          </p>
          <AdCta from={from} className="mt-8 rounded-full bg-black font-bold text-[#F7931A] hover:bg-neutral-800">
            Write my recovery map
          </AdCta>
        </div>
        <div className={`${mono.className} mx-auto w-full max-w-sm rotate-2 rounded-2xl bg-black p-6 text-[15px] text-white shadow-2xl ${visualWhenRoom}`} aria-hidden="true">
          <p className="text-xs uppercase tracking-widest text-[#F7931A]">recovery map · for mia</p>
          <ul className="mt-4 space-y-2.5">
            <li>✓ wallets that exist</li>
            <li>✓ where the backups are</li>
            <li>✓ who can help</li>
            <li>✓ what NOT to do (scams)</li>
            <li className="text-[#F7931A]">✗ seed phrase — never stored</li>
          </ul>
          <p className="mt-5 border-t border-white/15 pt-3 text-xs text-white/50">released only if you stop checking in</p>
        </div>
      </div>
    </AdFrame>
  );
}

export const cryptoC: AdVariant = {
  id: "c",
  name: "Orange pill",
  concept: "Loud bitcoin-orange poster, black type and a checklist card. Direct, meme-literate, unmissable in a feed.",
  meta: {
    title: "There's no “forgot my seed phrase” button — Loose Ends",
    description: "Write the recovery map for your crypto. Keep the keys. No seed phrases, ever.",
  },
  themeColor: "#F7931A",
  Component: OrangePill,
};
