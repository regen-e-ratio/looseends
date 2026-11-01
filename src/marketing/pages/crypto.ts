import type { LandingPage } from "../types";

export const crypto: LandingPage = {
  slug: "crypto",
  audience: "Self-custody crypto holders. Security-literate and sceptical: lead with 'we never touch your keys', be precise about encryption.",
  meta: {
    title: "Don't let your coins die with your keys — Loose Ends",
    description:
      "A dead man's switch for self-custody crypto. Tell your heirs which wallets exist, where the backups are and how to recover them — without ever storing a seed phrase.",
  },
  startHref: "/items/new?kind=crypto",
  hero: {
    eyebrow: "For self-custody holders",
    headline: "Not your keys, not your coins. Not your heirs' either — unless they know.",
    subheadline:
      "If you hold your own crypto and something happens to you, it can be gone for good. Loose Ends gives your people the map — which wallets exist, where the backups are, who can help — without ever storing your seed phrase.",
    cta: "Map my wallets — free",
    bullets: ["Zero seed phrases stored", "Dead man's switch", "Free to use"],
  },
  preview: {
    ownerName: "Chris",
    recipientName: "Mia",
    letter: { title: "Read this first", body: "Mia — don't panic, don't rush, and don't trust anyone who DMs you offering help. Call Sam first." },
    items: [
      { icon: "🪙", title: "Hardware wallet — cold storage", lines: ["Device: home safe, top shelf", "Backup: steel plate at Mum's house", "No passphrase"] },
      { icon: "🪙", title: "Exchange account", lines: ["Login email: my personal Gmail", "2FA app on my phone; recovery codes in the safe"] },
      { icon: "👥", title: "Who can help", lines: ["Sam knows how to restore the wallet"] },
    ],
  },
  problem: {
    title: "There's no “forgot my seed phrase” button",
    points: [
      { title: "Your family may not know you hold crypto at all", body: "No statements, no letters, no paper trail. If nobody knows, nobody looks." },
      { title: "Finding the device isn't enough", body: "Which wallet? Which app? Where's the backup? Is there a passphrase? Every missing answer can lock it away for good." },
      { title: "Heirs are scam magnets", body: "Grieving relatives searching “how to recover crypto” are exactly who scammers target." },
    ],
  },
  features: {
    title: "Inheritance for people who hold their own keys",
    items: [
      { icon: "🚫", title: "Zero seed phrases. Ever.", body: "We tell you never to store keys here. You record where the backups are and how to recover — the keys themselves stay with you." },
      { icon: "🧩", title: "Split knowledge", body: "Share each item with different people: one learns where the device is, another where the backup is. No single person — and no single breach — has everything." },
      { icon: "📋", title: "A recovery playbook", body: "Step-by-step notes for each wallet: which device and app, which network, who to call, and what not to do." },
      { icon: "⏳", title: "A switch you control", body: "Check in every 7 to 180 days. Reminders and a grace period before release, and one click to revoke every link." },
    ],
  },
  faq: [
    {
      q: "Should I store my seed phrase here?",
      a: "No. Never. Not here, not anywhere online. Loose Ends is for the map — what exists, where the backups are, and who can help — not for keys.",
    },
    {
      q: "Can Loose Ends access my crypto?",
      a: "No. We never hold keys, never connect to wallets, and never ask for addresses. Your vault only describes where things are.",
    },
    {
      id: "safety",
      q: "How is my vault protected?",
      a: "Contents are encrypted with AES-256-GCM before they hit the database, links are long random tokens, and each contact only sees the items you shared with them. It is not end-to-end encrypted — which is exactly why you should never put keys in it.",
    },
  ],
  closing: {
    headline: "Your coins shouldn't die with your keys.",
    body: "Write the recovery map for your biggest wallet today. Ten minutes, no seed phrase required.",
    cta: "Map my wallets — free",
  },
};
