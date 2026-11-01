import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

const FORWARDED = ["from", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const sp = await searchParams;
  // Landing page + ad attribution, passed through the form (validated server-side before storing).
  const attribution = Object.fromEntries(
    FORWARDED.flatMap((k) => (typeof sp[k] === "string" ? [[k, (sp[k] as string).slice(0, 100)]] : [])),
  );
  return (
    <AuthShell>
      <LoginForm attribution={attribution} />
    </AuthShell>
  );
}
