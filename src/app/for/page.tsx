import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { AUDIENCES } from "@/marketing";

export const metadata = { title: "Ad gallery", robots: { index: false, follow: false } };

const DESKTOP = { w: 1440, h: 900, scale: 0.25 };
const PHONE = { w: 390, h: 844, scale: 0.27 };

function Preview({ src, frame, label }: { src: string; frame: typeof DESKTOP; label: string }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/15"
      style={{ width: frame.w * frame.scale, height: frame.h * frame.scale }}
    >
      <iframe
        src={src}
        title={label}
        loading="lazy"
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: frame.w, height: frame.h, transform: `scale(${frame.scale})` }}
      />
    </div>
  );
}

/** Internal gallery of every ad design, live, at desktop and phone size. */
export default function AdGallery() {
  return (
    <main className="min-h-dvh flex-1 bg-neutral-950 px-4 py-10 text-neutral-100 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center gap-3">
          <LogoMark />
          <h1 className="text-2xl font-semibold tracking-tight">Ad gallery</h1>
        </div>
        <p className="mt-2 max-w-3xl text-neutral-400">
          Every design alternative, live. The ad URL for each audience is <code className="text-neutral-200">/for/&lt;audience&gt;</code>{" "}
          and shows the <span className="text-emerald-300">default</span> design. Each alternative also has its own URL. Add{" "}
          <code className="text-neutral-200">?utm_source=…&amp;utm_campaign=…</code> to track ads.
        </p>

        {AUDIENCES.map((a) => (
          <section key={a.slug} className="mt-12">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="text-xl font-semibold">{a.name}</h2>
              <Link href={`/for/${a.slug}`} className="font-mono text-sm text-emerald-300 hover:underline">
                /for/{a.slug}
              </Link>
            </div>
            <p className="mt-1 text-sm text-neutral-400">{a.audience}</p>
            <div className="mt-5 grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
              {a.variants.map((v) => {
                const href = `/for/${a.slug}/${v.id}`;
                return (
                  <article key={v.id} className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {v.id.toUpperCase()} · {v.name}
                          {v.id === a.defaultVariant && (
                            <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-300">default</span>
                          )}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-400">{v.concept}</p>
                      </div>
                      <Link href={href} className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 font-mono text-xs hover:bg-white/20">
                        {href} ↗
                      </Link>
                    </div>
                    <div className="mt-4 flex gap-3 overflow-x-auto">
                      <Preview src={href} frame={DESKTOP} label={`${a.name} ${v.name} desktop`} />
                      <Preview src={href} frame={PHONE} label={`${a.name} ${v.name} phone`} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
