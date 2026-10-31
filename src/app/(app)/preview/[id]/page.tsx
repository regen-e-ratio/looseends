import { notFound } from "next/navigation";
import { RecipientVault } from "@/components/recipient-vault";
import { Alert, LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRecipient, itemsVisibleTo, listItems } from "@/lib/vault";

export const metadata = { title: "Preview" };

export default async function PreviewPage({ params }: PageProps<"/preview/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await getRecipient(user.id, id);
  if (!c) notFound();
  const items = itemsVisibleTo(await listItems(user.id), c.id);

  return (
    <div className="space-y-6">
      <Alert tone="info" className="no-print flex flex-wrap items-center justify-between gap-3">
        <span>
          👀 <strong>Preview.</strong> This is exactly what {c.name} will see if your vault is released.
        </span>
        <LinkButton href={`/contacts/${c.id}`} variant="secondary">Edit contact</LinkButton>
      </Alert>
      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-100/50 p-4 sm:p-8">
        <RecipientVault
          ownerName={user.name || user.email}
          ownerEmail={user.email}
          recipientName={c.name}
          personalMessage={c.personalMessage}
          items={items}
          releasedAt={null}
        />
      </div>
    </div>
  );
}
