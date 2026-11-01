import { AdCta, AdFrame, visualWhenRoom } from "./frame";
import { grotesk } from "./fonts";
import type { AdProps, AdVariant } from "./types";

const tags = [
  { t: "Brokerage", r: "-rotate-6" },
  { t: "Pension", r: "rotate-3" },
  { t: "Crypto", r: "rotate-6" },
  { t: "Savings app", r: "-rotate-2" },
  { t: "Robo-advisor", r: "rotate-2" },
  { t: "Subscriptions", r: "-rotate-3" },
];

function ElectricPoster({ from }: AdProps) {
  return (
    <AdFrame
      className={grotesk.className}
      logo={{ bg: "#FFFFFF", fg: "#2148FF", text: "#FFFFFF" }}
      style={{ background: "#2148FF", color: "#FFFFFF" }}
      footer="Free · Takes 15 minutes · We never ask for logins"
    >
      <div className="grid w-full items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="text-[clamp(2.4rem,min(7.4vw,8.2vh),6rem)] font-bold leading-[0.98] tracking-tight">
            10 apps.
            <br />
            2FA on your phone.
            <br />
            <span className="text-[#FFE14D]">Nobody else knows.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[clamp(1rem,2.2vh,1.25rem)] leading-relaxed text-white/85">
            If something happened to you, your money could sit unclaimed for years. Map it in 15 minutes — we pass it on only if you
            stop checking in.
          </p>
          <AdCta from={from} className="mt-8 rounded-none bg-[#FFE14D] font-bold text-[#0B1B66] hover:bg-white">
            Map my accounts — free
          </AdCta>
        </div>
        <div className={`mx-auto flex w-full max-w-md flex-col items-center ${visualWhenRoom}`} aria-hidden="true">
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
            {tags.map((tag) => (
              <span key={tag.t} className={`${tag.r} rounded-full border-2 border-white px-4 py-1.5 text-base font-semibold lg:text-lg`}>
                {tag.t}
              </span>
            ))}
          </div>
          <span className="my-3 text-3xl leading-none">↓</span>
          <span className="whitespace-nowrap rounded-2xl bg-white px-5 py-3 text-xl font-bold text-[#2148FF] shadow-2xl">your partner</span>
        </div>
      </div>
    </AdFrame>
  );
}

export const investorsC: AdVariant = {
  id: "c",
  name: "Electric poster",
  concept: "Bold electric-blue poster with giant type and floating account tags all pointing to one person.",
  meta: {
    title: "10 apps. 2FA on your phone. Nobody else knows. — Loose Ends",
    description: "Map your accounts in 15 minutes. We pass them on only if you stop checking in.",
  },
  themeColor: "#2148FF",
  Component: ElectricPoster,
};
