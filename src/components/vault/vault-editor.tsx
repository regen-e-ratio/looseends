"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { deleteItemAction, saveItemAction, type SaveItemResult } from "@/app/actions/vault";
import { InfoTip } from "@/components/info-tip";
import { Alert, Button, Card, Input, Textarea, cx } from "@/components/ui";
import { ITEM_KINDS, KIND_ORDER, findField, isKind, kindWarning, type ItemKind } from "@/lib/items";
import type { VaultItem } from "@/lib/vault";

type Contact = { id: string; name: string };
/** What someone typed but hasn't saved yet, per selection (kept while they move around the vault). */
type Draft = { title: string; reference: string; notes: string; share: "all" | "selected"; recipientIds: string[] };

function selectionKey(sel: Selection): string {
  return sel ? (sel.type === "item" ? `item:${sel.id}` : `new:${sel.kind}`) : "none";
}
type Selection = { type: "item"; id: string } | { type: "new"; kind: ItemKind } | null;

function readSelection(params: URLSearchParams): Selection {
  const id = params.get("item");
  if (id) return { type: "item", id };
  const kind = params.get("new");
  if (isKind(kind)) return { type: "new", kind };
  return null;
}

function urlFor(sel: Selection): string {
  if (!sel) return "/vault";
  return sel.type === "item" ? `/vault?item=${sel.id}` : `/vault?new=${sel.kind}`;
}

/**
 * The whole vault on one page: everything on the left, the selected item (or a new one) on the right.
 * The selection lives in the URL, so switching is instant (no page load) and back/forward work.
 * The editor is keyed by the selection, so it re-renders for every switch. Unsaved edits are kept as a
 * draft per selection, so switching away (or pressing Back) never loses them; they're marked "Unsaved".
 */
export function VaultEditor({ items, contacts }: { items: VaultItem[]; contacts: Contact[] }) {
  const params = useSearchParams();
  const selection = readSelection(new URLSearchParams(params.toString()));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  // Bumped by "Discard" to remount the editor from the saved values.
  const [discards, setDiscards] = useState(0);
  // The item that was just created: its (remounted) editor starts out showing "✓ Saved".
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const select = (next: Selection, { replace = false } = {}) => {
    setJustCreated(null);
    window.history[replace ? "replaceState" : "pushState"](null, "", urlFor(next));
    if (window.matchMedia("(max-width: 1023px)").matches) window.scrollTo({ top: 0 });
  };
  const setDraft = (key: string, draft: Draft | null) =>
    setDrafts((all) => {
      const next = { ...all };
      if (draft) next[key] = draft;
      else delete next[key];
      return next;
    });

  // Warn before closing the tab while anything is unsaved.
  const unsaved = Object.keys(drafts).length > 0;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const current = selection?.type === "item" ? items.find((i) => i.id === selection.id) : undefined;
  const key = selectionKey(selection);

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
      <aside className={cx("lg:sticky lg:top-6", selection && "max-lg:hidden")} aria-label="Everything in your vault">
        <ItemList items={items} selection={selection} onSelect={select} unsaved={drafts} />
      </aside>

      <section className={cx(!selection && "max-lg:hidden")} aria-label="Editor">
        {selection && (
          <button type="button" onClick={() => select(null)} className="mb-4 text-sm font-medium text-teal-800 lg:hidden">
            ← Everything in my vault
          </button>
        )}
        {!selection ? (
          <AddPanel onPick={(kind) => select({ type: "new", kind })} />
        ) : selection.type === "item" && !current ? (
          <Card>
            <p className="text-stone-600">This item isn&apos;t in your vault anymore.</p>
          </Card>
        ) : (
          <ItemEditor
            key={`${key}:${discards}`}
            kind={current?.kind ?? (selection as { kind: ItemKind }).kind}
            item={current}
            contacts={contacts}
            justCreated={!!current && current.id === justCreated}
            draft={drafts[key]}
            onDraft={(d) => setDraft(key, d)}
            onDiscard={() => {
              setDraft(key, null);
              setDiscards((n) => n + 1);
            }}
            onKindChange={(kind) => select({ type: "new", kind }, { replace: true })}
            onCreated={(id) => {
              setDraft(key, null);
              setJustCreated(id);
              window.history.replaceState(null, "", urlFor({ type: "item", id }));
            }}
            onDeleted={() => {
              setDraft(key, null);
              window.history.replaceState(null, "", urlFor(null));
            }}
          />
        )}
      </section>
    </div>
  );
}

// ---------- left: everything in the vault ----------

function ItemList({
  items,
  selection,
  onSelect,
  unsaved,
}: {
  items: VaultItem[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  unsaved: Record<string, Draft>;
}) {
  const groups = KIND_ORDER.map((k) => ({ kind: k, items: items.filter((i) => i.kind === k) })).filter((g) => g.items.length);
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <p className="text-sm font-medium text-stone-600">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <AddMenu onPick={(kind) => onSelect({ type: "new", kind })} active={selection?.type === "new"} />
      </div>
      {groups.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-500">Nothing here yet. Use “+ Add” to write down your first thing.</p>
      ) : (
        <nav className="max-h-[calc(100dvh-12rem)] overflow-y-auto rounded-b-xl py-2 max-lg:max-h-none">
          {groups.map((g) => (
            <div key={g.kind} className="py-1">
              <p className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-stone-400">
                {ITEM_KINDS[g.kind].icon} {ITEM_KINDS[g.kind].plural}
              </p>
              <ul>
                {g.items.map((item) => {
                  const active = selection?.type === "item" && selection.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onSelect({ type: "item", id: item.id })}
                        aria-current={active ? "true" : undefined}
                        className={cx(
                          "block w-full border-l-2 px-4 py-1.5 text-left",
                          active ? "border-teal-700 bg-teal-50 text-teal-900" : "border-transparent hover:bg-stone-50",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{unsaved[`item:${item.id}`]?.title || item.title}</span>
                          {unsaved[`item:${item.id}`] && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">Unsaved</span>
                          )}
                        </span>
                        {item.reference && <span className="block truncate text-xs text-stone-500">{item.reference}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}

function AddMenu({ onPick, active }: { onPick: (k: ItemKind) => void; active: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <Button type="button" variant={active ? "secondary" : "primary"} className="px-3 py-1.5" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        + Add
      </Button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-stone-200 bg-white py-1.5 shadow-xl">
          {KIND_ORDER.map((k) => (
            <li key={k} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onPick(k);
                }}
                className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-stone-50"
              >
                <span aria-hidden="true">{ITEM_KINDS[k].icon}</span>
                <span>
                  <span className="block text-sm font-medium">{ITEM_KINDS[k].label}</span>
                  <span className="block text-xs text-stone-500">{ITEM_KINDS[k].hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shown on wide screens when nothing is selected. */
function AddPanel({ onPick }: { onPick: (k: ItemKind) => void }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Add something to your vault</h2>
      <p className="mt-1 text-sm text-stone-600">Or pick anything on the left to see or change it.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onPick(k)}
            className="rounded-lg border border-stone-200 p-3 text-left transition hover:border-teal-600 hover:bg-teal-50/40"
          >
            <span className="text-xl" aria-hidden="true">
              {ITEM_KINDS[k].icon}
            </span>
            <span className="mt-1 block text-sm font-medium">{ITEM_KINDS[k].label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ---------- right: one item ----------

function ItemEditor({
  kind,
  item,
  contacts,
  justCreated = false,
  draft,
  onDraft,
  onDiscard,
  onKindChange,
  onCreated,
  onDeleted,
}: {
  kind: ItemKind;
  item?: VaultItem;
  contacts: Contact[];
  justCreated?: boolean;
  draft?: Draft;
  onDraft: (draft: Draft | null) => void;
  onDiscard: () => void;
  onKindChange: (kind: ItemKind) => void;
  onCreated: (id: string) => void;
  onDeleted: () => void;
}) {
  const def = ITEM_KINDS[kind];
  const find = findField(kind);
  const warning = kindWarning(kind);
  const [result, setResult] = useState<SaveItemResult>({});
  const [saved, setSaved] = useState(justCreated);
  const [share, setShare] = useState<"all" | "selected">(draft?.share ?? (item && !item.shareWithAll ? "selected" : "all"));
  const initial = {
    title: draft?.title ?? item?.title ?? "",
    reference: draft?.reference ?? item?.reference ?? "",
    notes: draft?.notes ?? item?.notes ?? "",
    recipientIds: draft?.recipientIds ?? item?.recipientIds ?? [],
  };
  const [pending, start] = useTransition();
  const [deleting, startDelete] = useTransition();
  const err = (f: string) => result.fieldErrors?.[f]?.[0];

  const changed = (form: HTMLFormElement) => {
    setSaved(false);
    const data = new FormData(form);
    onDraft({
      title: String(data.get("title") ?? ""),
      reference: String(data.get("reference") ?? ""),
      notes: String(data.get("notes") ?? ""),
      share: data.get("share") === "selected" ? "selected" : "all",
      recipientIds: data.getAll("recipientIds").map(String),
    });
  };

  return (
    <form
      noValidate
      onChange={(e) => changed(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveItemAction(data);
          setResult(r);
          if (!r.ok) return;
          onDraft(null);
          setSaved(true);
          if (!item && r.id) onCreated(r.id);
        });
      }}
      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div className="mb-6">
        <p className="text-sm font-medium text-teal-700">
          {def.icon} {item ? def.label : `New ${def.label.toLowerCase()}`}
        </p>
        <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight">{item ? item.title : def.hint}</h2>
        {!item && (
          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Type">
            {KIND_ORDER.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => k !== kind && onKindChange(k)}
                aria-pressed={k === kind}
                className={cx(
                  "rounded-full border px-2.5 py-1 text-xs",
                  k === kind ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 text-stone-600 hover:border-stone-400",
                )}
              >
                {ITEM_KINDS[k].icon} {ITEM_KINDS[k].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {result.error && <Alert tone="danger" className="mb-5">{result.error}</Alert>}

      <div className="space-y-5">
        <div className={cx("grid gap-4", find && "sm:grid-cols-2")}>
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium text-stone-700">{def.title.label}</span>
            <Input name="title" defaultValue={initial.title} placeholder={def.title.placeholder} maxLength={200} aria-invalid={!!err("title")} autoFocus={!item} />
            {err("title") && <span className="block text-xs text-red-700">{err("title")}</span>}
          </label>
          {find && (
            <label className="block space-y-1.5">
              <span className="block text-sm font-medium text-stone-700">{find.label}</span>
              <Input name="reference" defaultValue={initial.reference} placeholder={find.placeholder} maxLength={200} />
            </label>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="relative flex items-center gap-2">
            <label htmlFor="notes" className="text-sm font-medium text-stone-700">
              {def.notes.label}
            </label>
            <InfoTip label={`Ideas for what to write about this ${def.label.toLowerCase()}`}>
              <span className="block font-medium">You could write about:</span>
              <span className="mt-1 block">
                {def.notes.ideas.map((idea) => (
                  <span key={idea} className="block">
                    • {idea}
                  </span>
                ))}
              </span>
              {kind !== "message" && <span className="mt-2 block text-stone-300">Never write passwords or PINs — say where to find them.</span>}
            </InfoTip>
          </div>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={initial.notes}
            placeholder={def.notes.placeholder}
            rows={kind === "message" ? 12 : 6}
            maxLength={20000}
            aria-invalid={!!err("notes")}
          />
          {err("notes") && <span className="block text-xs text-red-700">{err("notes")}</span>}
          {warning && <p className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">⚠️ {warning}</p>}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-stone-700">Who receives this</legend>
          <div className="inline-flex rounded-lg border border-stone-200 p-0.5 text-sm">
            {(["all", "selected"] as const).map((v) => (
              <label
                key={v}
                className={cx(
                  "cursor-pointer rounded-md px-3 py-1.5",
                  share === v ? "bg-teal-700 text-white" : "text-stone-600 hover:bg-stone-50",
                  v === "selected" && contacts.length === 0 && "pointer-events-none opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="share"
                  value={v}
                  checked={share === v}
                  onChange={() => setShare(v)}
                  disabled={v === "selected" && contacts.length === 0}
                  className="sr-only"
                />
                {v === "all" ? "Everyone" : "Only some people"}
              </label>
            ))}
          </div>
          {share === "selected" && (
            <div className="flex flex-wrap gap-2 pt-1">
              {contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-sm">
                  <input type="checkbox" name="recipientIds" value={c.id} defaultChecked={initial.recipientIds.includes(c.id)} className="accent-teal-700" />
                  {c.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Add to vault"}
        </Button>
        {saved && !pending && <span className="text-sm text-emerald-700">✓ Saved</span>}
        {draft && !pending && (
          <span className="flex items-center gap-2 text-sm text-amber-700">
            Unsaved changes
            {item && (
              <button type="button" className="text-stone-500 underline-offset-2 hover:underline" onClick={onDiscard}>
                Discard
              </button>
            )}
          </span>
        )}
        {item && (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto text-red-700"
            disabled={deleting}
            onClick={() => {
              if (!window.confirm(`Delete “${item.title}” from your vault?`)) return;
              startDelete(async () => {
                await deleteItemAction(item.id);
                onDeleted();
              });
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
      </div>
    </form>
  );
}
