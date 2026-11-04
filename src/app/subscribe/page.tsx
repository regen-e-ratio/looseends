import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui";
import { requireUser, startPage } from "@/lib/auth";
import { accessLevel, checkoutSettings } from "@/lib/billing";
import { PLAN } from "@/lib/config";
import { SubscribeCheckout } from "./subscribe-checkout";

export const metadata = { title: "Subscribe" };

/** The paywall: every account needs a subscription. Lapsed accounts renew here too. */
export default async function SubscribePage() {
  const user = await requireUser();
  const access = accessLevel(user);
  if (access === "member") redirect(startPage(user));
  const checkout = checkoutSettings();

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12">
      <Logo />
      <div className="mt-8 w-full max-w-md space-y-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{access === "frozen" ? "Your subscription has ended" : "Start your vault"}</h1>
          <p className="text-stone-600">
            {access === "frozen"
              ? "Your vault is safe and your release switch is still running, but you can't make changes. Renew to update your vault and contacts again."
              : "One plan with everything. Set it up once, keep it up to date when life changes."}
          </p>
        </div>

        <ul className="space-y-2 text-sm text-stone-700">
          {PLAN.includes.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-teal-700">✓</span>
              {line}
            </li>
          ))}
        </ul>

        {checkout ? (
          <SubscribeCheckout
            token={checkout.token}
            priceId={checkout.priceId}
            environment={checkout.environment}
            email={user.email}
            userId={user.id}
            renew={access === "frozen"}
            fallbackPrice={`${PLAN.eur} / ${PLAN.usd}`}
            period={PLAN.period}
          />
        ) : (
          <Alert tone="info">Subscriptions open very soon. We&apos;ll be ready for you shortly — please check back.</Alert>
        )}

        <div className="space-y-2 text-xs text-stone-500">
          <p>
            Cancel anytime. Not for you? Ask for a full refund within {PLAN.refundDays} days. If a payment ever fails after
            you&apos;re gone, your instructions are still delivered.
          </p>
          <p>
            Our order process is conducted by our online reseller Paddle.com, the merchant of record for all our orders. They
            handle payment, VAT and sales tax. See our <Link className="underline" href="/terms">terms</Link> and{" "}
            <Link className="underline" href="/refunds">refund policy</Link>.
          </p>
        </div>
      </div>
      <form action={logoutAction} className="mt-6 text-sm text-stone-500">
        Signed in as {user.email} ·{" "}
        <button className="underline hover:text-stone-700">Sign out</button>
      </form>
    </div>
  );
}
