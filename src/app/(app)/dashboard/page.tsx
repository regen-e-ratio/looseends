import Link from "next/link";
import { SwitchStatus } from "@/components/switch-status";
import { Alert, Badge, Card, LinkButton, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ITEM_KINDS, KIND_ORDER } from "@/lib/items";
import { listItems, listRecipients } from "@/lib/vault";

export const metadata = { title: "My vault" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const [items, contacts, sp] = await Promise.all([listItems(user.id), listRecipients(user.id), searchParams]);
  const nameOf = new Map(contacts.map((c) => [c.id, c.name]));

  const steps = [
    { done: items.length > 0, label: "Add your first item", href: "/items/new?kind=subscription" },
    { done: contacts.length > 0, label: "Add a trusted contact", href: "/contacts/new" },
    { done: user.switchEnabled, label: "Turn on your release switch", href: "/settings" },
  ];
  const setupDone = steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hello${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Everything your loved ones would need to know, in one place."
      />

      {sp.saved && <Alert tone="success">Saved.</Alert>}
      {sp.checkedIn && <Alert tone="success">Thanks — you&apos;re checked in and your timer has been reset.</Alert>}
      {sp.rejected && <Alert tone="success">Request rejected. We&apos;ve let your contact know you&apos;re OK.</Alert>}

      <SwitchStatus
        user={user}
        recipientCount={contacts.length}
        claimantName={contacts.find((c) => c.id === user.claimRecipientId)?.name ?? null}
      />

      {!setupDone && (
        <Card>
          <h2 className="font-semibold">Get set up in 3 steps</h2>
          <ol className="mt-3 space-y-2">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span
                  className={cx(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                    s.done ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-700",
                  )}
                >
                  {s.done ? "✓" : i + 1}
                </span>
                {s.done ? (
                  <span className="text-stone-500 line-through">{s.label}</span>
                ) : (
                  <Link href={s.href} className="font-medium text-teal-800 hover:underline">
                    {s.label} →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Add to your vault</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {KIND_ORDER.map((k) => (
            <Link
              key={k}
              href={`/items/new?kind=${k}`}
              className="rounded-lg border border-stone-200 bg-white p-3 text-center shadow-sm transition hover:border-teal-600 hover:shadow"
            >
              <div className="text-2xl">{ITEM_KINDS[k].icon}</div>
              <div className="mt-1 text-sm font-medium">{ITEM_KINDS[k].label}</div>
            </Link>
          ))}
        </div>
      </section>

      {items.length === 0 ? (
        <Card className="text-center text-stone-600">
          <p className="text-3xl">🗂️</p>
          <p className="mt-2 font-medium text-stone-800">Your vault is empty</p>
          <p className="mt-1 text-sm">
            Start with the things that would be hardest to discover: subscriptions that keep charging, accounts nobody knows about,
            and a message to the people you love.
          </p>
        </Card>
      ) : (
        KIND_ORDER.map((k) => {
          const group = items.filter((i) => i.kind === k);
          if (!group.length) return null;
          return (
            <section key={k} id={k}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {ITEM_KINDS[k].icon} {ITEM_KINDS[k].plural} <span className="font-normal text-stone-400">({group.length})</span>
                </h2>
                <LinkButton href={`/items/new?kind=${k}`} variant="ghost" className="text-teal-800">
                  + Add
                </LinkButton>
              </div>
              <div className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                {group.map((item) => (
                  <Link key={item.id} href={`/items/${item.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="truncate text-sm text-stone-500">
                        {k === "message" ? item.notes.slice(0, 120) : [item.provider, item.amount].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {item.shareWithAll ? (
                        <Badge>Everyone</Badge>
                      ) : (
                        <Badge tone="amber">{item.recipientIds.map((id) => nameOf.get(id)).filter(Boolean).join(", ") || "Nobody"}</Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
