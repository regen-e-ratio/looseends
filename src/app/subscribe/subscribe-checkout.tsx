"use client";

import { useEffect, useRef, useState } from "react";
import { CheckoutEventNames, initializePaddle, type Paddle } from "@paddle/paddle-js";
import { confirmCheckoutAction } from "@/app/actions/billing";
import { Alert, Button } from "@/components/ui";

type Props = {
  token: string;
  priceId: string;
  environment: "sandbox" | "production";
  email: string;
  userId: string;
  renew: boolean;
  fallbackPrice: string;
  period: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Paddle's overlay checkout, then a short wait until the subscription is confirmed on our side. */
export function SubscribeCheckout({ token, priceId, environment, email, userId, renew, fallbackPrice, period }: Props) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable" | "confirming" | "slow" | "error">("loading");
  const [error, setError] = useState("");
  const confirming = useRef(false);

  useEffect(() => {
    // Only a document loaded at /subscribe has the Content-Security-Policy that allows Paddle (next.config.ts).
    // Arriving by in-app navigation (e.g. a redirect after signing in) keeps the previous page's stricter
    // policy, so load this page properly first.
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && new URL(nav.name).pathname !== "/subscribe") {
      window.location.replace(window.location.href);
      return;
    }
    let active = true;

    async function confirm(transactionId: string) {
      if (confirming.current) return;
      confirming.current = true;
      setPhase("confirming");
      for (let attempt = 0; attempt < 25 && active; attempt++) {
        const result = await confirmCheckoutAction(transactionId).catch(() => ({ status: "pending" as const }));
        if (result.status === "done") {
          window.location.assign(result.next);
          return;
        }
        if (result.status === "error") {
          setError(result.message);
          setPhase("error");
          return;
        }
        await sleep(attempt < 5 ? 1500 : 3000);
      }
      if (active) setPhase("slow");
    }

    initializePaddle({
      environment,
      token,
      eventCallback(event) {
        if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED && event.data?.transaction_id) {
          void confirm(event.data.transaction_id);
        }
      },
    })
      .then((instance) => {
        if (!active) return;
        if (!instance) return setPhase("unavailable");
        setPaddle(instance);
        setPhase("ready");
        // The price in the visitor's currency, with VAT where it is included.
        instance
          .PricePreview({ items: [{ priceId, quantity: 1 }] })
          .then((r) => {
            const total = r.data.details.lineItems[0]?.formattedTotals.total;
            if (active && total) setPrice(total);
          })
          .catch(() => {});
      })
      .catch(() => active && setPhase("unavailable"));
    // Blocked scripts (ad blockers, strict networks) can leave Paddle loading forever.
    const giveUp = setTimeout(() => active && setPhase((p) => (p === "loading" ? "unavailable" : p)), 15_000);
    return () => {
      active = false;
      clearTimeout(giveUp);
    };
  }, [environment, token, priceId]);

  function openCheckout() {
    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email },
      customData: { userId },
      settings: { displayMode: "overlay", theme: "light", allowLogout: false, variant: "one-page" },
    });
  }

  if (phase === "confirming" || phase === "slow") {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <Alert tone="success">Thank you! Your payment went through.</Alert>
        {phase === "confirming" ? (
          <p className="text-sm text-stone-600">Setting up your vault…</p>
        ) : (
          <p className="text-sm text-stone-600">
            This is taking longer than usual. Your payment is safe —{" "}
            <button className="underline" onClick={() => window.location.reload()}>
              refresh this page
            </button>{" "}
            in a minute.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight" data-testid="plan-price">
          {price ?? fallbackPrice}
        </span>
        <span className="text-stone-500">per {period}</span>
      </div>
      {phase === "error" && <Alert tone="danger">{error}</Alert>}
      {phase === "unavailable" && (
        <Alert tone="warning">The payment window couldn&apos;t load. Check your connection or ad blocker, then reload the page.</Alert>
      )}
      <Button className="w-full" onClick={openCheckout} disabled={!paddle}>
        {phase === "loading" ? "Loading…" : renew ? "Renew my subscription" : "Subscribe"}
      </Button>
    </div>
  );
}
