import { eq } from "drizzle-orm";
import { Logo } from "@/components/logo";
import { RecipientVault } from "@/components/recipient-vault";
import { PrintButton } from "@/components/print-button";
import { db, schema } from "@/db";
import { hashToken } from "@/lib/crypto";
import { itemsVisibleTo, listItems, toRecipientView } from "@/lib/vault";

export const metadata = { title: "Shared information" };

export default async function AccessPage({ params }: PageProps<"/access/[token]">) {
  const { token } = await params;
  const recipient = await db.query.recipients.findFirst({ where: eq(schema.recipients.accessTokenHash, hashToken(token)) });
  const owner = recipient ? await db.query.users.findFirst({ where: eq(schema.users.id, recipient.userId) }) : null;

  if (!recipient || !owner || owner.switchStatus !== "triggered" || !recipient.releasedAt) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center">
        <Logo />
        <h1 className="mt-8 text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-stone-600">It may have been revoked by its owner, or mistyped. Please use the exact link from your email.</p>
      </main>
    );
  }

  const view = toRecipientView(recipient);
  const items = itemsVisibleTo(await listItems(owner.id), recipient.id);
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="no-print mb-8 flex items-center justify-between">
        <Logo />
        <PrintButton />
      </div>
      <RecipientVault
        ownerName={owner.name || owner.email}
        ownerEmail={owner.email}
        recipientName={view.name}
        personalMessage={view.personalMessage}
        items={items}
        releasedAt={recipient.releasedAt}
      />
    </main>
  );
}
