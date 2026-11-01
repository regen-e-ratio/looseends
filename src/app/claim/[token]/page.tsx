import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, formatDate } from "@/components/ui";
import { getClaimView, startClaim } from "@/lib/switch";

export const metadata = { title: "Request access", robots: { index: false, follow: false } };

async function requestAccessAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  await startClaim(token);
  redirect(`/claim/${encodeURIComponent(token)}`);
}

/**
 * A trusted contact's personal link (claim mode). Opening it changes nothing; requesting access is a
 * deliberate button press, so email scanners that open links can't start a claim.
 */
export default async function ClaimPage({ params }: PageProps<"/claim/[token]">) {
  const { token } = await params;
  const view = await getClaimView(token);

  if (view.state === "invalid") {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-stone-600">It may have been replaced by a newer link, or mistyped. Please use the most recent email you received.</p>
      </AuthShell>
    );
  }
  if (view.state === "inactive") {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold">This link is not active</h1>
        <p className="mt-2 text-stone-600">{view.ownerName} has changed their settings, so access can&apos;t be requested with this link right now.</p>
      </AuthShell>
    );
  }
  if (view.state === "released") {
    return (
      <AuthShell>
        <h1 className="text-xl font-semibold">The information has been released</h1>
        <p className="mt-2 text-stone-600">
          {view.ownerName}&apos;s trusted contacts were sent their private links by email. Please check your inbox (and spam folder).
        </p>
      </AuthShell>
    );
  }
  if (view.state === "pending") {
    return (
      <AuthShell>
        <div className="space-y-3">
          <h1 className="text-xl font-semibold">{view.byYou ? "Your request has been sent" : "A request is already open"}</h1>
          <p className="text-stone-600">
            {view.byYou ? "We've" : "Another trusted contact has requested access, and we've"} let {view.ownerName} know. If they don&apos;t respond by{" "}
            <strong>{formatDate(view.releaseDate)}</strong>, the information they left will be emailed to you and their other trusted contacts.
          </p>
          <p className="text-sm text-stone-500">You don&apos;t need to do anything else. You can close this page.</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form action={requestAccessAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <p className="text-sm text-stone-500">For {view.recipientName}</p>
        <h1 className="text-xl font-semibold">Request access to {view.ownerName}&apos;s information</h1>
        <p className="text-stone-600">
          Use this if you believe something has happened to {view.ownerName}. We&apos;ll notify them right away. If they don&apos;t respond within{" "}
          <strong>{view.waitDays} days</strong>, the information they left is emailed to you and their other trusted contacts.
        </p>
        <Alert tone="info">If {view.ownerName} is fine, they can reject the request and you&apos;ll be told. Nothing is shared until the waiting period ends.</Alert>
        <SubmitButton className="w-full" pendingText="Sending request…">
          Request access
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
