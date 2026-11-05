import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Operator } from "@/components/legal-page";
import { PLAN } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of service", robots: { index: true, follow: true } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms apply when you use Loose Ends. Please read them: they explain what we do, what we can&apos;t promise, and how
        payment works. <Operator />
      </p>

      <h2>What Loose Ends does</h2>
      <p>
        Loose Ends is a private, encrypted place to write down your accounts, subscriptions, wishes and messages, and to choose
        trusted contacts who should receive them. You choose how a release is started: by missing check-ins (we email you
        regularly and remind you during a grace period before anything is sent), or by a contact asking for access (you can
        reject the request during a grace period). When a release happens, each contact receives a private link to what you
        chose to share with them.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 18 years old.</li>
        <li>You sign in with links sent to your email address, so keep your email account secure.</li>
        <li>You are responsible for what you write, and for keeping it up to date.</li>
        <li>Never store passwords, PINs, seed phrases or private keys. Write where things are, not the secrets themselves.</li>
        <li>Only add people as contacts if you are happy for them to receive the information you share with them.</li>
      </ul>

      <h2>Subscription and payment</h2>
      <p>
        Creating an account, writing your vault and adding contacts are free. Turning on the release switch needs a
        subscription. Loose Ends has one plan, billed yearly in advance. The current price is shown on our website and at checkout:{" "}
        {PLAN.eur} a year in the EU, including VAT, and {PLAN.usd} a year in the US, plus applicable sales tax. Prices in other
        currencies are shown at checkout.
      </p>
      <p>
        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our
        orders. Paddle provides all customer service inquiries and handles returns.
      </p>
      <ul>
        <li>Your subscription renews automatically each year until you cancel it.</li>
        <li>
          You can cancel at any time from Settings → Manage subscription. Your subscription runs until the end of the period
          you paid for.
        </li>
        <li>If we change the price, we will tell you by email at least 30 days before your next renewal.</li>
        <li>
          Refunds are covered by our <Link href="/refunds">refund policy</Link>.
        </li>
      </ul>

      <h2>If your subscription ends</h2>
      <p>
        If your subscription ends or a payment fails for good, a release switch that is on keeps running with the settings you
        had, so your instructions still reach your contacts if something happens to you. You can still edit your vault, turn the
        switch off or delete your account at any time, but turning the switch back on needs an active subscription. We never
        charge your contacts anything.
      </p>

      <h2>What we can&apos;t promise</h2>
      <ul>
        <li>
          We work hard to deliver every reminder and release, but email can fail, and contacts change their addresses. We
          can&apos;t guarantee that a message will be received.
        </li>
        <li>
          A release can happen while you are alive, for example if you ignore every reminder or don&apos;t reject a claim in
          time. You can undo it with one click, which stops every link from working.
        </li>
        <li>
          Loose Ends is not a will, and it does not replace legal, tax or financial advice. Whether your contacts can access an
          account depends on the rules of each bank or provider.
        </li>
        <li>We are not responsible for what your contacts do with the information you share with them.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use Loose Ends for anything illegal, to harass anyone, or to send anyone unwanted email. We may suspend
        accounts that do, after telling you why where we can.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time in Settings. This cancels your subscription immediately and permanently deletes
        your vault and contacts. If we ever decide to close Loose Ends, we will tell you by email at least 60 days in advance and
        refund any unused part of your subscription.
      </p>

      <h2>Liability</h2>
      <p>
        We provide Loose Ends with reasonable care and skill. Nothing in these terms limits your rights as a consumer under the
        law of the country where you live, or our liability where the law does not allow it to be limited. Otherwise, our total
        liability to you is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If we change these terms in a way that matters, we will email you at least 30 days before the change takes effect. If you
        don&apos;t agree, you can cancel and ask for a refund of the unused part of your subscription.
      </p>
    </LegalPage>
  );
}
