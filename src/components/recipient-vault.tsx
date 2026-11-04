import { ITEM_KINDS, KIND_ORDER, findField } from "@/lib/items";
import type { VaultItem } from "@/lib/vault";
import { formatDate } from "./ui";

export function RecipientVault({
  ownerName,
  ownerEmail,
  recipientName,
  personalMessage,
  items,
  releasedAt,
}: {
  ownerName: string;
  ownerEmail: string;
  recipientName: string;
  personalMessage: string | null;
  items: VaultItem[];
  releasedAt: Date | null;
}) {
  const messages = items.filter((i) => i.kind === "message");
  const groups = KIND_ORDER.filter((k) => k !== "message")
    .map((k) => ({ kind: k, items: items.filter((i) => i.kind === k) }))
    .filter((g) => g.items.length);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-stone-500">
          For {recipientName}
          {releasedAt && <> · released {formatDate(releasedAt)}</>}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Information from {ownerName}</h1>
        <p className="mt-2 text-stone-600">
          {ownerName} ({ownerEmail}) wrote this down so you&apos;d know what to take care of. Take your time — none of this needs to
          happen today.
        </p>
      </header>

      {personalMessage && (
        <section className="rounded-xl border border-teal-200 bg-teal-50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-800">A message for you</h2>
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-stone-800">{personalMessage}</p>
        </section>
      )}

      {messages.map((m) => (
        <section key={m.id} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">✉️ {m.title}</h2>
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-stone-800">{m.notes}</p>
        </section>
      ))}

      {groups.length === 0 && messages.length === 0 && !personalMessage && (
        <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">Nothing has been shared with you yet.</p>
      )}

      {groups.map((g) => (
        <section key={g.kind}>
          <h2 className="mb-3 text-lg font-semibold">
            {ITEM_KINDS[g.kind].icon} {ITEM_KINDS[g.kind].plural} <span className="text-stone-400">({g.items.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((item) => (
              <article key={item.id} className="break-inside-avoid rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">{item.title}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  {item.reference && (
                    <div>
                      <dt className="text-stone-500">{findField(item.kind)?.label}</dt>
                      <dd className="break-words text-stone-900">{item.reference}</dd>
                    </div>
                  )}
                  {item.notes && (
                    <div>
                      <dt className="text-stone-500">{ITEM_KINDS[item.kind].notes.label}</dt>
                      <dd className="whitespace-pre-wrap break-words text-stone-900">{item.notes}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
