import Link from "next/link";
import { SwitchStatus } from "@/components/switch-status";
import { Alert, Badge, Card, LinkButton, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ITEM_KINDS, KIND_ORDER } from "@/lib/items";
import { listItems, listRecipients } from "@/lib/vault";

export const metadata = { title: "Home" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const [items, contacts, sp] = await Promise.all([listItems(user.id), listRecipients(user.id), searchParams]);
  const nameOf = new Map(contacts.map((c) => [c.id, c.name]));

  const steps = [
    { done: items.length > 0, label: "Add your first item", href: "/vault?new=subscription" },
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

      {sp.welcome && <Alert tone="success">You&apos;re all set. Add more to your vault whenever something comes to mind.</Alert>}
      {sp.saved && <Alert tone="success">Saved.</Alert>}
      {sp.activated && <Alert tone="success">Thank you! Your release switch is on.</Alert>}
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Your vault <span className="font-normal text-stone-400">({items.length})</span>
          </h2>
          <LinkButton href="/vault" variant="secondary" className="py-1.5">
            {items.length ? "Open vault" : "+ Add"}
          </LinkButton>
        </div>
        {items.length === 0 ? (
          <Card className="text-sm text-stone-600">
            Start with what would be hardest to discover: subscriptions that keep charging, accounts nobody knows about, and a message
            to the people you love.{" "}
            <Link href="/vault?new=subscription" className="font-medium text-teal-800 hover:underline">
              Add your first item →
            </Link>
          </Card>
        ) : (
          <div className="columns-1 gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:columns-2">
            {KIND_ORDER.map((k) => {
              const group = items.filter((i) => i.kind === k);
              if (!group.length) return null;
              return (
                <div key={k} className="mb-3 break-inside-avoid">
                  <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-stone-400">
                    {ITEM_KINDS[k].icon} {ITEM_KINDS[k].plural} ({group.length})
                  </p>
                  <ul>
                    {group.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/vault?item=${item.id}`}
                          className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-stone-50"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{item.title}</span>
                            {item.reference && <span className="text-stone-500"> · {item.reference}</span>}
                          </span>
                          {!item.shareWithAll && (
                            <Badge tone="amber">{item.recipientIds.map((id) => nameOf.get(id)).filter(Boolean).join(", ") || "Nobody"}</Badge>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
