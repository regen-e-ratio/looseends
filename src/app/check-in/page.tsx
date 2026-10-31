import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, LinkButton } from "@/components/ui";
import { checkInWithToken } from "@/lib/switch";

export const metadata = { title: "Check in" };

async function confirmAction(formData: FormData) {
  "use server";
  const result = await checkInWithToken(String(formData.get("u") ?? ""), String(formData.get("t") ?? ""));
  redirect(`/check-in?result=${result}`);
}

export default async function CheckInPage({ searchParams }: PageProps<"/check-in">) {
  const { u, t, result } = await searchParams;

  if (result === "ok") {
    return (
      <AuthShell>
        <div className="space-y-3 text-center">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-semibold">Thanks — you&apos;re checked in</h1>
          <p className="text-stone-600">Your timer has been reset. We&apos;ll remind you again before your next check-in is due.</p>
          <LinkButton href="/dashboard" variant="secondary">Open my vault</LinkButton>
        </div>
      </AuthShell>
    );
  }
  if (result === "released") {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Your vault was already released</h1>
          <Alert tone="warning">Sign in to revoke your contacts&apos; access and restart your timer.</Alert>
          <LinkButton href="/login" className="w-full">Sign in</LinkButton>
        </div>
      </AuthShell>
    );
  }
  if (result === "invalid" || typeof u !== "string" || typeof t !== "string" || !/^[0-9a-f-]{36}$/.test(u)) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">This check-in link is no longer valid</h1>
          <p className="text-stone-600">It may have been used already. Signing in also counts as a check-in.</p>
          <LinkButton href="/login" className="w-full">Sign in to check in</LinkButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form action={confirmAction} className="space-y-4 text-center">
        <input type="hidden" name="u" value={u} />
        <input type="hidden" name="t" value={t} />
        <div className="text-4xl">👋</div>
        <h1 className="text-xl font-semibold">Confirm you&apos;re OK</h1>
        <p className="text-stone-600">One click resets your check-in timer.</p>
        <SubmitButton className="w-full py-3" pendingText="Confirming…">I&apos;m OK</SubmitButton>
      </form>
    </AuthShell>
  );
}
