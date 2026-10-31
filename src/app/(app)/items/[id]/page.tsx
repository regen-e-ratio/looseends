import { notFound } from "next/navigation";
import { deleteItemAction } from "@/app/actions/vault";
import { ItemForm } from "@/components/item-form";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ITEM_KINDS } from "@/lib/items";
import { getItem, listRecipients } from "@/lib/vault";

export const metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: PageProps<"/items/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [item, contacts] = await Promise.all([getItem(user.id, id), listRecipients(user.id)]);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={`${ITEM_KINDS[item.kind].icon} ${item.title}`}
        description={`Edit ${ITEM_KINDS[item.kind].label.toLowerCase()}`}
        actions={
          <form action={deleteItemAction}>
            <input type="hidden" name="id" value={item.id} />
            <SubmitButton variant="ghost" className="text-red-700" pendingText="Deleting…" confirm="Delete this item permanently?">
              Delete
            </SubmitButton>
          </form>
        }
      />
      <ItemForm
        kind={item.kind}
        contacts={contacts.map(({ id, name, relationship }) => ({ id, name, relationship }))}
        initial={{
          id: item.id,
          values: { title: item.title, provider: item.provider, reference: item.reference, amount: item.amount, contact: item.contact, notes: item.notes },
          shareWithAll: item.shareWithAll,
          recipientIds: item.recipientIds,
        }}
      />
    </div>
  );
}
