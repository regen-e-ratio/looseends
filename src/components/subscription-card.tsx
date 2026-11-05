import { openBillingPortalAction } from "@/app/actions/billing";
import type { User } from "@/db/schema";
import { accessLevel } from "@/lib/billing-rules";
import { PLAN } from "@/lib/config";
import { SubmitButton } from "./submit-button";
import { Alert, Badge, Card, formatDate } from "./ui";

/** Subscription status on the settings page, with Paddle's portal for invoices, payment method and cancelling. */
export function SubscriptionCard({ user, portalUnavailable }: { user: User; portalUnavailable?: boolean }) {
  const access = accessLevel(user);
  const ends = user.billingCancelsAt ?? user.billingPeriodEndsAt;
  let badge = <Badge tone="green">Active</Badge>;
  let text = user.billingPeriodEndsAt ? `Renews on ${formatDate(user.billingPeriodEndsAt)}.` : "Your subscription is active.";
  if (user.billingStatus === "trialing") {
    badge = <Badge tone="green">Trial</Badge>;
    text = user.billingPeriodEndsAt ? `Your first payment is on ${formatDate(user.billingPeriodEndsAt)}.` : "Your trial is running.";
  }
  if (user.billingStatus === "past_due") {
    badge = <Badge tone="amber">Payment failed</Badge>;
    text = "We couldn't take your last payment and will try again. Please check your payment method.";
  }
  if (access === "member" && user.billingCancelsAt) {
    badge = <Badge tone="amber">Cancelled</Badge>;
    text = `Your subscription ends on ${formatDate(user.billingCancelsAt)}. After that your release switch keeps running, but you can't turn it back on once it's off.`;
  }
  if (access === "frozen") {
    badge = <Badge tone="red">Ended</Badge>;
    text = `Your subscription ended${ends ? ` on ${formatDate(ends)}` : ""}. ${
      user.switchEnabled ? "Your release switch keeps running, but you'll need to renew to turn it back on if you turn it off." : "Renew to turn your release switch on."
    }`;
  }
  if (access === "none") {
    badge = <Badge tone="neutral">Not subscribed</Badge>;
    text = `Writing your vault and adding contacts is free. Turning on the release switch, which sends it to your people, is ${PLAN.eur} a ${PLAN.period} (${PLAN.usd} in the US).`;
  }

  return (
    <Card>
      <div className="mb-2 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Subscription</h2>
        {badge}
      </div>
      <p className="text-sm text-stone-600">{text}</p>
      {portalUnavailable && (
        <Alert tone="warning" className="mt-3">
          The billing page is unavailable right now. Please try again in a few minutes.
        </Alert>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {access !== "member" && (
          // A full page load: the subscribe page needs its own Content-Security-Policy for Paddle.
          <a href="/subscribe" className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800">
            {access === "none" ? "Subscribe" : "Renew"}
          </a>
        )}
        {user.billingCustomerId && (
          <form action={openBillingPortalAction}>
            <SubmitButton variant="secondary" pendingText="Opening…">
              {access === "frozen" ? "Invoices" : "Manage subscription"}
            </SubmitButton>
          </form>
        )}
      </div>
      {access === "member" && (
        <p className="mt-3 text-xs text-stone-500">Change your payment method, download invoices or cancel. Billing is handled by Paddle.</p>
      )}
    </Card>
  );
}
