"use client";

import { useActionState } from "react";
import { saveNameAction } from "@/app/actions/settings";
import type { FormState } from "@/app/actions/vault";
import { SubmitButton } from "./submit-button";
import { Field, Input } from "./ui";

export function NameForm({ defaultValue, next, submitLabel = "Save" }: { defaultValue: string; next?: string; submitLabel?: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveNameAction, {});
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Your full name" htmlFor="name" hint={state.fieldErrors?.name?.[0]}>
        <Input id="name" name="name" defaultValue={defaultValue} required maxLength={120} autoComplete="name" placeholder="Jane Doe" />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
