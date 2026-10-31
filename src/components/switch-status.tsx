import Link from "next/link";
import type { User } from "@/db/schema";
import { checkInAction, resetAfterReleaseAction } from "@/app/actions/settings";
import { nextCheckInDue, releaseDate } from "@/lib/switch";
import { SubmitButton } from "./submit-button";
import { cx, daysUntil, formatDate, LinkButton } from "./ui";

export function SwitchStatus({ user, recipientCount }: { user: User; recipientCount: number }) {
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
        link; signing in also counts. If you don&apos;t respond within {user.gracePeriodDays} days of reminders, your information goes to{" "}
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
