import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Recipient } from "@/db/schema";
import { decrypt, decryptNullable, encrypt } from "./crypto";
import { isKind, itemPayloadSchema, type ItemKind, type ItemPayload } from "./items";

const { items, itemRecipients, recipients } = schema;

export type VaultItem = ItemPayload & {
  id: string;
  kind: ItemKind;
  shareWithAll: boolean;
  recipientIds: string[];
  updatedAt: Date;
};

export type RecipientView = Omit<Recipient, "personalMessage" | "accessTokenHash" | "claimTokenHash"> & {
  personalMessage: string | null;
};

function decodePayload(payload: string): ItemPayload {
  return itemPayloadSchema.parse(JSON.parse(decrypt(payload)));
}

export function encodePayload(p: ItemPayload): string {
  return encrypt(JSON.stringify(p));
}

export async function listItems(userId: string): Promise<VaultItem[]> {
  const rows = await db.select().from(items).where(eq(items.userId, userId)).orderBy(asc(items.createdAt));
  if (rows.length === 0) return [];
  const links = await db
    .select()
    .from(itemRecipients)
    .where(inArray(itemRecipients.itemId, rows.map((r) => r.id)));
  return rows.map((r) => ({
    ...decodePayload(r.payload),
    id: r.id,
    kind: isKind(r.kind) ? r.kind : "other",
    shareWithAll: r.shareWithAll,
    recipientIds: links.filter((l) => l.itemId === r.id).map((l) => l.recipientId),
    updatedAt: r.updatedAt,
  }));
}

export async function getItem(userId: string, id: string): Promise<VaultItem | null> {
  const all = await listItems(userId);
  return all.find((i) => i.id === id) ?? null;
}

export async function listRecipients(userId: string): Promise<RecipientView[]> {
  const rows = await db.select().from(recipients).where(eq(recipients.userId, userId)).orderBy(asc(recipients.createdAt));
  return rows.map(toRecipientView);
}

export async function getRecipient(userId: string, id: string): Promise<RecipientView | null> {
  const row = await db.query.recipients.findFirst({ where: and(eq(recipients.userId, userId), eq(recipients.id, id)) });
  return row ? toRecipientView(row) : null;
}

export function toRecipientView(r: Recipient): RecipientView {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessTokenHash, claimTokenHash, personalMessage, ...rest } = r;
  return { ...rest, personalMessage: decryptNullable(personalMessage) };
}

export function itemsVisibleTo(all: VaultItem[], recipientId: string): VaultItem[] {
  return all.filter((i) => i.shareWithAll || i.recipientIds.includes(recipientId));
}
