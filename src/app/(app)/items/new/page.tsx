import Link from "next/link";
import { ItemForm } from "@/components/item-form";
import { PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ITEM_KINDS, KIND_ORDER, isKind } from "@/lib/items";
import { listRecipients } from "@/lib/vault";

export const metadata = { title: "Add item" };

export default async function NewItemPage({ searchParams }: PageProps<"/items/new">) {
  const user = await requireUser();
  const { kind: k } = await searchParams;
  const kind = isKind(k) ? k : "subscription";
  const contacts = await listRecipients(user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Add ${ITEM_KINDS[kind].label.toLowerCase()}`} description={ITEM_KINDS[kind].hint} />
      <div className="mb-6 flex flex-wrap gap-2">
        {KIND_ORDER.map((other) => (
          <Link
            key={other}
            href={`/items/new?kind=${other}`}
            className={cx(
              "rounded-full border px-3 py-1 text-sm",
              other === kind ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
            )}
          >
            {ITEM_KINDS[other].icon} {ITEM_KINDS[other].label}
          </Link>
        ))}
      </div>
      <ItemForm key={kind} kind={kind} contacts={contacts.map(({ id, name }) => ({ id, name }))} />
    </div>
  );
}
