import Link from "next/link";
import type { User } from "@/db/schema";
import { checkInAction, resetAfterReleaseAction } from "@/app/actions/settings";
import { isClaimPending, nextCheckInDue, releaseDate } from "@/lib/switch";
import { accessLevel } from "@/lib/billing-rules";
import { PLAN } from "@/lib/config";
import { SubmitButton } from "./submit-button";
import { cx, daysUntil, formatDate, LinkButton } from "./ui";

export function SwitchStatus({ user, recipientCount, claimantName }: { user: User; recipientCount: number; claimantName?: string | null }) {
  if (user.switchStatus === "triggered") {
    return (
      <Panel tone="red" title="Your vault has been released" icon="🔓">
        <p>
          On {formatDate(user.triggeredAt ?? new Date())} your trusted contacts received a link to the information you shared with them.
          If this was a mistake, revoke their access now — their links will stop working immediately.
        </p>
        <form action={resetAfterReleaseAction} className="mt-4">
          <SubmitButton variant="danger" pendingText="Revoking…" confirm="Revoke all access links and restart your check-in timer?">
            I&apos;m OK — revoke access &amp; restart
          </SubmitButton>
        </form>
      </Panel>
    );
  }

  if (!user.switchEnabled && recipientCount > 0 && accessLevel(user) !== "member") {
    return (
      <Panel tone="amber" title="Your vault is ready — activate your release switch" icon="⏸️">
        <p>
          Everything is written down, but nothing will reach your people until the switch is on. Activating it is{" "}
          {PLAN.eur} a {PLAN.period} ({PLAN.usd} in the US).
        </p>
        <div className="mt-4">
          {/* A full page load: the subscribe page needs its own Content-Security-Policy for Paddle. */}
          <a href="/subscribe" className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800">
            Activate my switch
          </a>
        </div>
      </Panel>
    );
  }

  if (!user.switchEnabled) {
    return (
      <Panel tone="amber" title="Your switch is off" icon="⏸️">
        <p>
          Nothing will be sent to anyone while the switch is off.{" "}
          {recipientCount === 0
            ? "Add at least one trusted contact, then turn it on."
            : "Turn it on so your contacts receive your information if you stop checking in."}
        </p>
        <div className="mt-4">
          <LinkButton href={recipientCount === 0 ? "/contacts/new" : "/settings"} variant="secondary">
            {recipientCount === 0 ? "Add a trusted contact" : "Turn on the switch"}
          </LinkButton>
        </div>
      </Panel>
    );
  }

  if (user.switchMode === "claim") {
    if (isClaimPending(user)) {
      const release = releaseDate(user);
      return (
        <Panel tone="red" title={`${claimantName ?? "A trusted contact"} requested access to your vault`} icon="🔔">
          <p>
            They asked on {formatDate(user.warningStartedAt ?? new Date())}, which usually means they believe something has happened to you. Unless you
            reject it, your vault will be released to your {recipientCount} contact{recipientCount === 1 ? "" : "s"} on{" "}
            <strong>{formatDate(release)}</strong> ({Math.max(0, daysUntil(release))} days). Opening the app does not cancel it.
          </p>
          <form action={checkInAction} className="mt-4">
            <SubmitButton variant="danger" pendingText="Rejecting…">
              I&apos;m OK — reject this request
            </SubmitButton>
          </form>
        </Panel>
      );
    }
    return (
      <Panel tone="green" title="Your contacts can request access" icon="🤝">
        <p>
          No check-in emails. If something happens to you, any of your{" "}
          <Link href="/contacts" className="underline">
            {recipientCount} trusted contact{recipientCount === 1 ? "" : "s"}
          </Link>{" "}
          can request access with their personal link. You&apos;ll then have <strong>{user.gracePeriodDays} days</strong> to reject it before
          anything is released.
        </p>
      </Panel>
    );
  }

  const due = nextCheckInDue(user);
  if (user.switchStatus === "warning") {
    const release = releaseDate(user);
    return (
      <Panel tone="amber" title="We're waiting for your check-in" icon="⏳">
        <p>
          Your check-in was due on {formatDate(due)}. If you don&apos;t check in by <strong>{formatDate(release)}</strong> (
          {Math.max(0, daysUntil(release))} days), your vault will be released to {recipientCount} contact(s).
        </p>
        <CheckInButton />
      </Panel>
    );
  }

  const days = daysUntil(due);
  return (
    <Panel tone="green" title="Your switch is active" icon="🛡️">
      <p>
        Next check-in due <strong>{formatDate(due)}</strong> (in {days} day{days === 1 ? "" : "s"}). We&apos;ll email you a one-click
        link; opening the app also counts, so you&apos;re checked in right now. If you don&apos;t respond within {user.gracePeriodDays} days of reminders, your information goes to{" "}
        <Link href="/contacts" className="underline">
          {recipientCount} contact{recipientCount === 1 ? "" : "s"}
        </Link>
        .
      </p>
      <CheckInButton secondary />
    </Panel>
  );
}

function CheckInButton({ secondary }: { secondary?: boolean }) {
  return (
    <form action={checkInAction} className="mt-4">
      <SubmitButton variant={secondary ? "secondary" : "primary"} pendingText="Checking in…">
        I&apos;m OK — check in now
      </SubmitButton>
    </form>
  );
}

function Panel({ tone, title, icon, children }: { tone: "green" | "amber" | "red"; title: string; icon: string; children: React.ReactNode }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
  };
  return (
    <section className={cx("rounded-xl border p-5 sm:p-6", tones[tone])}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span>{icon}</span> {title}
      </h2>
      <div className="mt-2 text-sm leading-relaxed text-stone-700">{children}</div>
    </section>
  );
}
