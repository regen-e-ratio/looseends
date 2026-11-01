"use client";

import { useActionState, useState, useTransition } from "react";
import { saveSwitchAction, sendTestReminderAction, type SwitchFormState } from "@/app/actions/settings";
import { GRACE_OPTIONS, INTERVAL_OPTIONS } from "@/lib/config";
import { SubmitButton } from "./submit-button";
import { Alert, Button, Field, Select, cx } from "./ui";

type Mode = "checkin" | "claim";

export function SwitchForm({
  enabled,
  mode: initialMode,
  interval,
  grace,
  contactCount,
  contactsWithoutLink,
  claimPending,
}: {
  enabled: boolean;
  mode: Mode;
  interval: number;
  grace: number;
  contactCount: number;
  contactsWithoutLink: number;
  claimPending: boolean;
}) {
  const [state, action, saving] = useActionState<SwitchFormState, FormData>(saveSwitchAction, {});
  const [, startTransition] = useTransition();
  const [testState, testAction] = useActionState<SwitchFormState, FormData>(sendTestReminderAction, {});
  const [on, setOn] = useState(enabled);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [iv, setIv] = useState(interval);
  const [gr, setGr] = useState(grace);

  const willInvite = on && mode === "claim" ? (initialMode === "claim" && enabled ? contactsWithoutLink : contactCount) : 0;
  const willRejectClaim = claimPending && (mode !== "claim" || !on);

  return (
    <div className="space-y-4">
      {/* Submitted via a transition (not the form's action prop) so React doesn't reset the controlled fields after saving. */}
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
      >
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.ok && <Alert tone="success">{state.message ?? "Saved."}</Alert>}

        <label className="flex items-start gap-3">
          <input type="checkbox" name="enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
          <span>
            <span className="font-medium">Switch is {on ? "on" : "off"}</span>
            <span className="block text-sm text-stone-500">When it&apos;s off, nothing is ever sent to your trusted contacts.</span>
          </span>
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-stone-700">How should we know something has happened?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              value="checkin"
              current={mode}
              onSelect={setMode}
              title="Email check-ins"
              body="We email you a one-click check-in every few weeks. If you stop answering, we remind you, then release."
            />
            <ModeCard
              value="claim"
              current={mode}
              onSelect={setMode}
              title="Trusted contacts claim"
              body="No emails to you. Your contacts get a personal link to request access if something happens. You get time to say no."
            />
          </div>
        </fieldset>

        {mode === "checkin" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ask me to check in every" htmlFor="interval">
              <Select id="interval" name="interval" value={iv} onChange={(e) => setIv(Number(e.target.value))}>
                {INTERVAL_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="If I don't respond, release after" htmlFor="grace">
              <Select id="grace" name="grace" value={gr} onChange={(e) => setGr(Number(e.target.value))}>
                {GRACE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} more days of reminders
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="interval" value={iv} />
            <Field label="Time I have to reject a request" htmlFor="grace">
              <Select id="grace" name="grace" value={gr} onChange={(e) => setGr(Number(e.target.value))}>
                {GRACE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
          {mode === "checkin" ? (
            <>
              Every <strong>{iv} days</strong> we email you a one-click check-in link. If you don&apos;t respond, we keep reminding you every
              few days for <strong>{gr} days</strong>. Only then is your information released. Signing in or opening {""}
              the app at any time also counts as a check-in.
            </>
          ) : (
            <>
              We never email you on a schedule. When a trusted contact requests access, we email you right away and keep reminding you.
              If you don&apos;t reject the request within <strong>{gr} days</strong>, your information is released to your trusted contacts.
              Only one request can be open at a time.
            </>
          )}
        </p>

        {willInvite > 0 && (
          <Alert tone="info">
            Saving will email {willInvite} contact{willInvite === 1 ? "" : "s"} their personal link to request access.
          </Alert>
        )}
        {willRejectClaim && <Alert tone="warning">Saving will reject the pending access request and tell the contact you&apos;re OK.</Alert>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save switch settings"}
        </Button>
      </form>

      {mode === "checkin" && initialMode === "checkin" && (
        <form action={testAction} className="border-t border-stone-100 pt-4">
          {testState.error && <Alert tone="danger" className="mb-3">{testState.error}</Alert>}
          {testState.ok && <Alert tone="success" className="mb-3">Test reminder sent — check your inbox (and spam folder).</Alert>}
          <SubmitButton variant="secondary" pendingText="Sending…">Send me a test reminder email</SubmitButton>
        </form>
      )}
    </div>
  );
}

function ModeCard({ value, current, onSelect, title, body }: { value: Mode; current: Mode; onSelect: (m: Mode) => void; title: string; body: string }) {
  const selected = value === current;
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
        selected ? "border-teal-700 bg-teal-50/60 ring-1 ring-teal-700" : "border-stone-200 hover:border-stone-300",
      )}
    >
      <input type="radio" name="mode" value={value} checked={selected} onChange={() => onSelect(value)} className="mt-1 accent-teal-700" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm text-stone-600">{body}</span>
      </span>
    </label>
  );
}
