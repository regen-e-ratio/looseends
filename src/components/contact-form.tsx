"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveContactAction } from "@/app/actions/contacts";
import type { FormState } from "@/app/actions/vault";
import { SubmitButton } from "./submit-button";
import { useSubmitWithoutReset } from "./use-submit";
import { Alert, Card, Field, Input, Textarea } from "./ui";

type Initial = { id: string; name: string; email: string; personalMessage: string | null };

export function ContactForm({ initial, claimMode = false }: { initial?: Initial; claimMode?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContactAction, {});
  const onSubmit = useSubmitWithoutReset(action);
  const err = (k: string) => state.fieldErrors?.[k]?.[0];
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Card className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" hint={err("name")}>
            <Input id="name" name="name" required maxLength={120} defaultValue={initial?.name} placeholder="e.g. Maria Silva" />
          </Field>
          <Field label="Email" htmlFor="email" hint={err("email") ?? "This is where we'll send their private link."}>
            <Input id="email" name="email" type="email" required defaultValue={initial?.email} placeholder="maria@example.com" />
          </Field>
        </div>
        <Field label="Personal message (optional)" htmlFor="personalMessage" hint="Only this person will see it. Encrypted.">
          <Textarea
            id="personalMessage"
            name="personalMessage"
            rows={6}
            maxLength={20000}
            defaultValue={initial?.personalMessage ?? ""}
            placeholder="Anything you want to say just to them…"
          />
        </Field>
        {!initial && claimMode && (
          <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">
            We&apos;ll email them their personal link to request access if something happens to you. Nothing from your vault is included.
          </p>
        )}
        {!initial && !claimMode && (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="mt-1 accent-teal-700" />
            <span>
              <span className="font-medium">Let them know they&apos;ve been added</span>
              <span className="block text-stone-500">
                We&apos;ll send a short email saying you named them as a trusted contact. Nothing from your vault is included.
              </span>
            </span>
          </label>
        )}
      </Card>
      <div className="flex gap-3">
        <SubmitButton pending={pending}>{initial ? "Save changes" : "Add contact"}</SubmitButton>
        <Link href="/contacts" className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
