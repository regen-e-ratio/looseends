"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isKind, itemInputSchema } from "@/lib/items";
import { encodePayload } from "@/lib/vault";

const { items, itemRecipients, recipients } = schema;

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> };

const MAX_ITEMS = 500;

export type SaveItemResult = FormState & { ok?: boolean; id?: string };

/** Creates or updates one vault item. Called directly from the vault editor (no redirect). */
export async function saveItemAction(formData: FormData): Promise<SaveItemResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  const kind = formData.get("kind");
  if (!isKind(kind)) return { error: "Unknown item type." };

  const parsed = itemInputSchema.safeParse({
    title: formData.get("title") ?? "",
    reference: formData.get("reference") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (kind === "message" && !parsed.data.notes) return { fieldErrors: { notes: ["Write your message first."] } };

  const shareWithAll = formData.get("share") !== "selected";
  const owned = await db.select({ id: recipients.id }).from(recipients).where(eq(recipients.userId, user.id));
  const ownedIds = new Set(owned.map((r) => r.id));
  const selected = formData.getAll("recipientIds").map(String).filter((rid) => ownedIds.has(rid));
  if (!shareWithAll && selected.length === 0) return { error: "Choose at least one person, or share with everyone." };

  const payload = encodePayload(parsed.data);
  let itemId = id;
  try {
    await db.transaction(async (tx) => {
      if (itemId) {
        const updated = await tx
          .update(items)
          .set({ kind, payload, shareWithAll, updatedAt: new Date() })
          .where(and(eq(items.id, itemId), eq(items.userId, user.id)))
          .returning({ id: items.id });
        if (updated.length === 0) throw new Error("not_found");
        await tx.delete(itemRecipients).where(eq(itemRecipients.itemId, itemId));
      } else {
        const count = (await tx.select({ id: items.id }).from(items).where(eq(items.userId, user.id))).length;
        if (count >= MAX_ITEMS) throw new Error("limit");
        const [row] = await tx.insert(items).values({ userId: user.id, kind, payload, shareWithAll }).returning({ id: items.id });
        itemId = row.id;
      }
      if (!shareWithAll && selected.length) {
        await tx.insert(itemRecipients).values(selected.map((recipientId) => ({ itemId: itemId!, recipientId })));
      }
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "not_found") return { error: "This item no longer exists." };
    if (code === "limit") return { error: `You can store up to ${MAX_ITEMS} items.` };
    throw err;
  }
  revalidatePath("/vault");
  revalidatePath("/dashboard");
  return { ok: true, id: itemId! };
}

export async function deleteItemAction(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db.delete(items).where(and(eq(items.id, id), eq(items.userId, user.id)));
  revalidatePath("/vault");
  revalidatePath("/dashboard");
  return { ok: true };
}
