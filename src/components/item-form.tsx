"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveItemAction, type FormState } from "@/app/actions/vault";
import { ITEM_KINDS, kindFields, kindWarning, type ItemKind } from "@/lib/items";
import { SubmitButton } from "./submit-button";
import { Alert, Card, Field, Input, Textarea } from "./ui";

type Contact = { id: string; name: string; relationship: string | null };
type Initial = { id?: string; values?: Partial<Record<string, string>>; shareWithAll?: boolean; recipientIds?: string[] };

export function ItemForm({ kind, contacts, initial = {} }: { kind: ItemKind; contacts: Contact[]; initial?: Initial }) {
  const [state, action] = useActionState<FormState, FormData>(saveItemAction, {});
  const [share, setShare] = useState<"all" | "selected">(initial.shareWithAll === false ? "selected" : "all");
  const fields = kindFields(kind);

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kind" value={kind} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <Card className="space-y-5">
        {fields.map((f) => {
          const err = state.fieldErrors?.[f.name]?.[0];
          const long = f.name === "notes";
          const props = {
            id: f.name,
            name: f.name,
            placeholder: f.placeholder ? `e.g. ${f.placeholder}` : undefined,
            defaultValue: initial.values?.[f.name] ?? "",
            required: f.name === "title",
          };
          return (
            <Field key={f.name} label={f.label + (f.name === "title" ? "" : " (optional)")} htmlFor={f.name} hint={err}>
              {long ? <Textarea {...props} rows={kind === "message" ? 12 : 4} maxLength={20000} /> : <Input {...props} maxLength={300} />}
            </Field>
          );
        })}
        {kindWarning(kind) && (
          <p className={kind === "crypto" ? "rounded-lg bg-amber-50 p-3 text-sm text-amber-900" : "text-xs text-stone-500"}>
            {kind === "crypto" ? "⚠️ " : "🔒 "}
            {kindWarning(kind)}
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Who should receive this?</h2>
        <label className="flex items-start gap-3 text-sm">
          <input type="radio" name="share" value="all" checked={share === "all"} onChange={() => setShare("all")} className="mt-1 accent-teal-700" />
          <span>
            <span className="font-medium">All my trusted contacts</span>
            <span className="block text-stone-500">Including anyone you add later.</span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="radio"
            name="share"
            value="selected"
            checked={share === "selected"}
            onChange={() => setShare("selected")}
            disabled={contacts.length === 0}
            className="mt-1 accent-teal-700"
          />
          <span>
            <span className="font-medium">Only specific people</span>
            {contacts.length === 0 && (
              <span className="block text-stone-500">
                <Link href="/contacts/new" className="underline">
                  Add contacts
                </Link>{" "}
                first to choose specific people.
              </span>
            )}
          </span>
        </label>
        {share === "selected" && (
          <div className="ml-7 grid gap-2 sm:grid-cols-2">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="recipientIds"
                  value={c.id}
                  defaultChecked={initial.recipientIds?.includes(c.id)}
                  className="accent-teal-700"
                />
                {c.name}
                {c.relationship && <span className="text-stone-400">· {c.relationship}</span>}
              </label>
            ))}
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <SubmitButton>{initial.id ? "Save changes" : `Add ${ITEM_KINDS[kind].label.toLowerCase()}`}</SubmitButton>
        <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900">
          Cancel
        </Link>
      </div>
    </form>
  );
}
