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

/** Activating the release switch: the only thing a subscription is needed for. Lapsed accounts renew here too. */
export default async function SubscribePage({ searchParams }: PageProps<"/subscribe">) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const access = accessLevel(user);
  if (access === "member") redirect(startPage(user));
  const checkout = checkoutSettings();

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12">
      <Logo />
      <div className="mt-8 w-full max-w-md space-y-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            {access === "frozen" ? "Renew your subscription" : sp.welcome ? "Your vault is ready" : "Activate your release switch"}
          </h1>
          <p className="text-stone-600">
            {access === "frozen"
              ? "Renew to turn your release switch back on and keep it running."
              : "Writing your vault is free. Subscribe to switch it on, so it reaches your people if something happens to you. Your switch turns on as soon as you've paid, with the settings you chose."}
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
      <Link href={user.onboardedAt ? "/dashboard" : "/onboarding"} className="mt-6 text-sm font-medium text-teal-800 hover:underline">
        Not now — back to my vault
      </Link>
      <form action={logoutAction} className="mt-3 text-sm text-stone-500">
        Signed in as {user.email} ·{" "}
        <button className="underline hover:text-stone-700">Sign out</button>
      </form>
    </div>
  );
}
