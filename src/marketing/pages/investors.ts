import type { LandingPage } from "../types";

export const investors: LandingPage = {
  slug: "investors",
  audience: "Young professionals (25–40) who invest through apps: brokers, pensions, savings, a bit of crypto. Lead with the scattered-accounts problem.",
  meta: {
    title: "Your portfolio needs a backup plan — Loose Ends",
    description:
      "Brokers, pensions, savings apps. Keep a private map of every account and pass it on automatically to the people you choose if something happens to you.",
  },
  startHref: "/items/new?kind=investment",
  hero: {
    eyebrow: "For people building wealth",
    headline: "Your money is spread across ten apps. Your family knows about none of them.",
    subheadline:
      "Brokerage accounts, pension pots, savings apps, that index fund you set up once. Loose Ends keeps a private map of all of it — and hands it to the people you choose if something ever happens to you.",
    cta: "Map my accounts — free",
    bullets: ["Takes 15 minutes", "Never asks for logins", "Free to use"],
  },
  preview: {
    ownerName: "Jordan",
    recipientName: "Priya",
    letter: { title: "A message for you", body: "Pri — it's all here. The pension and the brokerage account are the big ones. Love you." },
    items: [
      { icon: "📈", title: "Brokerage account", lines: ["Global index ETFs · ≈ €18,400", "You're the nominated beneficiary"] },
      { icon: "📈", title: "Workplace pension", lines: ["Two pots from old jobs — consolidate them", "Ask HR for the scheme details"] },
      { icon: "🏦", title: "High-yield savings app", lines: ["Emergency fund · ≈ €9,000"] },
      { icon: "🪙", title: "Crypto exchange account", lines: ["Small BTC position · see recovery notes"] },
    ],
  },
  problem: {
    title: "Modern money leaves no paper trail",
    intro: "Your parents had a filing cabinet. You have a phone full of apps.",
    points: [
      { title: "Nobody knows it exists", body: "App-only accounts send no letters. If nobody knows about an account, nobody claims it." },
      { title: "Nobody can get in", body: "Two-factor codes go to your phone. Your family needs to know which company to contact, and how." },
      { title: "Subscriptions keep charging", body: "Software, streaming, gym, cloud storage — billing month after month until someone finds them." },
    ],
  },
  features: {
    title: "A financial map for the people you trust",
    items: [
      { icon: "🧭", title: "Every account in one place", body: "Investments, pensions, bank accounts, insurance, crypto and subscriptions — with approximate values and what to do with each." },
      { icon: "👥", title: "Who gets what", body: "Your partner sees everything; your parents only the pension details. Share each item with exactly the right people." },
      { icon: "⏱️", title: "Set it and forget it", body: "Pick a check-in every 90 or 180 days. One click in an email and you're done until next time." },
      { icon: "🔒", title: "No logins, ever", body: "We never ask for passwords. You record where things are and who to contact — encrypted before it's stored." },
    ],
  },
  faq: [
    {
      q: "I'm 30. Isn't this a bit early?",
      a: "Accidents don't check your age — and the younger you are, the more likely your money lives in apps nobody else knows about. It takes 15 minutes; update it once a year.",
    },
    {
      q: "Do I need to give you my logins or account numbers?",
      a: "No, and please don't. Write the provider, roughly what's there, and who your family should contact. That's all they need to start the process.",
    },
  ],
  closing: {
    headline: "You diversified your portfolio. Now back it up.",
    body: "List your three biggest accounts today. It takes less time than rebalancing.",
    cta: "Map my accounts — free",
  },
};
