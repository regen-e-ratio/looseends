"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isKind, itemPayloadSchema } from "@/lib/items";
import { encodePayload } from "@/lib/vault";

const { items, itemRecipients, recipients } = schema;

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> };

const MAX_ITEMS = 500;

export async function saveItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  const kind = formData.get("kind");
  if (!isKind(kind)) return { error: "Unknown item type." };

  const parsed = itemPayloadSchema.safeParse({
    title: formData.get("title") ?? "",
    provider: formData.get("provider") ?? "",
    reference: formData.get("reference") ?? "",
    amount: formData.get("amount") ?? "",
    contact: formData.get("contact") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const shareWithAll = formData.get("share") !== "selected";
  const owned = await db.select({ id: recipients.id }).from(recipients).where(eq(recipients.userId, user.id));
  const ownedIds = new Set(owned.map((r) => r.id));
  const selected = formData.getAll("recipientIds").map(String).filter((rid) => ownedIds.has(rid));
  if (!shareWithAll && selected.length === 0) return { error: "Choose at least one contact, or share with everyone." };

  const payload = encodePayload(parsed.data);
  await db.transaction(async (tx) => {
    let itemId = id;
    if (itemId) {
      const updated = await tx
        .update(items)
        .set({ kind, payload, shareWithAll, updatedAt: new Date() })
        .where(and(eq(items.id, itemId), eq(items.userId, user.id)))
        .returning({ id: items.id });
      if (updated.length === 0) throw new Error("Item not found");
      await tx.delete(itemRecipients).where(eq(itemRecipients.itemId, itemId));
    } else {
      const count = (await tx.select({ id: items.id }).from(items).where(eq(items.userId, user.id))).length;
      if (count >= MAX_ITEMS) throw new Error("Item limit reached");
      const [row] = await tx.insert(items).values({ userId: user.id, kind, payload, shareWithAll }).returning({ id: items.id });
      itemId = row.id;
    }
    if (!shareWithAll && selected.length) {
      await tx.insert(itemRecipients).values(selected.map((recipientId) => ({ itemId: itemId!, recipientId })));
    }
  });
  redirect(`/dashboard?saved=1#${kind}`);
}

export async function deleteItemAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await db.delete(items).where(and(eq(items.id, id), eq(items.userId, user.id)));
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
