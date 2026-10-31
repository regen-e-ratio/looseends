"use client";

import { useActionState } from "react";
import { deleteAccountAction } from "@/app/actions/settings";
import type { FormState } from "@/app/actions/vault";
import { SubmitButton } from "./submit-button";
import { Alert, Field, Input } from "./ui";

export function DeleteAccountForm() {
  const [state, action] = useActionState<FormState, FormData>(deleteAccountAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label='Type "DELETE" to permanently delete your account, vault and contacts' htmlFor="confirm">
        <Input id="confirm" name="confirm" autoComplete="off" className="max-w-xs" />
      </Field>
      <SubmitButton variant="danger" pendingText="Deleting…">Delete my account</SubmitButton>
    </form>
  );
}
