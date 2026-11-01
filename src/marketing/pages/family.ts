import type { LandingPage } from "../types";

export const family: LandingPage = {
  slug: "family",
  audience: "Older adults (60+), and adult children setting it up with a parent. Lead with the last letter; practical items second.",
  meta: {
    title: "Leave the words that matter — Loose Ends",
    description:
      "Write a letter to your children and grandchildren today. We keep it private and deliver it only when the time comes — with everything else they'll need to know.",
  },
  startHref: "/items/new?kind=message",
  hero: {
    eyebrow: "For the people who will miss you",
    headline: "Some things are too important to leave unsaid.",
    subheadline:
      "Write a letter to your children and grandchildren today. Loose Ends keeps it safe and private, and delivers it to them only when the time comes — together with the practical things they'll need to know.",
    cta: "Write your first letter",
    bullets: ["Free to use", "Private and encrypted", "No passwords to remember"],
  },
  preview: {
    ownerName: "Margaret",
    recipientName: "Daniel",
    letter: {
      title: "My dear Daniel",
      body: "I hope you're reading this with a cup of tea. I am so proud of the man you've become. Please look after your sister, keep the garden going, and play Dad's records loud now and then.",
    },
    items: [
      { icon: "📁", title: "My will", lines: ["Original is with our solicitor", "A copy is in the blue folder, bottom drawer"] },
      { icon: "🛡️", title: "Funeral wishes", lines: ["A small service, lots of flowers", "Please play “Moon River”"] },
    ],
  },
  problem: {
    title: "When the time comes, families are left wondering",
    points: [
      { title: "“What would Mum have wanted?”", body: "Funeral wishes, who gets the ring, who takes care of the cat — guessed at, instead of known." },
      { title: "“Where is everything?”", body: "The will, the pension, the insurance policy, the bills that need cancelling." },
      { title: "Words never said", body: "The thank-you, the apology, the memory you always meant to share." },
    ],
  },
  features: {
    title: "Your voice, when they need it most",
    items: [
      { icon: "✉️", title: "A letter for each person", body: "Write to each child and grandchild separately. Only they will ever read what you wrote to them." },
      { icon: "🕊️", title: "Your wishes, in your words", body: "The service, the music, the keepsakes, the pets. No more guessing." },
      { icon: "📁", title: "The practical things too", body: "Where the will is kept, the pension, the bank, the bills to cancel — all in the same place." },
      { icon: "👵", title: "Simple to use", body: "No passwords to remember: we email you a link to sign in. A family member can sit with you to set it up." },
    ],
  },
  steps: [
    { title: "Write your letters", body: "Take your time. Write a few lines today, and add more whenever you like." },
    { title: "Choose who receives each one", body: "Add your children, grandchildren or a close friend, and pick what each person gets." },
    { title: "Answer an occasional email", body: "Every month or so we'll ask “Are you OK?”. One click is enough. If you stop answering for a while, we deliver your letters." },
  ],
  faq: [
    {
      q: "Will my family be able to read my letters now?",
      a: "No. Nobody sees anything until it's released. You can add them as contacts quietly, or let them know — it's your choice. You can preview exactly what each person will receive.",
    },
    {
      q: "Can my son or daughter help me set it up?",
      a: "Of course. Many people sit down together to do it. The account and the check-in emails are yours, so your letters stay private.",
    },
    {
      q: "Does this replace my will?",
      a: "No — it sits alongside it. Use Loose Ends to tell your family where the will is, who your solicitor is, and the personal things a will doesn't cover.",
    },
  ],
  closing: {
    headline: "Your words will mean more than you know.",
    body: "Write the first few lines today. You can always come back and add more.",
    cta: "Start writing — it's free",
  },
};
