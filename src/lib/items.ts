import { z } from "zod";

type Field = { label: string; placeholder: string };

/**
 * What can be stored in the vault. Every kind has the same simple shape:
 * - `title`: the name (required)
 * - `find`:  the one thing needed to find it (stored as `reference`), when the kind has one
 * - `notes`: free text, with a faint placeholder and `ideas` shown in an info tooltip
 */
export const ITEM_KINDS = {
  subscription: {
    label: "Subscription",
    plural: "Subscriptions",
    icon: "🔁",
    hint: "Streaming, software, gym, phone plan…",
    title: { label: "Service", placeholder: "e.g. Netflix" },
    find: { label: "Account email", placeholder: "Email used for this account" },
    notes: {
      label: "Notes",
      placeholder: "Cancel it, or keep it for the family? Anything they should know.",
      ideas: ["What it costs and how it's paid", "Cancel it, or keep it — and for whom", "How to cancel: website, phone or app", "Who else uses it"],
    },
  },
  bank: {
    label: "Bank account",
    plural: "Bank accounts",
    icon: "🏦",
    hint: "Current, savings, credit cards, loans…",
    title: { label: "Bank", placeholder: "e.g. ING" },
    find: { label: "Account", placeholder: "Last digits, e.g. •••• 1234" },
    notes: {
      label: "Notes",
      placeholder: "What should happen to this account?",
      ideas: ["Type: current, savings, credit card, loan", "Roughly how much is in it", "Joint, or only in your name", "Branch or advisor to contact", "Where cards and statements are kept"],
    },
  },
  investment: {
    label: "Investment",
    plural: "Investments",
    icon: "📈",
    hint: "Brokerage, pensions, shares, property…",
    title: { label: "Platform or institution", placeholder: "e.g. Vanguard" },
    find: { label: "Account email or number", placeholder: "Login email or account number" },
    notes: {
      label: "Notes",
      placeholder: "Anything they need to know to claim it.",
      ideas: ["Type: pension, funds, shares, property", "Roughly what it's worth", "Named beneficiaries", "Advisor or platform contact", "Where the documents are"],
    },
  },
  crypto: {
    label: "Crypto wallet",
    plural: "Crypto wallets",
    icon: "🪙",
    hint: "Hardware wallets, exchange accounts…",
    warning: "Never write your seed phrase, private keys or PINs here — not even partly.",
    title: { label: "Wallet or exchange", placeholder: "e.g. Hardware wallet" },
    find: { label: "Where to find it", placeholder: "e.g. home safe, or login email" },
    notes: {
      label: "How to recover it",
      placeholder: "Steps to recover it — never the seed phrase itself.",
      ideas: [
        "Which coins, and roughly how much",
        "Which wallet app to install",
        "Where the backup is kept (not the words)",
        "Whether there's a passphrase",
        "Who can help — and to ignore anyone offering “recovery” help",
      ],
    },
  },
  insurance: {
    label: "Insurance",
    plural: "Insurance",
    icon: "🛡️",
    hint: "Life, health, home, car…",
    title: { label: "Insurer", placeholder: "e.g. Allianz life insurance" },
    find: { label: "Policy number", placeholder: "e.g. POL-123456" },
    notes: {
      label: "Notes",
      placeholder: "How to make a claim.",
      ideas: ["Type of policy and what it covers", "Who the beneficiaries are", "Claims phone number or website", "Deadlines to claim", "Where the policy documents are"],
    },
  },
  digital: {
    label: "Online account",
    plural: "Online accounts",
    icon: "💻",
    hint: "Email, social media, cloud storage, photos…",
    title: { label: "Service", placeholder: "e.g. Google account" },
    find: { label: "Username or email", placeholder: "How you sign in" },
    notes: {
      label: "Notes",
      placeholder: "Delete it, memorialise it or keep it?",
      ideas: ["What's in it: photos, documents, email", "Anything to download first", "Delete, memorialise or keep it", "Where the password is kept (never the password)"],
    },
  },
  other: {
    label: "Other",
    plural: "Other",
    icon: "📁",
    hint: "Property, vehicles, documents, pets…",
    title: { label: "What is it?", placeholder: "e.g. House deeds" },
    notes: {
      label: "Notes",
      placeholder: "Everything they need to know about it.",
      ideas: ["Where it is", "Who to contact", "What you'd like to happen to it", "Documents that prove ownership"],
    },
  },
  message: {
    label: "Message",
    plural: "Messages",
    icon: "✉️",
    hint: "A personal letter, wishes or instructions.",
    title: { label: "Subject", placeholder: "e.g. To my family" },
    notes: {
      label: "Message",
      placeholder: "Write anything you want them to read…",
      ideas: ["A thank-you", "Memories you want to share", "Your wishes for the funeral", "Advice for the years ahead"],
    },
  },
} as const satisfies Record<
  string,
  { label: string; plural: string; icon: string; hint: string; warning?: string; title: Field; find?: Field; notes: Field & { ideas: readonly string[] } }
>;

export type ItemKind = keyof typeof ITEM_KINDS;
export const KIND_ORDER = Object.keys(ITEM_KINDS) as ItemKind[];

export function isKind(k: unknown): k is ItemKind {
  // Own keys only: `"toString" in ITEM_KINDS` is true too.
  return typeof k === "string" && Object.hasOwn(ITEM_KINDS, k);
}

/** The "how to find it" field of a kind, if it has one. */
export function findField(kind: ItemKind): Field | null {
  const k = ITEM_KINDS[kind];
  return "find" in k ? k.find : null;
}

export function kindWarning(kind: ItemKind): string | null {
  const k = ITEM_KINDS[kind];
  return "warning" in k ? k.warning : null;
}

/** What the app works with. */
export type ItemPayload = { title: string; reference: string; notes: string };

const opt = (max: number) => z.string().trim().max(max).optional().default("");

/** One item, as the editor submits it and as it is stored (encrypted). */
export const itemInputSchema = z.object({
  title: z.string().trim().min(1, "Please give it a name").max(200),
  reference: opt(200),
  notes: opt(20_000),
});
