import type { LandingPage } from "./types";

export const DEFAULT_STEPS: NonNullable<LandingPage["steps"]> = [
  { title: "Write it down", body: "Add accounts, subscriptions, wishes and personal letters. It takes about 15 minutes, and everything is encrypted." },
  { title: "Choose who receives what", body: "Add the people you trust, and decide what each one gets — everything, or only specific items." },
  { title: "Click “I'm OK” now and then", body: "We email you a one-click check-in. If you stop answering, we remind you for a while — and only then pass it on." },
];

export const SHARED_FAQ: LandingPage["faq"] = [
  {
    q: "What if I'm just busy, ill or travelling and miss an email?",
    a: "Nothing is sent on the first missed check-in. We keep reminding you for a grace period you choose (up to 30 days), and you can set check-ins as rarely as every 6 months. Signing in at any time also counts.",
  },
  {
    q: "What if it's released by mistake?",
    a: "You get an email too. Sign in, click one button, and every link your contacts received stops working immediately.",
  },
  {
    id: "safety",
    q: "Is my information safe?",
    a: "Everything you write is encrypted before it's stored, and each contact can only see what you chose to share with them. We never ask for passwords, PINs or seed phrases — and we tell you not to write them down here.",
  },
  { q: "How much does it cost?", a: "Loose Ends is free to use right now. No card needed." },
];
