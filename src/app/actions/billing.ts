"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser, startPage } from "@/lib/auth";
import { accessLevel, customerPortalUrl, syncCheckout } from "@/lib/billing";
import { allow } from "@/lib/rate-limit";

export type ConfirmResult = { status: "done"; next: string } | { status: "pending" } | { status: "error"; message: string };

/**
 * Called by the subscribe page right after Paddle's checkout completes, so access starts at once instead of
 * waiting for the webhook (which still arrives and is the source of truth for every later change).
 */
export async function confirmCheckoutAction(transactionId: string): Promise<ConfirmResult> {
  const user = await requireUser();
  const fresh = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (fresh && accessLevel(fresh) === "member") return { status: "done", next: startPage(fresh) };
  if (!/^txn_[a-z0-9]+$/.test(transactionId)) return { status: "error", message: "Unknown payment." };
  if (!(await allow(`billing:confirm:${user.id}`, 60, 60 * 60))) return { status: "pending" };
  try {
    const result = await syncCheckout(user.id, transactionId);
    if (result === "not_yours") return { status: "error", message: "This payment belongs to another account." };
    if (result === "pending") return { status: "pending" };
  } catch (err) {
    // Paddle may not know the transaction for a moment; the webhook will catch up.
    console.error("confirm checkout", err);
    return { status: "pending" };
  }
  const saved = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) });
  if (!saved || accessLevel(saved) !== "member") return { status: "pending" };
  revalidatePath("/", "layout");
  return { status: "done", next: startPage(saved) };
}

/** Opens Paddle's customer portal: invoices, payment method, cancelling. */
export async function openBillingPortalAction() {
  const user = await requireUser();
  if (!user.billingCustomerId) redirect("/subscribe");
  let url: string;
  try {
    url = await customerPortalUrl(user.billingCustomerId, user.billingSubscriptionId);
  } catch (err) {
    console.error("billing portal", err);
    redirect("/settings?billing=unavailable");
  }
  redirect(url);
}
