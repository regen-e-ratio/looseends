import type { PreviewContent } from "@/marketing/types";

/** Decorative mock of the page a trusted contact receives. Purely illustrative content. */
export function PreviewCard({ preview }: { preview: PreviewContent }) {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-label="Example of what a trusted contact receives" role="img">
      <div className="absolute -inset-3 -z-10 rotate-2 rounded-3xl bg-teal-100/70" />
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-stone-100 bg-stone-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="ml-3 truncate text-xs text-stone-400">looseends.life · private link for {preview.recipientName}</span>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <p className="text-xs text-stone-500">For {preview.recipientName}</p>
            <p className="text-lg font-semibold tracking-tight">Information from {preview.ownerName}</p>
          </div>
          {preview.letter && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">{preview.letter.title}</p>
              <p className="mt-1.5 font-serif text-[15px] italic leading-relaxed text-stone-800">{preview.letter.body}</p>
            </div>
          )}
          {preview.items.map((item) => (
            <div key={item.title} className="rounded-xl border border-stone-200 p-3.5">
              <p className="text-sm font-semibold">
                <span className="mr-1.5">{item.icon}</span>
                {item.title}
              </p>
              {item.lines.map((line) => (
                <p key={line} className="mt-0.5 text-sm text-stone-600">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
