import { verifyLoginAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Alert, LinkButton } from "@/components/ui";
import { peekLoginToken } from "@/lib/auth";

export const metadata = { title: "Sign in" };

// The link only shows a button; signing in happens on POST so that email
// scanners that pre-open links can't use up the token.
export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const { token, error } = await searchParams;
  const t = typeof token === "string" ? token : "";
  const email = t ? await peekLoginToken(t) : null;

  if (error || !email) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">This link has expired</h1>
          <Alert tone="warning">Sign-in links work once and expire after 20 minutes.</Alert>
          <LinkButton href="/login" className="w-full">Send me a new link</LinkButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form action={verifyLoginAction} className="space-y-4 text-center">
        <input type="hidden" name="token" value={t} />
        <h1 className="text-xl font-semibold">Welcome</h1>
        <p className="text-stone-600">
          Continue as <strong>{email}</strong>
        </p>
        <SubmitButton className="w-full" pendingText="Signing in…">Continue</SubmitButton>
      </form>
    </AuthShell>
  );
}
