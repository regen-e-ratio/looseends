import Link from "next/link";
import { Alert, Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { itemsVisibleTo, listItems, listRecipients } from "@/lib/vault";

export const metadata = { title: "Trusted contacts" };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const user = await requireUser();
  const [contacts, items, sp] = await Promise.all([listRecipients(user.id), listItems(user.id), searchParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trusted contacts"
        description="The people who receive your information if you stop checking in. Each gets a private link to only what you shared with them."
        actions={<LinkButton href="/contacts/new">+ Add contact</LinkButton>}
      />
      {sp.saved && <Alert tone="success">Contact saved.</Alert>}
      {sp.notifyFailed && <Alert tone="warning">The contact was saved, but we couldn&apos;t send them the notification email.</Alert>}

      {contacts.length === 0 ? (
        <Card className="text-center">
          <p className="text-3xl">👥</p>
          <p className="mt-2 font-medium">No trusted contacts yet</p>
          <p className="mt-1 text-sm text-stone-600">Add the person (or people) who should be told what to take care of.</p>
          <LinkButton href="/contacts/new" className="mt-4">Add your first contact</LinkButton>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contacts.map((c) => {
            const count = itemsVisibleTo(items, c.id).length;
            return (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{c.name}</h2>
                    <p className="truncate text-sm text-stone-500">
                      {c.email}
                      {c.relationship && ` · ${c.relationship}`}
                    </p>
                  </div>
                  {c.releasedAt ? <Badge tone="red">Released</Badge> : c.notifiedAt ? <Badge tone="green">Notified</Badge> : null}
                </div>
                <p className="mt-3 text-sm text-stone-600">
                  Will receive <strong>{count}</strong> item{count === 1 ? "" : "s"}
                  {c.personalMessage ? " and a personal message" : ""}.
                </p>
                <div className="mt-4 flex gap-2 text-sm">
                  <Link href={`/contacts/${c.id}`} className="rounded-md border border-stone-300 px-3 py-1.5 font-medium hover:bg-stone-50">
                    Edit
                  </Link>
                  <Link href={`/preview/${c.id}`} className="rounded-md px-3 py-1.5 font-medium text-teal-800 hover:bg-teal-50">
                    Preview what they&apos;ll see
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
