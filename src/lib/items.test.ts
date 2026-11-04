import assert from "node:assert/strict";
import { normalizePayload, storedPayloadSchema } from "./items";

const stored = (p: Record<string, string>) => storedPayloadSchema.parse(p);

// Old subscription: provider / amount / contact become labelled lines above the existing notes.
assert.deepEqual(
  normalizePayload("subscription", stored({ title: "Netflix", provider: "Visa 4242", reference: "me@x.com", amount: "€15.99 / month", contact: "netflix.com", notes: "Cancel it." })),
  { title: "Netflix", reference: "me@x.com", notes: "Billed to: Visa 4242\nCost: €15.99 / month\nWebsite or phone: netflix.com\n\nCancel it." },
);
// "Other" has no find field, so its old reference is kept as a labelled line too.
assert.deepEqual(normalizePayload("other", stored({ title: "Deeds", reference: "REF-1", notes: "" })), {
  title: "Deeds",
  reference: "",
  notes: "Reference: REF-1",
});
// New-style payloads pass through unchanged.
assert.deepEqual(normalizePayload("bank", stored({ title: "ING", reference: "•••• 1234", notes: "Joint" })), {
  title: "ING",
  reference: "•••• 1234",
  notes: "Joint",
});
// Messages keep their body.
assert.deepEqual(normalizePayload("message", stored({ title: "To my family", notes: "Love you" })), { title: "To my family", reference: "", notes: "Love you" });
console.log("normalizePayload: 4 cases ok");
