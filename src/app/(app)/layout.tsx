import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { accessLevel } from "@/lib/billing";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  // First-time users go through the guided setup before anything else.
  if (!user.onboardedAt) redirect("/onboarding");
  const access = accessLevel(user);
  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Logo href="/dashboard" />
          <NavLinks />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-stone-500 sm:inline">{user.email}</span>
            <form action={logoutAction}>
              <button className="rounded-md px-2 py-1 text-stone-600 hover:bg-stone-100">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      {access === "frozen" && user.switchEnabled && (
        <div className="no-print border-b border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="mx-auto max-w-5xl px-4 py-2.5">
            Your subscription has ended. Your release switch keeps running, but if you turn it off you&apos;ll need to renew to turn it back on.{" "}
            <a href="/subscribe" className="font-medium underline">Renew</a>
          </p>
        </div>
      )}
      {user.billingStatus === "past_due" && (
        <div className="no-print border-b border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="mx-auto max-w-5xl px-4 py-2.5">
            We couldn&apos;t take your last payment.{" "}
            <Link href="/settings" className="font-medium underline">Check your payment method</Link>
          </p>
        </div>
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
