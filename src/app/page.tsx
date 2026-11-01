import type { Metadata } from "next";
import { LandingTemplate } from "@/components/marketing/landing-template";
import { Alert } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { home } from "@/marketing";

export const metadata: Metadata = {
  title: { absolute: home.meta.title },
  description: home.meta.description,
  robots: { index: true, follow: true },
};

export default async function Home({ searchParams }: PageProps<"/">) {
  const [user, { deleted }] = await Promise.all([getCurrentUser(), searchParams]);
  return (
    <>
      {deleted && (
        <Alert tone="success" className="mx-auto mt-4 w-full max-w-6xl">
          Your account and all its data have been permanently deleted.
        </Alert>
      )}
      <LandingTemplate page={home} signedIn={Boolean(user)} />
    </>
  );
}
