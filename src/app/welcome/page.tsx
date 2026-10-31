import { AuthShell } from "@/components/auth-shell";
import { requireUser } from "@/lib/auth";
import { NameForm } from "@/components/name-form";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await requireUser();
  return (
    <AuthShell>
      <h1 className="text-xl font-semibold">Welcome! What&apos;s your name?</h1>
      <p className="mt-1 mb-5 text-sm text-stone-600">
        Your contacts will see this name in the email we send them, so use the name they know you by.
      </p>
      <NameForm defaultValue={user.name ?? ""} next="/dashboard" submitLabel="Continue" />
    </AuthShell>
  );
}
