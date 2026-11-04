import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/ui";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Add contact" };

export default async function NewContactPage() {
  const user = await requireMember();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add a trusted contact" description="Someone you trust to handle your affairs — a partner, family member, friend or executor." />
      <ContactForm claimMode={user.switchEnabled && user.switchMode === "claim"} />
    </div>
  );
}
