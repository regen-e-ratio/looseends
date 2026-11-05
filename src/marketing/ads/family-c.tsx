import { AdCta, AdFrame, fitHeadline, visualWhenRoom } from "./frame";
import { caveat, fraunces } from "./fonts";
import type { AdProps, AdVariant } from "./types";

const wishes = ["A letter to each grandchild", "Where the will is kept", "Music for the service", "Who looks after Biscuit"];

function Leaf({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="#5E7B5A" strokeWidth="2" aria-hidden="true">
      <path d="M20 190 C60 130 90 90 180 20" />
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 45 + i * 28;
        const y = 158 - i * 30;
        return (
          <g key={i}>
            <path d={`M${x} ${y} C${x - 30} ${y - 10} ${x - 35} ${y - 40} ${x - 10} ${y - 45} C${x} ${y - 30} ${x + 2} ${y - 15} ${x} ${y}`} />
            <path d={`M${x} ${y} C${x + 30} ${y + 2} ${x + 45} ${y - 20} ${x + 30} ${y - 38} C${x + 12} ${y - 30} ${x + 4} ${y - 15} ${x} ${y}`} />
          </g>
        );
      })}
    </svg>
  );
}

function Garden({ from }: AdProps) {
  return (
    <AdFrame
      logo={{ bg: "#22392B", fg: "#E4EBDD", text: "#22392B" }}
      style={{ background: "linear-gradient(180deg, #E7EDE1 0%, #D5E0CD 100%)", color: "#22392B" }}
      footer="Free to start · Private and encrypted · A family member can help you set it up"
    >
      <Leaf className="pointer-events-none absolute -left-10 bottom-0 -z-10 h-72 w-72 opacity-50" />
      <Leaf className="pointer-events-none absolute -right-8 -top-6 -z-10 h-64 w-64 rotate-180 opacity-40" />
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <h1 className={`${fraunces.className} ${fitHeadline} font-medium italic tracking-tight`}>Tell them what you&apos;d&nbsp;want.</h1>
          <p className="mt-5 max-w-xl text-[clamp(1.05rem,2.3vh,1.35rem)] leading-relaxed" style={{ color: "#3F5444" }}>
            The service, the will, the pension, who gets the ring — and a letter to each of them. Written once, delivered only when the
            time comes.
          </p>
          <AdCta from={from} className="mt-8 rounded-xl text-white shadow-lg hover:brightness-110" style={{ background: "#2F5D3F" }}>
            Write down my wishes
          </AdCta>
        </div>
        <div className={`mx-auto w-full max-w-sm rounded-2xl border bg-[#FBFCF8] p-7 shadow-xl ${visualWhenRoom}`} style={{ borderColor: "#C3D1BB" }} aria-hidden="true">
          <p className={`${fraunces.className} text-2xl font-semibold`}>My wishes</p>
          <ul className="mt-4 space-y-3">
            {wishes.map((w) => (
              <li key={w} className="flex items-center gap-3 text-lg">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm text-white" style={{ background: "#5E7B5A" }}>
                  ✓
                </span>
                {w}
              </li>
            ))}
          </ul>
          <p className={`${caveat.className} mt-5 text-right text-2xl`} style={{ color: "#5E7B5A" }}>
            — written with love
          </p>
        </div>
      </div>
    </AdFrame>
  );
}

export const familyC: AdVariant = {
  id: "c",
  name: "Garden",
  concept: "Sage green, botanical line art and a simple 'My wishes' checklist. Calm, practical, reassuring.",
  meta: {
    title: "Tell them what you'd want — Loose Ends",
    description: "Your wishes, the will, the pension, and a letter to each of them. Written once, delivered only when the time comes.",
  },
  themeColor: "#E7EDE1",
  Component: Garden,
};
