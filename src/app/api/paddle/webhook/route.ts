import { handlePaddleEvent, webhookSecret } from "@/lib/billing";
import { verifyPaddleSignature } from "@/lib/billing-rules";

export const dynamic = "force-dynamic";

/**
 * Paddle notification destination (Paddle → Developer tools → Notifications; see SETUP.md).
 * Subscribed events: subscription.* and transaction.completed. Any non-2xx answer makes Paddle retry.
 */
export async function POST(req: Request) {
  const secret = webhookSecret();
  if (!secret) return Response.json({ error: "not configured" }, { status: 503 });
  // Verify against the exact bytes Paddle signed, before parsing anything.
  const raw = await req.text();
  const signature = req.headers.get("paddle-signature");
  if (!signature || !verifyPaddleSignature(raw, signature, secret)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }
  let event: { event_type?: unknown; data?: unknown };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  await handlePaddleEvent(event);
  return Response.json({ ok: true });
}
