import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PLAN, SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Refund policy", robots: { index: true, follow: true } };

export default function RefundsPage() {
  return (
    <LegalPage title="Refund policy">
      <h2>{PLAN.refundDays}-day money-back guarantee</h2>
      <p>
        If Loose Ends isn&apos;t right for you, you can ask for a full refund within {PLAN.refundDays} days of any payment: your
        first payment or a yearly renewal. No questions asked.
      </p>
      <h2>How to ask for a refund</h2>
      <p>
        Email us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address you use to sign in, or reply to
        the receipt you received from Paddle. Paddle.com, our merchant of record, processes refunds to your original payment
        method. Refunds usually arrive within 5–10 business days, depending on your bank.
      </p>
      <h2>After {PLAN.refundDays} days</h2>
      <p>
        You can cancel at any time from Settings → Manage subscription, and you won&apos;t be charged again. Your subscription
        runs until the end of the period you paid for. Payments older than {PLAN.refundDays} days are not refunded, except where the
        law requires it or our terms promise it (for example, if we close the service).
      </p>
      <h2>What happens after a refund</h2>
      <p>
        Your subscription ends. A release switch that is on keeps running unless you turn it off or delete your account; turning
        it back on needs a new subscription.
      </p>
    </LegalPage>
  );
}
