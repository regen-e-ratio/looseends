import { AdCta, AdFrame, fitHeadline, visualWhenRoom } from "./frame";
import { caveat, fraunces } from "./fonts";
import type { AdProps, AdVariant } from "./types";

// Side envelopes first so the centre one sits on top.
const envelopes = [
  { to: "To Daniel", pos: "left-0 top-4 -rotate-[9deg]", label: "text-left pl-3", bg: "#FFF7EC" },
  { to: "To the grandchildren", pos: "right-0 top-4 rotate-[9deg]", label: "text-right pr-3 pl-[30%]", bg: "#FFF3E2" },
  { to: "To Emma", pos: "left-1/2 top-0 -translate-x-1/2", label: "text-center", bg: "#FFFDF8" },
];

function GoldenHour({ from }: AdProps) {
  return (
    <AdFrame
      logo={{ bg: "#FFF7EC", fg: "#8A3B4E", text: "#FFF7EC" }}
      style={{ background: "linear-gradient(160deg, #F2B880 0%, #E58C76 45%, #A8506A 100%)", color: "#FFF7EC" }}
      footer="Free to start · Private and encrypted · Easy to use, at your own pace"
    >
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[38rem] w-[38rem] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, #FFE3A3, transparent 65%)" }}
      />
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <div className={`relative mb-8 h-36 w-[min(25rem,92vw)] ${visualWhenRoom} [@media(max-height:700px)]:hidden`} aria-hidden="true">
          {envelopes.map((e) => (
            <div key={e.to} className={`absolute h-[7.5rem] w-[38%] min-w-36 ${e.pos} rounded-md shadow-xl`} style={{ background: e.bg }}>
              <div
                className="absolute inset-x-0 top-0 h-16"
                style={{ background: "linear-gradient(to bottom right, transparent 49.5%, #EBCFB6 50%) left / 50% 100% no-repeat, linear-gradient(to bottom left, transparent 49.5%, #EBCFB6 50%) right / 50% 100% no-repeat" }}
              />
              <p className={`${caveat.className} absolute inset-x-0 bottom-3 text-lg font-bold leading-tight ${e.label}`} style={{ color: "#6B2F3D" }}>
                {e.to}
              </p>
            </div>
          ))}
        </div>
        <h1 className={`${fraunces.className} ${fitHeadline} font-semibold tracking-tight`} style={{ textShadow: "0 2px 24px rgba(90,30,40,.25)" }}>
          Your words, delivered when they matter&nbsp;most.
        </h1>
        <p className="mt-5 max-w-2xl text-[clamp(1.05rem,2.3vh,1.35rem)] leading-relaxed text-white/90">
          A private place for your letters, your wishes, and the practical things your family will need to know — passed on only
          when the time comes.
        </p>
        <AdCta from={from} className="mt-8 rounded-full bg-white shadow-xl hover:bg-[#FFF3E2]" style={{ color: "#7A2E3B" }}>
          Start your letters
        </AdCta>
      </div>
    </AdFrame>
  );
}

export const familyB: AdVariant = {
  id: "b",
  name: "Golden hour",
  concept: "Warm sunset gradient and a fan of envelopes, one per family member. Emotional, hopeful.",
  meta: {
    title: "Your words, delivered when they matter most — Loose Ends",
    description: "A private place for your letters, your wishes and the practical things your family will need to know.",
  },
  themeColor: "#E58C76",
  Component: GoldenHour,
};
