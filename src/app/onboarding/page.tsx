import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canTurnOnSwitch, requireUser } from "@/lib/auth";
import { quickAddSuggestions } from "@/lib/onboarding";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "Set up your vault" };

/** First-time setup. Progress is derived from saved data, so a reload resumes at the right phase. */
export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.onboardedAt) redirect("/dashboard");
  const [items, contacts] = await Promise.all([
    db.select({ kind: schema.items.kind }).from(schema.items).where(eq(schema.items.userId, user.id)),
    db.select({ name: schema.recipients.name }).from(schema.recipients).where(eq(schema.recipients.userId, user.id)),
  ]);
  return (
    <OnboardingFlow
      name={user.name ?? ""}
      email={user.email}
      savedItems={items.length}
      savedContacts={contacts.map((c) => c.name)}
      suggestions={quickAddSuggestions(user.signupSource)}
      stepOneDone={Boolean(user.name) && items.length > 0}
      defaults={{ interval: user.checkInIntervalDays, grace: user.gracePeriodDays }}
      canTurnOn={canTurnOnSwitch(user)}
    />
  );
}
