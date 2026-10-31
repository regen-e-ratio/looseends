"use client";

import { useActionState, useState } from "react";
import { saveSwitchAction, sendTestReminderAction } from "@/app/actions/settings";
import type { FormState } from "@/app/actions/vault";
import { GRACE_OPTIONS, INTERVAL_OPTIONS } from "@/lib/config";
import { SubmitButton } from "./submit-button";
import { Alert, Field, Select } from "./ui";

type S = FormState & { ok?: boolean };

export function SwitchForm({ enabled, interval, grace }: { enabled: boolean; interval: number; grace: number }) {
  const [state, action] = useActionState<S, FormData>(saveSwitchAction, {});
  const [testState, testAction] = useActionState<S, FormData>(sendTestReminderAction, {});
  const [on, setOn] = useState(enabled);
  const [iv, setIv] = useState(interval);
  const [gr, setGr] = useState(grace);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-5">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        {state.ok && <Alert tone="success">Saved. Your timer starts from today.</Alert>}
        <label className="flex items-start gap-3">
          <input type="checkbox" name="enabled" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
          <span>
            <span className="font-medium">Switch is {on ? "on" : "off"}</span>
            <span className="block text-sm text-stone-500">
              When on, your trusted contacts receive their information if you stop responding to check-ins.
            </span>
          </span>
        </label>
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
        <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
          Every <strong>{iv} days</strong> we email you a one-click check-in link. If you don&apos;t respond, we keep reminding you every
          few days for <strong>{gr} days</strong>. Only then is your information released. Signing in at any time also counts as a
          check-in.
        </p>
        <SubmitButton>Save switch settings</SubmitButton>
      </form>
      <form action={testAction} className="border-t border-stone-100 pt-4">
        {testState.error && <Alert tone="danger" className="mb-3">{testState.error}</Alert>}
        {testState.ok && <Alert tone="success" className="mb-3">Test reminder sent — check your inbox (and spam folder).</Alert>}
        <SubmitButton variant="secondary" pendingText="Sending…">Send me a test reminder email</SubmitButton>
      </form>
    </div>
  );
}
