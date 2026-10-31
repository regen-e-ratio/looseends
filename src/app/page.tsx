import { Logo } from "@/components/logo";
import { Alert, LinkButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";
import { ITEM_KINDS, KIND_ORDER } from "@/lib/items";

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  const { deleted } = await searchParams;
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        {user ? (
          <LinkButton href="/dashboard" variant="secondary">Open my vault</LinkButton>
        ) : (
          <LinkButton href="/login" variant="secondary">Sign in</LinkButton>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        {deleted && <Alert tone="success" className="mb-6">Your account and all its data have been permanently deleted.</Alert>}
        <section className="py-14 sm:py-20">
          <p className="text-sm font-medium uppercase tracking-wider text-teal-700">Tie up your loose ends</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            So the people you love aren&apos;t left untangling them.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            If something happened to you tomorrow, would anyone know about your bank accounts, investments, subscriptions or last
            wishes? {APP_NAME} is a private place to write them down. If you stop checking in, we securely pass them on to the
            people you chose — and only them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={user ? "/dashboard" : "/login"} className="px-6 py-3 text-base">
              {user ? "Go to my vault" : "Create your free vault"}
            </LinkButton>
            <a href="#how" className="px-4 py-3 text-base font-medium text-stone-700 hover:text-stone-900">
              How it works →
            </a>
          </div>
        </section>

        <section id="how" className="grid gap-4 pb-16 sm:grid-cols-3">
          {[
            ["1. Write it down", "Add subscriptions, bank accounts, investments, insurance and personal messages. Everything is encrypted."],
            ["2. Choose who receives it", "Add trusted contacts, and decide what each person gets — everything, or only specific items."],
            ["3. Check in now and then", "We email you every few weeks. One click says “I'm OK”. If you stop answering, your contacts receive a private link."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-stone-600">{body}</p>
            </div>
          ))}
        </section>

        <section className="pb-20">
          <h2 className="text-lg font-semibold">What you can record</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KIND_ORDER.map((k) => (
              <div key={k} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="text-xl">{ITEM_KINDS[k].icon}</div>
                <div className="mt-1 font-medium">{ITEM_KINDS[k].plural}</div>
                <div className="text-sm text-stone-500">{ITEM_KINDS[k].hint}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        {APP_NAME} · Don&apos;t store passwords here — tell people <em>where</em> things are, not your secrets.
      </footer>
    </div>
  );
}
