import { PageHeader } from "@/components/ui";
import { VaultEditor } from "@/components/vault/vault-editor";
import { requireUser } from "@/lib/auth";
import { listItems, listRecipients } from "@/lib/vault";

export const metadata = { title: "My vault" };

/** See, add and edit everything in the vault on one page (selection is kept in ?item= / ?new=). */
export default async function VaultPage() {
  const user = await requireUser();
  const [items, contacts] = await Promise.all([listItems(user.id), listRecipients(user.id)]);
  return (
    <div>
      <PageHeader title="My vault" description="Everything you've written down for your people." />
      <VaultEditor items={items} contacts={contacts.map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}
