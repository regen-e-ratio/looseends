import type { Metadata } from "next";
import { LegalPage, Operator } from "@/components/legal-page";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy notice", robots: { index: true, follow: true } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice">
      <p>
        Loose Ends holds some of the most private information you have, so we collect as little as we can and never sell or
        share it for advertising. This notice explains what we collect, why, and your rights. <Operator /> We are the
        controller of your personal data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, your name if you give it, and your settings (check-in schedule,
          release mode, and when you last checked in).
        </li>
        <li>
          <strong>Your vault:</strong> what you write about your accounts, subscriptions, wishes and messages. It is encrypted
          before it is stored.
        </li>
        <li>
          <strong>Your trusted contacts:</strong> their names and email addresses, and any personal message you write to them
          (encrypted).
        </li>
        <li>
          <strong>Subscription:</strong> your subscription status and Paddle&apos;s customer and subscription IDs. We never see
          or store your card details: Paddle does.
        </li>
        <li>
          <strong>Security data:</strong> sign-in links and session records, and a one-way hash of your IP address used to
          stop abuse (we never store the IP address itself).
        </li>
        <li>
          <strong>How you found us:</strong> the page or ad campaign you signed up from.
        </li>
        <li>
          <strong>Usage statistics:</strong> anonymous page-view counts, without cookies. Private links are removed from what we
          measure.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To provide the service you subscribed to: storing your vault, sending reminders, and releasing it as you chose (our contract with you).</li>
        <li>To keep the service secure and prevent abuse, and to understand which pages and campaigns work (our legitimate interests).</li>
        <li>To keep records the law requires, such as tax records, which Paddle keeps as merchant of record (legal obligation).</li>
      </ul>

      <h2>Your contacts</h2>
      <p>
        We use your contacts&apos; names and email addresses only to contact them about your vault: to let them know you added
        them (if you choose to), to send them their personal link in claim mode, and to deliver what you shared with them. They
        can ask us to stop at any time.
      </p>

      <h2>Who processes your data for us</h2>
      <ul>
        <li><strong>Vercel</strong>: hosting and anonymous usage statistics.</li>
        <li><strong>Neon</strong>: our database.</li>
        <li><strong>Resend</strong>: sending email.</li>
        <li>
          <strong>Paddle</strong>: payments, as our merchant of record. Paddle handles your payment details under its own
          privacy notice.
        </li>
      </ul>
      <p>
        Some of these companies are based in the United States. Where your data leaves the European Economic Area, it is
        protected by the European Commission&apos;s standard contractual clauses or the EU–US Data Privacy Framework.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while you have an account. When you delete your account, your vault, contacts and account data are
        deleted immediately, and disappear from database backups within 30 days. Sign-in links and abuse counters are deleted
        within a few days. Paddle keeps payment records for as long as tax law requires.
      </p>

      <h2>Cookies</h2>
      <p>We use one essential cookie to keep you signed in. We use no advertising or tracking cookies.</p>

      <h2>Security</h2>
      <p>
        Your vault and personal messages are encrypted with AES-256 before they are stored. Each contact can only open what you
        shared with them, through a private link. We never ask for passwords, PINs or seed phrases.
      </p>

      <h2>Your rights</h2>
      <p>
        You can see, correct or delete your data at any time in the app. You can also ask us for a copy of your data, or object
        to how we use it, by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. If you live in
        the EU or UK, you can also complain to your data protection authority. If you live in the US: we do not sell or share
        your personal information.
      </p>
    </LegalPage>
  );
}
