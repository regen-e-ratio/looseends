import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContactAction } from "@/app/actions/contacts";
import { ContactForm } from "@/components/contact-form";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getRecipient } from "@/lib/vault";

export const metadata = { title: "Edit contact" };

export default async function EditContactPage({ params }: PageProps<"/contacts/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await getRecipient(user.id, id);
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={c.name}
        description={
          <Link href={`/preview/${c.id}`} className="text-teal-800 underline">
            Preview what {c.name.split(" ")[0]} will see
          </Link>
        }
        actions={
          <form action={deleteContactAction}>
            <input type="hidden" name="id" value={c.id} />
            <SubmitButton variant="ghost" className="text-red-700" pendingText="Removing…" confirm={`Remove ${c.name} as a trusted contact?`}>
              Remove
            </SubmitButton>
          </form>
        }
      />
      <ContactForm initial={{ id: c.id, name: c.name, email: c.email, personalMessage: c.personalMessage }} />
    </div>
  );
}
