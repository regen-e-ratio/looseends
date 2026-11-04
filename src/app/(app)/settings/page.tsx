import { DeleteAccountForm } from "@/components/delete-account-form";
import { NameForm } from "@/components/name-form";
import { SubscriptionCard } from "@/components/subscription-card";
import { SwitchForm } from "@/components/switch-form";
import { Card, PageHeader } from "@/components/ui";
import { turnOffSwitchAction } from "@/app/actions/settings";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { accessLevel } from "@/lib/billing";
import { isClaimPending } from "@/lib/switch";
import { listRecipients } from "@/lib/vault";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await requireUser();
  const [contacts, sp] = await Promise.all([listRecipients(user.id), searchParams]);
  const member = accessLevel(user) === "member";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Check-in & settings" />
      {sp.switchOff && <Alert tone="success">Your release switch is off. Nothing will be sent to anyone.</Alert>}
      {!member ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">🛡️ Release switch</h2>
          <p className="text-sm text-stone-600">
            {user.switchEnabled
              ? `On — ${user.switchMode === "claim" ? `your contacts can claim your vault; you have ${user.gracePeriodDays} days to reject a claim` : `check-in every ${user.checkInIntervalDays} days, then ${user.gracePeriodDays} days of reminders`}. It keeps running while your subscription is inactive, so your people are never left without your instructions.`
              : "Off. Nothing will be sent to anyone."}{" "}
            Renew your subscription to change these settings.
          </p>
          {user.switchEnabled && (
            <form action={turnOffSwitchAction} className="mt-4">
              <SubmitButton variant="secondary" pendingText="Turning off…" confirm="Turn off your release switch? Nothing will be sent to your contacts.">
                Turn off the switch
              </SubmitButton>
            </form>
          )}
        </Card>
      ) : (
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
      )}
      <SubscriptionCard user={user} portalUnavailable={sp.billing === "unavailable"} />
      {member && (
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Your profile</h2>
        <p className="mb-4 text-sm text-stone-500">Signed in as {user.email}. Your contacts will see your name in the email we send them.</p>
        <NameForm defaultValue={user.name ?? ""} />
      </Card>
      )}
      <Card className="border-red-200">
        <h2 className="mb-4 text-lg font-semibold text-red-800">Delete account</h2>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
