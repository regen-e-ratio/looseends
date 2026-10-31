import { z } from "zod";

export const ITEM_KINDS = {
  subscription: {
    label: "Subscription",
    plural: "Subscriptions",
    icon: "🔁",
    hint: "Streaming, software, gym, memberships, utilities…",
    fields: {
      title: { label: "Service", placeholder: "Netflix" },
      provider: { label: "Billed to", placeholder: "Visa ending 4242 / PayPal" },
      reference: { label: "Login email / username", placeholder: "me@example.com" },
      amount: { label: "Cost", placeholder: "€15.99 / month" },
      contact: { label: "Website or phone", placeholder: "netflix.com/cancel" },
      notes: { label: "What should happen to it?", placeholder: "Cancel it. The account is in my name only." },
    },
  },
  bank: {
    label: "Bank account",
    plural: "Bank accounts",
    icon: "🏦",
    hint: "Current, savings, credit cards, loans…",
    fields: {
      title: { label: "Bank", placeholder: "ING" },
      provider: { label: "Account type", placeholder: "Joint savings account" },
      reference: { label: "Account / IBAN (consider only the last digits)", placeholder: "NL•• •••• •••• 1234" },
      amount: { label: "Approximate balance", placeholder: "≈ €10,000" },
      contact: { label: "Branch, advisor or phone", placeholder: "+31 20 000 0000" },
      notes: { label: "Notes & instructions", placeholder: "Contact the bereavement team with a death certificate." },
    },
  },
  investment: {
    label: "Investment",
    plural: "Investments",
    icon: "📈",
    hint: "Brokerage, pensions, crypto, property, shares…",
    fields: {
      title: { label: "Platform / institution", placeholder: "Vanguard" },
      provider: { label: "Type", placeholder: "Pension / ETF portfolio / crypto wallet" },
      reference: { label: "Account or reference number", placeholder: "Ends in 9876" },
      amount: { label: "Approximate value", placeholder: "≈ $45,000" },
      contact: { label: "Website, advisor or phone", placeholder: "vanguard.com" },
      notes: { label: "Notes & instructions", placeholder: "Beneficiary is set to my partner. Where the hardware wallet is kept…" },
    },
  },
  insurance: {
    label: "Insurance",
    plural: "Insurance",
    icon: "🛡️",
    hint: "Life, health, home, car…",
    fields: {
      title: { label: "Insurer", placeholder: "Allianz" },
      provider: { label: "Policy type", placeholder: "Life insurance" },
      reference: { label: "Policy number", placeholder: "POL-123456" },
      amount: { label: "Coverage / premium", placeholder: "€200,000 cover" },
      contact: { label: "Website or claims phone", placeholder: "+44 800 000 000" },
      notes: { label: "Notes & instructions", placeholder: "Make a claim within 90 days." },
    },
  },
  digital: {
    label: "Online account",
    plural: "Online accounts",
    icon: "💻",
    hint: "Email, social media, cloud storage, photos…",
    fields: {
      title: { label: "Service", placeholder: "Google account" },
      provider: { label: "What's in it", placeholder: "Email & family photos" },
      reference: { label: "Username / email", placeholder: "me@gmail.com" },
      amount: { label: "Cost (if any)", placeholder: "Free" },
      contact: { label: "Website", placeholder: "myaccount.google.com" },
      notes: { label: "What should happen to it?", placeholder: "Download the photos, then memorialize/close it." },
    },
  },
  other: {
    label: "Other",
    plural: "Other",
    icon: "📁",
    hint: "Property, vehicles, debts, documents, pets…",
    fields: {
      title: { label: "Title", placeholder: "House deeds" },
      provider: { label: "Category", placeholder: "Documents" },
      reference: { label: "Reference", placeholder: "" },
      amount: { label: "Value", placeholder: "" },
      contact: { label: "Contact", placeholder: "Notary: Jane Doe, +1 555 0100" },
      notes: { label: "Notes & instructions", placeholder: "Original is in the fire safe in the study." },
    },
  },
  message: {
    label: "Message",
    plural: "Messages",
    icon: "✉️",
    hint: "A personal letter, wishes or general instructions.",
    fields: {
      title: { label: "Subject", placeholder: "To my family" },
      notes: { label: "Message", placeholder: "Write anything you want them to read…" },
    },
  },
} as const;

export type ItemKind = keyof typeof ITEM_KINDS;
export const KIND_ORDER = Object.keys(ITEM_KINDS) as ItemKind[];
export type FieldName = "title" | "provider" | "reference" | "amount" | "contact" | "notes";
export const FIELD_ORDER: FieldName[] = ["title", "provider", "reference", "amount", "contact", "notes"];

export function isKind(k: unknown): k is ItemKind {
  return typeof k === "string" && k in ITEM_KINDS;
}

export function kindFields(kind: ItemKind): { name: FieldName; label: string; placeholder: string }[] {
  const f = ITEM_KINDS[kind].fields as Partial<Record<FieldName, { label: string; placeholder: string }>>;
  return FIELD_ORDER.filter((n) => f[n]).map((n) => ({ name: n, ...f[n]! }));
}

const opt = (max: number) => z.string().trim().max(max).optional().default("");

export const itemPayloadSchema = z.object({
  title: z.string().trim().min(1, "Please give it a name").max(200),
  provider: opt(200),
  reference: opt(200),
  amount: opt(100),
  contact: opt(300),
  notes: opt(20_000),
});

export type ItemPayload = z.infer<typeof itemPayloadSchema>;
