import { DeleteAccountForm } from "@/components/delete-account-form";
import { NameForm } from "@/components/name-form";
import { SwitchForm } from "@/components/switch-form";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isClaimPending } from "@/lib/switch";
import { listRecipients } from "@/lib/vault";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const contacts = await listRecipients(user.id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Check-in & settings" />
      <Card>
        <h2 className="mb-4 text-lg font-semibold">🛡️ Release switch</h2>
        <SwitchForm
          enabled={user.switchEnabled}
          mode={user.switchMode}
          interval={user.checkInIntervalDays}
          grace={user.gracePeriodDays}
          contactCount={contacts.length}
          contactsWithoutLink={contacts.filter((c) => !c.claimLinkSentAt).length}
          claimPending={isClaimPending(user)}
        />
      </Card>
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Your profile</h2>
        <p className="mb-4 text-sm text-stone-500">Signed in as {user.email}. Your contacts will see your name in the email we send them.</p>
        <NameForm defaultValue={user.name ?? ""} />
      </Card>
      <Card className="border-red-200">
        <h2 className="mb-4 text-lg font-semibold text-red-800">Delete account</h2>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
