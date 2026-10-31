"use client";

import { useActionState } from "react";
import { requestLoginAction, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(requestLoginAction, {});

  if (state.sentTo) {
    return (
      <div className="space-y-3 text-center">
        <div className="text-4xl">📬</div>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-stone-600">
          We sent a sign-in link to <strong>{state.sentTo}</strong>. It expires in 20 minutes.
        </p>
        <p className="text-sm text-stone-500">Can&apos;t find it? Check your spam folder, or reload this page to try again.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Sign in or create your vault</h1>
        <p className="mt-1 text-sm text-stone-600">No password needed — we&apos;ll email you a secure sign-in link.</p>
      </div>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Email address" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus placeholder="you@example.com" />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">Email me a sign-in link</SubmitButton>
    </form>
  );
}
