import type { LandingPage } from "../types";

export const home: LandingPage = {
  slug: "",
  audience: "Default homepage — organic and direct traffic.",
  meta: {
    title: "Loose Ends — tie up your loose ends",
    description:
      "Write down your accounts, subscriptions and last wishes, and make sure they reach the right people if something happens to you.",
  },
  hero: {
    eyebrow: "Tie up your loose ends",
    headline: "So the people you love aren't left untangling them.",
    subheadline:
      "If something happened to you tomorrow, would anyone know about your bank accounts, investments, subscriptions or last wishes? Loose Ends is a private place to write them down. If you stop checking in, we pass them on to the people you chose — and only them.",
    cta: "Start your vault",
    bullets: ["Everything included", "Encrypted", "No passwords stored"],
  },
  preview: {
    ownerName: "Alex",
    recipientName: "Sam",
    letter: { title: "A message for you", body: "Sam — everything you need is below. Don't rush any of it. Thank you for everything." },
    items: [
      { icon: "🏦", title: "Current account", lines: ["Main bank · ≈ €6,200", "Bereavement team handles closures"] },
      { icon: "📈", title: "Workplace pension", lines: ["You are the named beneficiary"] },
      { icon: "🔁", title: "Streaming & gym", lines: ["4 subscriptions · €63 / month", "Cancel all of them"] },
    ],
  },
  problem: {
    title: "Most of our lives are invisible to the people we leave behind",
    points: [
      { title: "Accounts nobody knows about", body: "App-only banks, pensions from old jobs, savings opened once and forgotten." },
      { title: "Bills that keep charging", body: "Subscriptions quietly drain the account for months while the family searches for them." },
      { title: "Words left unsaid", body: "Wishes for the funeral, the keepsakes, the pets — and the things you'd want them to hear." },
    ],
  },
  features: {
    title: "Everything they'll need, in one place",
    items: [
      { icon: "🗂️", title: "One private vault", body: "Subscriptions, bank accounts, investments, insurance, crypto, online accounts and letters." },
      { icon: "👥", title: "The right info for each person", body: "Your partner gets everything; your brother only the car and the house keys. You decide." },
      { icon: "🛡️", title: "A switch that's hard to trip", body: "Reminders and a grace period before anything is sent, and one click to undo it." },
      { icon: "🔒", title: "Private by design", body: "Encrypted at rest, and we never ask for passwords, PINs or seed phrases." },
    ],
  },
  faq: [],
  closing: {
    headline: "Fifteen minutes now saves them months later.",
    body: "Start with the three things that would be hardest for your family to find.",
    cta: "Start your vault",
  },
};
