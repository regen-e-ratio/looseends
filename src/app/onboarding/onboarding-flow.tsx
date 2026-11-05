"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  finishOnboardingAction,
  saveStepOneAction,
  saveStepTwoAction,
  skipOnboardingAction,
  type StepState,
} from "@/app/actions/onboarding";
import { LogoMark } from "@/components/logo";
import { ModeCard } from "@/components/switch-form";
import { PLAN } from "@/lib/config";
import { Alert, Button, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { GRACE_OPTIONS, INTERVAL_OPTIONS } from "@/lib/config";
import { ITEM_KINDS } from "@/lib/items";
import { IDENTIFY, type QuickAdd } from "@/lib/onboarding";

const PHASES = [
  { title: "Write it down", hint: "A message and what keeps charging you" },
  { title: "Your people", hint: "Who should receive it" },
  { title: "How we'll know", hint: "Check-ins or a claim link" },
];

type Thing = { id: number; title: string; reference: string; kind: QuickAdd["kind"]; identify: QuickAdd["identify"] };
type Person = { id: number; name: string; email: string };

let nextId = 1;

/** Dispatch a server action without React's automatic form reset (fields here are controlled). */
function submitWith(dispatch: (fd: FormData) => void, start: (cb: () => void) => void, values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  start(() => dispatch(fd));
}

export function OnboardingFlow(props: {
  name: string;
  email: string;
  savedItems: number;
  savedContacts: string[];
  suggestions: QuickAdd[];
  stepOneDone: boolean;
  defaults: { interval: number; grace: number };
  /** Has a subscription, so finishing turns the switch on directly (otherwise: subscribe next). */
  canTurnOn: boolean;
}) {
  const [done, setDone] = useState([props.stepOneDone, props.savedContacts.length > 0, false]);
  const [current, setCurrent] = useState(() => (props.stepOneDone ? (props.savedContacts.length > 0 ? 2 : 1) : 0));
  const [itemCount, setItemCount] = useState(props.savedItems);
  const [contactNames, setContactNames] = useState(props.savedContacts);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const register = (i: number, el: HTMLElement | null) => {
    sections.current[i] = el;
  };

  // Set by goTo; the effect below scrolls and focuses once React has committed the new phase
  // (before that the section is still `inert` and can't take focus).
  const pendingScroll = useRef<{ smooth: boolean } | null>(null);
  const goTo = (i: number, smooth = true) => {
    pendingScroll.current = { smooth };
    setCurrent(i);
  };
  useEffect(() => {
    const pending = pendingScroll.current;
    const el = sections.current[current];
    if (!pending || !el) return;
    pendingScroll.current = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: pending.smooth && !reduce ? "smooth" : "auto", block: "start" });
    el.querySelector<HTMLElement>("input, textarea, button")?.focus({ preventScroll: true });
  }, [current]);
  const complete = (i: number) => {
    setDone((d) => d.map((v, j) => (j === i ? true : v)));
    if (i < 2) goTo(i + 1);
  };

  // Resuming after a reload: jump straight to the first unfinished phase.
  useEffect(() => {
    if (current > 0) sections.current[current]?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-stone-50 lg:flex-row">
      <Rail current={current} done={done} onJump={(i) => (i <= current ? goTo(i) : undefined)} />
      <main className="flex-1 px-5 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-2xl">
          <Section index={0} current={current} done={done[0]} register={register} summary={`${itemCount} item${itemCount === 1 ? "" : "s"} saved to your vault`}>
            <StepOne
              name={props.name}
              email={props.email}
              suggestions={props.suggestions}
              onSaved={(n) => {
                setItemCount((c) => c + n);
                complete(0);
              }}
            />
          </Section>
          <Section
            index={1}
            current={current}
            done={done[1]}
            register={register}
            summary={contactNames.length ? `Added ${contactNames.join(", ")}` : "Skipped for now"}
          >
            <StepTwo
              saved={contactNames}
              onSaved={(names) => {
                setContactNames((c) => [...c, ...names]);
                complete(1);
              }}
              onSkip={() => complete(1)}
            />
          </Section>
          <Section index={2} current={current} done={false} register={register} last>
            <StepThree contactCount={contactNames.length} defaults={props.defaults} canTurnOn={props.canTurnOn} />
          </Section>
        </div>
      </main>
    </div>
  );
}

function Rail({ current, done, onJump }: { current: number; done: boolean[]; onJump: (i: number) => void }) {
  return (
    <aside className="sticky top-0 z-20 bg-teal-950 text-teal-50 lg:h-dvh lg:w-80 lg:shrink-0">
      <div className="flex h-full flex-col gap-6 px-5 py-4 lg:px-8 lg:py-10">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            <LogoMark bg="#ccfbf1" fg="#134e4a" className="h-7 w-7" />
            Set up your vault
          </span>
          <span className="text-sm text-teal-200 lg:hidden">
            {current + 1} of {PHASES.length}
          </span>
        </div>

        {/* Phone: a slim three-segment progress bar. */}
        <div className="flex gap-1.5 lg:hidden" aria-hidden="true">
          {PHASES.map((p, i) => (
            <span key={p.title} className={cx("h-1.5 flex-1 rounded-full", i <= current || done[i] ? "bg-teal-300" : "bg-teal-800")} />
          ))}
        </div>

        <ol className="hidden flex-col lg:mt-6 lg:flex">
          {PHASES.map((p, i) => {
            const state = done[i] && i !== current ? "done" : i === current ? "current" : "upcoming";
            return (
              <li key={p.title} className="relative flex gap-4 pb-10 last:pb-0">
                {i < PHASES.length - 1 && (
                  <span className={cx("absolute left-[15px] top-9 bottom-1 w-0.5", done[i] ? "bg-teal-400" : "bg-teal-800")} aria-hidden="true" />
                )}
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  disabled={i > current}
                  aria-current={state === "current" ? "step" : undefined}
                  className="flex gap-4 text-left disabled:cursor-default"
                >
                  <span
                    className={cx(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition",
                      state === "done" && "bg-teal-400 text-teal-950",
                      state === "current" && "bg-teal-50 text-teal-950 ring-4 ring-teal-400/40",
                      state === "upcoming" && "border border-teal-700 text-teal-400",
                    )}
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className="pt-0.5">
                    <span className={cx("block font-medium", state === "upcoming" ? "text-teal-300/70" : "text-white")}>{p.title}</span>
                    <span className="block text-sm text-teal-200/70">{p.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <form action={skipOnboardingAction} className="mt-auto hidden lg:block">
          <button className="text-sm text-teal-200/70 underline-offset-4 hover:text-white hover:underline">Skip setup for now</button>
        </form>
      </div>
    </aside>
  );
}

function Section({
  index,
  current,
  done,
  register,
  summary,
  last,
  children,
}: {
  index: number;
  current: number;
  done: boolean;
  register: (index: number, el: HTMLElement | null) => void;
  summary?: string;
  last?: boolean;
  children: ReactNode;
}) {
  const upcoming = index > current;
  const collapsed = done && index < current;
  return (
    <section
      ref={(el) => register(index, el)}
      aria-labelledby={`phase-${index}`}
      inert={upcoming}
      className={cx(
        "scroll-mt-24 py-12 transition-opacity duration-300 lg:scroll-mt-0 lg:py-16",
        upcoming && "opacity-35",
        last ? "min-h-[85dvh]" : "border-b border-stone-200",
      )}
    >
      <p className="text-sm font-medium text-teal-700">
        Step {index + 1} of {PHASES.length}
      </p>
      <h2 id={`phase-${index}`} className="mt-1 text-3xl font-semibold tracking-tight">
        {PHASES[index].title}
      </h2>
      {collapsed ? (
        <p className="mt-4 flex items-center gap-2 text-stone-600">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-600 text-xs text-white">✓</span>
          {summary}
        </p>
      ) : (
        <div className="mt-8">{children}</div>
      )}
    </section>
  );
}

// ---------- Phase 1 ----------

function StepOne({
  name: initialName,
  email,
  suggestions,
  onSaved,
}: {
  name: string;
  email: string;
  suggestions: QuickAdd[];
  onSaved: (n: number) => void;
}) {
  const [state, dispatch, pending] = useActionState<StepState, FormData>(saveStepOneAction, {});
  const [, start] = useTransition();
  const [name, setName] = useState(initialName);
  const [messageTitle, setMessageTitle] = useState("To my family");
  const [messageBody, setMessageBody] = useState("");
  const [things, setThings] = useState<Thing[]>([]);

  useEffect(() => {
    if (state.ok) onSaved(state.saved ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const added = new Set(things.map((t) => t.title));
  // Most accounts use the person's own address, so pre-fill it; they can change it per row.
  const add = (q: QuickAdd) =>
    setThings((t) => [...t, { id: nextId++, title: q.title, kind: q.kind, identify: q.identify, reference: q.identify === "email" ? email : "" }]);
  const update = (id: number, patch: Partial<Thing>) => setThings((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        submitWith(dispatch, start, {
          name,
          messageTitle,
          messageBody,
          things: JSON.stringify(things.filter((t) => t.title.trim()).map(({ title, reference, kind }) => ({ title, reference, kind }))),
        });
      }}
    >
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Your name" htmlFor="ob-name" hint="Your people will see it in the email we send them.">
        <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" placeholder="Jane Doe" />
      </Field>

      <div className="space-y-3">
        <p className="font-medium">A message for the people you love</p>
        <Input id="ob-message-title" aria-label="Message title" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} maxLength={200} />
        <Textarea
          id="ob-message-body"
          aria-label="Message"
          rows={5}
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          maxLength={20000}
          placeholder="A few words you'd want them to read. You can always change it later."
        />
      </div>

      <div className="space-y-3">
        <p className="font-medium">What keeps charging you?</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q.title}
              type="button"
              onClick={() => add(q)}
              disabled={added.has(q.title)}
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-teal-600 hover:text-teal-800 disabled:border-teal-600 disabled:bg-teal-50 disabled:text-teal-800"
            >
              {added.has(q.title) ? "✓ " : "+ "}
              {q.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => add({ title: "", kind: "subscription", identify: "email" })}
            className="rounded-full border border-dashed border-stone-400 px-3 py-1.5 text-sm text-stone-600 hover:border-teal-600"
          >
            + Something else
          </button>
        </div>
        {things.length > 0 && (
          <div className="rounded-xl border border-stone-200 bg-white">
          <div className="hidden grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1.2fr)_1.5rem] gap-2 border-b border-stone-100 px-3 pb-1.5 pt-2.5 text-xs font-medium text-stone-500 sm:grid">
            <span />
            <span className="px-3">Service</span>
            <span className="px-3">How to find the account</span>
            <span />
          </div>
          <ul className="divide-y divide-stone-100">
            {things.map((t) => (
              <li
                key={t.id}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-x-2 px-3 py-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1.2fr)_1.5rem]"
              >
                <span aria-hidden="true">{ITEM_KINDS[t.kind].icon}</span>
                <Input
                  aria-label="Name"
                  value={t.title}
                  onChange={(e) => update(t.id, { title: e.target.value })}
                  placeholder="Name"
                  className="border-transparent shadow-none"
                  autoFocus={!t.title}
                />
                <Input
                  aria-label={`${t.title || "Item"}: ${IDENTIFY[t.identify].label.toLowerCase()}`}
                  value={t.reference}
                  onChange={(e) => update(t.id, { reference: e.target.value })}
                  placeholder={IDENTIFY[t.identify].placeholder}
                  type={t.identify === "email" ? "email" : "text"}
                  className="col-start-2 border-transparent text-stone-600 shadow-none sm:col-start-auto"
                />
                <button
                  type="button"
                  aria-label={`Remove ${t.title}`}
                  onClick={() => setThings((all) => all.filter((x) => x.id !== t.id))}
                  className="px-2 text-stone-400 hover:text-red-600"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          </div>
        )}
        {things.length > 0 && (
          <p className="text-sm text-stone-500">This is how your people will find each account to cancel it or take it over.</p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="px-6 py-2.5">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}

// ---------- Phase 2 ----------

const emptyPerson = (): Person => ({ id: nextId++, name: "", email: "" });

function StepTwo({ saved, onSaved, onSkip }: { saved: string[]; onSaved: (names: string[]) => void; onSkip: () => void }) {
  const [state, dispatch, pending] = useActionState<StepState, FormData>(saveStepTwoAction, {});
  const [, start] = useTransition();
  const [people, setPeople] = useState<Person[]>(() => [emptyPerson()]);
  const filled = people.filter((p) => p.name.trim() || p.email.trim());

  useEffect(() => {
    // On success this phase collapses (and unmounts), so there is nothing to reset here.
    if (state.ok) onSaved(filled.map((p) => p.name.trim()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const update = (id: number, patch: Partial<Person>) => setPeople((all) => all.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submitWith(dispatch, start, { contacts: JSON.stringify(filled.map(({ name, email }) => ({ name, email }))) });
      }}
    >
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {saved.length > 0 && <p className="text-sm text-stone-600">Already added: {saved.join(", ")}</p>}
      <div className="space-y-3">
        {people.map((p, i) => (
          <div key={p.id} className="grid gap-2 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
            <Input aria-label={`Person ${i + 1} name`} value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} placeholder="Name" maxLength={120} />
            <Input
              aria-label={`Person ${i + 1} email`}
              type="email"
              value={p.email}
              onChange={(e) => update(p.id, { email: e.target.value })}
              placeholder="Email"
            />
            <button
              type="button"
              aria-label="Remove person"
              onClick={() => setPeople((all) => (all.length > 1 ? all.filter((x) => x.id !== p.id) : [emptyPerson()]))}
              className="justify-self-end px-2 text-stone-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setPeople((all) => [...all, emptyPerson()])} className="text-sm font-medium text-teal-800 hover:underline">
          + Add another person
        </button>
      </div>
      <p className="text-sm text-stone-500">Nobody is emailed yet. You&apos;ll choose what they receive in the next step.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || filled.length === 0} className="px-6 py-2.5">
          {pending ? "Saving…" : "Continue"}
        </Button>
        <button type="button" onClick={onSkip} className="text-sm text-stone-500 hover:text-stone-800">
          Skip for now
        </button>
      </div>
    </form>
  );
}

// ---------- Phase 3 ----------

function StepThree({
  contactCount,
  defaults,
  canTurnOn,
}: {
  contactCount: number;
  defaults: { interval: number; grace: number };
  canTurnOn: boolean;
}) {
  const [state, dispatch, pending] = useActionState<StepState, FormData>(finishOnboardingAction, {});
  const [, start] = useTransition();
  const [mode, setMode] = useState<"checkin" | "claim" | null>(null);
  const [interval, setIntervalDays] = useState(defaults.interval);
  const [grace, setGrace] = useState(defaults.grace);
  const [notify, setNotify] = useState(true);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!mode) return;
        submitWith(dispatch, start, { mode, interval: String(interval), grace: String(grace), notify: notify ? "on" : "" });
      }}
    >
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">How should we know something has happened?</legend>
        <ModeCard value="checkin" current={mode} onSelect={setMode} />
        <ModeCard value="claim" current={mode} onSelect={setMode} />
      </fieldset>

      {mode === "checkin" && (
        <div className="space-y-4">
          <Field label="Check in every" htmlFor="ob-interval">
            <Select id="ob-interval" value={interval} onChange={(e) => setIntervalDays(Number(e.target.value))} className="max-w-xs">
              {INTERVAL_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </Select>
          </Field>
          {contactCount > 0 && (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-teal-700" />
              Let my people know they&apos;ve been added
            </label>
          )}
        </div>
      )}
      {mode === "claim" && (
        <div className="space-y-4">
          <Field label="Time I have to say no" htmlFor="ob-grace">
            <Select id="ob-grace" value={grace} onChange={(e) => setGrace(Number(e.target.value))} className="max-w-xs">
              {GRACE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </Select>
          </Field>
          {contactCount > 0 && (
            <p className="text-sm text-stone-600">
              We&apos;ll email your {contactCount} {contactCount === 1 ? "person" : "people"} their personal link.
            </p>
          )}
        </div>
      )}
      {mode && contactCount === 0 && (
        <p className="text-sm text-stone-600">It stays off until you add someone. You can do that anytime from your vault.</p>
      )}

      {mode && contactCount > 0 && !canTurnOn && (
        <p className="text-sm text-stone-600">
          Next, activate your switch: {PLAN.eur} a {PLAN.period} ({PLAN.usd} in the US). Until then, nothing is sent to anyone.
        </p>
      )}
      <Button type="submit" disabled={pending || !mode} className="px-6 py-2.5">
        {pending ? "Finishing…" : contactCount > 0 && !canTurnOn ? "Finish and activate" : "Finish setup"}
      </Button>
    </form>
  );
}
