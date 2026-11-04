import { AdCta, AdFrame, fitHeadline, visualWhenRoom } from "./frame";
import { caveat, fraunces } from "./fonts";
import type { AdProps, AdVariant } from "./types";

function FamilyLetter({ from }: AdProps) {
  return (
    <AdFrame
      logo={{ bg: "#7A2E3B", fg: "#FBF6EC", text: "#3B2A2A" }}
      style={{ background: "radial-gradient(120% 90% at 70% 40%, #FFFBF3 0%, #F7EEDD 55%, #EADBC0 100%)", color: "#3B2A2A" }}
      footer="€39 a year · Private and encrypted · No passwords to remember"
    >
      <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: "#9F3A4B" }}>
            For the people who will miss you
          </p>
          <h1 className={`${fraunces.className} ${fitHeadline} mt-4 font-semibold tracking-tight`}>
            Some things are too important to leave&nbsp;unsaid.
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(1.05rem,2.2vh,1.3rem)] leading-relaxed" style={{ color: "#5B4644" }}>
            Write a letter to your children and grandchildren. We keep it private, and deliver it only when the time comes.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <AdCta from={from} className="rounded-full text-white shadow-lg hover:brightness-110" style={{ background: "#7A2E3B" }}>
              Write your first letter →
            </AdCta>
          </div>
        </div>

        <div className={`relative mx-auto w-full max-w-md ${visualWhenRoom}`} aria-hidden="true">
          <div className="absolute inset-x-6 -bottom-4 top-10 rotate-3 rounded-md shadow-xl" style={{ background: "#E9D6B4" }} />
          <div
            className={`${caveat.className} relative -rotate-2 rounded-md px-8 py-7 text-[clamp(1.25rem,2.8vh,1.7rem)] leading-snug shadow-2xl`}
            style={{
              background: "repeating-linear-gradient(#FFFDF8, #FFFDF8 calc(1.4em - 1px), #E8DCC8 1.4em)",
              color: "#2F2A44",
            }}
          >
            <p>My dear Daniel,</p>
            <p className="mt-2">
              I hope you&apos;re reading this with a cup of tea. I am so proud of the man you&apos;ve become. Look after your sister,
              keep the garden going, and play Dad&apos;s records loud now and then.
            </p>
            <p className="mt-3 text-right">All my love, Mum</p>
          </div>
          <div
            className="absolute -bottom-6 -left-4 grid h-16 w-16 lg:h-20 lg:w-20 place-items-center rounded-full text-sm font-bold shadow-lg"
            style={{ background: "radial-gradient(circle at 35% 30%, #C2485A, #7A1F2E 70%)", color: "#F4D9C8" }}
          >
            <span className={fraunces.className}>LE</span>
          </div>
        </div>
      </div>
    </AdFrame>
  );
}

export const familyA: AdVariant = {
  id: "a",
  name: "The letter",
  concept: "Cream paper, a handwritten letter and a wax seal. Quiet, personal, nostalgic.",
  meta: {
    title: "Some things are too important to leave unsaid — Loose Ends",
    description: "Write a letter to your children and grandchildren. We keep it private, and deliver it only when the time comes.",
  },
  themeColor: "#F7EEDD",
  Component: FamilyLetter,
};
