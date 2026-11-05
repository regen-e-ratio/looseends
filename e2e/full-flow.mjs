// End-to-end test of the whole product against a running server that prints emails to its log
// (no email provider configured). Usage:
//   SERVER_LOG=/tmp/server.log BASE_URL=http://localhost:3000 DATABASE_URL=... node e2e/full-flow.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // uses the globally installed Playwright (NODE_PATH)
import { readFileSync, mkdirSync } from "node:fs";
import postgres from "postgres";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const LOG = process.env.SERVER_LOG || "/tmp/server.log";
const SHOTS = process.env.SHOTS || "/tmp/shots";
const CRON_SECRET = process.env.CRON_SECRET;
const PADDLE_SECRET = process.env.PADDLE_WEBHOOK_SECRET;
mkdirSync(SHOTS, { recursive: true });
const sql = postgres(process.env.DATABASE_URL);

const owner = `owner+${Date.now()}@example.com`;
const anna = `anna+${Date.now()}@example.com`;
const bob = `bob+${Date.now()}@example.com`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function lastLink(to, pathPart) {
  for (let i = 0; i < 20; i++) {
    const log = readFileSync(LOG, "utf8");
    const blocks = log.split("📧 [dev email]").filter((b) => b.includes(`to=${to} `));
    const links = blocks.flatMap((b) => b.match(new RegExp(`${BASE}${pathPart}[^\\s]+`, "g")) ?? []);
    if (links.length) return links.at(-1);
    await sleep(250);
  }
  throw new Error(`no ${pathPart} email for ${to}`);
}
/** All dev emails to `to` (raw text blocks from the server log). */
const mailsTo = (to) => readFileSync(LOG, "utf8").split("📧 [dev email]").filter((b) => b.includes(`to=${to} `));
const emailsTo = (to) => readFileSync(LOG, "utf8").split("📧 [dev email]").filter((b) => b.includes(`to=${to} `)).length;
async function cron() {
  const r = await fetch(`${BASE}/api/cron/check-switches`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  assert.equal(r.status, 200);
  return r.json();
}
const step = (s) => console.log("•", s);

/** Sends a Paddle webhook signed like Paddle does (Paddle-Signature: ts=…;h1=HMAC-SHA256("ts:body")). */
async function paddleWebhook(event, secret = PADDLE_SECRET) {
  const body = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return fetch(`${BASE}/api/paddle/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "paddle-signature": `ts=${ts};h1=${h1}` },
    body,
  });
}
let eventSeq = 0;
/** A subscription event as Paddle sends it; `minutes` orders events in time (later = newer). */
function subscriptionEvent(type, { id = "sub_e2ea", status, minutes, userId, cancel = false }) {
  const at = (m) => new Date(Date.UTC(2026, 10, 4, 12, m)).toISOString();
  return {
    event_id: `evt_e2e${++eventSeq}`,
    event_type: type,
    occurred_at: at(minutes),
    data: {
      id,
      status,
      customer_id: "ctm_e2e",
      updated_at: at(minutes),
      current_billing_period: { starts_at: at(0), ends_at: "2027-11-04T12:00:00.000000Z" },
      scheduled_change: cancel ? { action: "cancel", effective_at: "2027-11-04T12:00:00.000000Z", resume_at: null } : null,
      custom_data: userId ? { userId } : null,
      items: [{ price: { id: "pri_e2e" }, quantity: 1 }],
    },
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR", e));
// Any Content-Security-Policy violation means the policy blocks something the app needs.
const cspViolations = [];
page.on("console", (m) => {
  if (/Content Security Policy/i.test(m.text())) cspViolations.push(m.text());
});
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });

try {
  step("marketing pages, robots and sitemap");
  for (const slug of ["family", "investors", "crypto"]) {
    for (const path of [`/for/${slug}`, `/for/${slug}/a`, `/for/${slug}/b`, `/for/${slug}/c`]) {
      assert.equal((await fetch(`${BASE}${path}`)).status, 200, path);
    }
  }
  assert.equal((await fetch(`${BASE}/for/does-not-exist`)).status, 404);
  assert.equal((await fetch(`${BASE}/for/crypto/zz`)).status, 404);
  assert.match(await (await fetch(`${BASE}/for/crypto/b`)).text(), /<meta name="robots" content="noindex/, "alternatives not indexed");
  assert.doesNotMatch(await (await fetch(`${BASE}/for/crypto`)).text(), /<meta name="robots" content="noindex/, "default indexed");
  assert.match(await (await fetch(`${BASE}/robots.txt`)).text(), /Disallow: \//);
  assert.match(await (await fetch(`${BASE}/sitemap.xml`)).text(), /\/for\/crypto/);
  assert.equal((await fetch(`${BASE}/for/crypto`)).headers.get("x-robots-tag"), null, "ad pages indexable");
  assert.match((await fetch(`${BASE}/login`)).headers.get("x-robots-tag") ?? "", /noindex/);
  await page.goto(BASE);
  await page.getByRole("link", { name: "Start your vault" }).first().waitFor();
  await page.getByText("Free to write. One plan to switch it on.").waitFor();
  for (const path of ["/terms", "/privacy", "/refunds"]) assert.equal((await fetch(`${BASE}${path}`)).status, 200, path);
  assert.match(await (await fetch(`${BASE}/terms`)).text(), /Paddle\.com is the Merchant of Record/);
  await shot("01-landing");

  step("arrive from a crypto ad → homepage → sign up");
  await page.goto(`${BASE}/for/crypto?utm_source=e2e&utm_campaign=launch`);
  await shot("01b-ad-crypto");
  await page.waitForFunction(() => document.querySelector('main a[href*="from=crypto"][href*="utm_campaign=launch"]'));
  await page.locator("main a[href^='/?']").first().click();
  await page.waitForURL(/\/\?from=crypto&utm_source=e2e&utm_campaign=launch$/);
  await page.waitForFunction(() => document.querySelector('a[href^="/login?from=crypto"][href*="utm_campaign=launch"]'));
  await page.getByRole("link", { name: "Start your vault" }).first().click();
  await page.waitForURL(/\/login\?from=crypto/);

  step("request login link");
  await page.getByLabel("Email address").fill(owner);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByText("Check your email").waitFor();
  await shot("02-check-email");

  step("verify link (GET must not consume token)");
  const loginLink = await lastLink(owner, "/auth/verify");
  await page.goto(loginLink);
  await page.goto(loginLink); // simulate scanner prefetch + real click
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/onboarding");
  const [attr] = await sql`select id, signup_source, signup_campaign from users where email=${owner}`;
  assert.equal(attr.signup_source, "crypto");
  assert.equal(attr.signup_campaign, "utm_source=e2e&utm_campaign=launch");
  const ownerId = attr.id;

  step("onboarding is required for new users; crypto ad → wallet suggestions");
  await page.goto(`${BASE}/dashboard`);
  await page.waitForURL("**/onboarding");
  await page.getByRole("button", { name: "+ Hardware wallet" }).waitFor();
  await shot("03-onboarding-1");

  step("onboarding phase 1: name, a message, a subscription");
  await page.getByLabel("Your name").fill("Joana Example");
  await page.getByLabel("Message", { exact: true }).fill("I love you all. Don't fight over the record collection.");
  await page.getByRole("button", { name: "+ Netflix" }).click();
  const netflixAccount = page.getByLabel("Netflix: account email");
  assert.equal(await netflixAccount.inputValue(), owner, "account email is pre-filled with the user's address");
  await page.getByRole("region", { name: "Write it down" }).getByRole("button", { name: "Continue" }).click();
  await page.getByText("2 items saved to your vault").waitFor();
  await page.getByLabel("Person 1 name").waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Person 1 name");
  await shot("03-onboarding-2");

  step("reload resumes at phase 2");
  await page.reload();
  await page.getByText("2 items saved to your vault").waitFor();
  assert.equal(await page.locator('[aria-current="step"]').innerText().then((t) => t.includes("Your people")), true);

  step("onboarding phase 2: add people");
  await page.getByLabel("Person 1 name").fill("Anna Example");
  await page.getByLabel("Person 1 email").fill(anna);
  assert.equal(await page.getByLabel("Person 1 relationship").count(), 0, "no relationship field in onboarding");
  await page.getByRole("button", { name: "+ Add another person" }).click();
  await page.getByLabel("Person 2 name").fill("Bob Example");
  await page.getByLabel("Person 2 email").fill(bob);
  await page.getByRole("region", { name: "Your people" }).getByRole("button", { name: "Continue" }).click();
  await page.getByText("Added Anna Example, Bob Example").waitFor();
  assert.equal(emailsTo(anna), 0, "nobody is emailed before the mode is chosen");
  await shot("03-onboarding-3");

  step("onboarding phase 3: tooltips explain the choice; choose check-ins and finish");
  assert.ok(await page.getByRole("button", { name: "Finish and activate" }).isDisabled(), "a choice is required");
  const claimInfo = page.getByRole("button", { name: "What does “Contacts can claim” mean?" });
  await claimInfo.hover();
  await page.getByRole("tooltip").filter({ hasText: "We never email you on a schedule" }).waitFor();
  await shot("03-onboarding-tooltip");
  await page.mouse.move(0, 0);
  await page.getByRole("tooltip").filter({ hasText: "We never email you on a schedule" }).waitFor({ state: "hidden" });
  await claimInfo.click(); // tap on touch screens: stays open, doesn't select the card
  await page.mouse.move(0, 0);
  await page.getByRole("tooltip").filter({ hasText: "We never email you on a schedule" }).waitFor();
  assert.equal(await page.getByRole("radio", { name: /Contacts can claim/ }).isChecked(), false);
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: /Periodic check-ins/ }).check();
  await page.getByText("Next, activate your switch").waitFor();
  await page.getByRole("button", { name: "Finish and activate" }).click();

  step("without a subscription the switch stays off; activating it goes to the subscribe page");
  await page.waitForURL("**/subscribe?welcome=1");
  await page.getByRole("heading", { name: "Your vault is ready" }).waitFor();
  assert.match(await page.getByTestId("plan-price").innerText(), /€39/);
  await shot("03b-subscribe");
  assert.equal((await sql`select switch_enabled, switch_mode from users where id=${ownerId}`)[0].switch_enabled, false);
  assert.equal(emailsTo(anna), 1, "anna gets 'you were added' email");
  await page.getByRole("link", { name: "Not now — back to my vault" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByText("Your vault is ready — activate your release switch").waitFor();
  await page.goto(`${BASE}/settings`);
  await page.getByText("Not subscribed").waitFor();
  await page.getByLabel(/Switch is off/).check();
  await page.getByRole("button", { name: "Save and subscribe to turn it on" }).click();
  await page.waitForURL("**/subscribe");
  await page.getByRole("heading", { name: "Activate your release switch" }).waitFor();
  assert.equal((await sql`select switch_enabled from users where id=${ownerId}`)[0].switch_enabled, false, "still off");
  assert.match((await fetch(`${BASE}/subscribe`, { redirect: "manual" })).headers.get("content-security-policy") ?? "", /frame-src https:\/\/buy\.paddle\.com/);
  assert.doesNotMatch((await fetch(`${BASE}/login`)).headers.get("content-security-policy") ?? "", /paddle/, "Paddle only on /subscribe");

  step("Paddle webhooks: signature required");
  const created = subscriptionEvent("subscription.created", { status: "active", minutes: 1, userId: ownerId });
  assert.equal((await fetch(`${BASE}/api/paddle/webhook`, { method: "POST", body: JSON.stringify(created) })).status, 401);
  assert.equal((await paddleWebhook(created, "wrong-secret")).status, 401);
  assert.equal((await sql`select billing_status from users where id=${ownerId}`)[0].billing_status, "none");

  step("paying turns the switch on with the chosen settings");
  assert.equal((await paddleWebhook(created)).status, 200);
  assert.equal((await paddleWebhook(created)).status, 200, "a repeated event is harmless");
  const [paid] = await sql`select billing_status, switch_enabled, switch_mode from users where id=${ownerId}`;
  assert.deepEqual([paid.billing_status, paid.switch_enabled, paid.switch_mode], ["active", true, "checkin"]);
  await page.goto(`${BASE}/subscribe`);
  await page.waitForURL("**/dashboard");
  await page.getByText("Your switch is active").waitFor();
  await shot("03-dashboard-after-onboarding");
  await page.goto(`${BASE}/onboarding`);
  await page.waitForURL("**/dashboard");

  step("token is single use");
  const p2 = await browser.newPage();
  await p2.goto(loginLink);
  await p2.getByText("This link has expired").waitFor();
  await p2.close();

  step("vault page: add from the menu; the URL follows the selection; no page reloads");
  await page.goto(`${BASE}/vault`);
  await page.getByText("2 items").waitFor();
  await page.evaluate(() => (window.__sameDocument = true));
  const sameDocument = () => page.evaluate(() => window.__sameDocument === true);
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByRole("menuitem", { name: /Bank account/ }).click();
  await page.waitForURL("**/vault?new=bank");
  await page.getByLabel("Bank", { exact: true }).fill("ING");
  await page.getByLabel("Account", { exact: true }).fill("•••• 1234");
  await page.getByLabel("Notes").fill("Bereavement team");
  await page.getByRole("button", { name: "Add to vault" }).click();
  await page.waitForURL(/\/vault\?item=[0-9a-f-]{36}$/);
  await page.getByText("✓ Saved").waitFor();
  await page.getByRole("button", { name: /^ING/ }).waitFor(); // now in the list on the left
  await page.getByText("3 items").waitFor();
  assert.ok(await sameDocument(), "adding an item doesn't reload the page");
  await shot("05-vault-bank");

  step("vault page: validation, switching keeps drafts, back button, discard");
  await page.getByRole("button", { name: "+ Add" }).click();
  await page.getByRole("menuitem", { name: /Investment/ }).click();
  await page.getByRole("button", { name: "Add to vault" }).click();
  await page.getByText("Please give it a name").waitFor();
  assert.ok(page.url().endsWith("/vault?new=investment"));
  await page.getByRole("button", { name: /^Netflix/ }).click();
  await page.waitForURL(/\/vault\?item=/);
  await page.getByRole("heading", { name: "Netflix" }).waitFor();
  assert.equal(await page.getByLabel("Account email").inputValue(), owner, "account email from onboarding");
  await page.getByLabel("Notes").fill("Cancel it please");
  const netflixUrl = page.url();
  // Switching away without saving keeps a draft (no prompt), marked in the list.
  await page.getByRole("button", { name: /^ING/ }).click();
  await page.getByRole("heading", { name: "ING" }).waitFor();
  await page.getByText("Unsaved", { exact: true }).waitFor();
  // Browser Back returns to Netflix with the draft restored.
  await page.goBack();
  await page.getByRole("heading", { name: "Netflix" }).waitFor();
  assert.equal(page.url(), netflixUrl);
  assert.equal(await page.getByLabel("Notes").inputValue(), "Cancel it please");
  await page.getByText("Unsaved changes").waitFor();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("✓ Saved").waitFor();
  assert.equal(await page.getByText("Unsaved", { exact: true }).count(), 0, "saved → no longer marked unsaved");
  // Discard throws a draft away and shows the saved values again.
  await page.getByRole("button", { name: /^ING/ }).click();
  await page.getByRole("heading", { name: "ING" }).waitFor();
  await page.getByLabel("Notes").fill("typo typo");
  await page.getByRole("button", { name: "Discard" }).click();
  assert.equal(await page.getByLabel("Notes").inputValue(), "Bereavement team");
  assert.ok(await sameDocument(), "switching items doesn't reload the page");
  // Unknown types in the URL (even inherited object keys) don't crash the page.
  await page.goto(`${BASE}/vault?new=toString`);
  await page.getByRole("heading", { name: "Add something to your vault" }).waitFor();
  await page.evaluate(() => (window.__sameDocument = true));

  step("vault page: ideas tooltip");
  await page.getByRole("button", { name: /^ING/ }).click();
  await page.getByRole("button", { name: "Ideas for what to write about this bank account" }).hover();
  await page.getByRole("tooltip").filter({ hasText: "Roughly how much is in it" }).waitFor();
  await shot("05-vault-tooltip");
  await page.mouse.move(0, 0);

  step("give Anna a personal message");
  const [{ id: annaId }] = await sql`select id from recipients where email=${anna}`;
  await page.goto(`${BASE}/contacts/${annaId}`);
  assert.equal(await page.getByLabel(/Relationship/).count(), 0, "no relationship field on the contact form");
  await page.getByLabel("Personal message").fill("Anna, you were the best sister.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/contacts?saved=1");
  await shot("04-contacts");

  step("share bank only with Bob (from the dashboard into the vault)");
  await page.goto(`${BASE}/dashboard`);
  await page.getByRole("link", { name: /ING/ }).click();
  await page.waitForURL(/\/vault\?item=/);
  await page.getByRole("heading", { name: "ING" }).waitFor();
  await page.getByText("Only some people").click();
  await page.getByLabel(/Bob Example/).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("✓ Saved").waitFor();
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Bob Example", { exact: true }).waitFor();
  await shot("05-dashboard-items");

  step("data is encrypted at rest");
  const rows = await sql`select payload from items i join users u on u.id=i.user_id where u.email=${owner}`;
  assert.equal(rows.length, 3);
  for (const r of rows) assert.ok(r.payload.startsWith("v2.") && !r.payload.includes("Netflix"));

  step("vault page: delete");
  await page.goto(`${BASE}/vault?new=other`);
  await page.getByLabel("What is it?").fill("Temporary note");
  await page.getByRole("button", { name: "Add to vault" }).click();
  await page.getByText("4 items").waitFor();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/vault$/);
  await page.getByRole("button", { name: /^Temporary note/ }).waitFor({ state: "detached" }); // list refreshes without a reload
  await page.getByText("3 items").waitFor();

  step("preview as Anna (no bank)");
  await page.goto(`${BASE}/preview/${annaId}`);
  await page.getByText("Anna, you were the best sister.").waitFor();
  assert.equal(await page.getByText("ING", { exact: true }).count(), 0);
  await page.getByText("Netflix").waitFor();
  await shot("06-preview-anna");

  step("enable switch");
  await page.goto(`${BASE}/settings`);
  assert.ok(await page.getByLabel(/Switch is on/).isChecked(), "onboarding turned the switch on");
  await page.getByLabel("Ask me to check in every").selectOption("7");
  await page.getByLabel("If I don't respond, release after").selectOption("3");
  await page.getByRole("button", { name: "Save switch settings" }).click();
  await page.getByText("Saved. Your timer starts from today.").waitFor();
  await page.getByRole("button", { name: "Send me a test reminder email" }).click();
  await page.getByText("Test reminder sent").waitFor();
  await shot("07-settings");
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Your switch is active").waitFor();

  step("cron: nothing due yet");
  let res = await cron();
  assert.equal(res.error, 0, JSON.stringify(res));
  let [u] = await sql`select switch_status, last_reminder_at from users where email=${owner}`;
  assert.equal(u.switch_status, "active", "not due → nothing happens");

  step("8 days pass → reminder email");
  await sql`update users set last_check_in_at = now() - interval '8 days' where email=${owner}`;
  res = await cron();
  assert.ok(res.start_warning >= 1, JSON.stringify(res));
  const checkLink = await lastLink(owner, "/check-in");

  step("one-click check-in from the email (signed-out browser)");
  const mail = await browser.newPage();
  await mail.goto(checkLink);
  await mail.getByRole("button", { name: "I'm OK" }).click();
  await mail.getByRole("heading", { name: /you're checked in/ }).waitFor();
  await mail.close();
  [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "active");

  step("opening the app checks in automatically (also during reminders)");
  await sql`update users set last_check_in_at = now() - interval '8 days' where email=${owner}`;
  res = await cron();
  assert.ok(res.start_warning >= 1, JSON.stringify(res));
  [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "warning");
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Your switch is active").waitFor();
  [u] = await sql`select switch_status, extract(epoch from now() - last_check_in_at) as age from users where email=${owner}`;
  assert.equal(u.switch_status, "active");
  assert.ok(Number(u.age) < 60, "last check-in was just now");
  await shot("08-auto-checked-in");

  step("miss everything → release");
  await sql`update users set last_check_in_at = now() - interval '8 days' where email=${owner}`;
  await cron(); // warning
  res = await cron(); // too soon for another reminder
  assert.equal(res.remind, 0, "no duplicate reminders the same day");
  await sql`update users set warning_started_at = now() - interval '1 day', last_reminder_at = now() - interval '1 day' where email=${owner}`;
  const before = emailsTo(owner);
  res = await cron();
  assert.ok(res.remind >= 1 && emailsTo(owner) === before + 1, "follow-up reminder after 1 day with a 3-day grace period");
  await sql`update users set warning_started_at = now() - interval '4 days', last_reminder_at = now() - interval '1 day' where email=${owner}`;
  // Two runs at the same moment (Vercel can deliver a cron twice): exactly one release email per contact.
  const results = await Promise.all([cron(), cron()]);
  assert.ok(results.some((r) => r.trigger >= 1), JSON.stringify(results));
  [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "triggered");
  await cron(); // a later run doesn't send again either
  for (const who of [anna, bob]) {
    assert.equal(mailsTo(who).filter((m) => m.includes("/access/")).length, 1, `exactly one release email to ${who}`);
  }
  assert.ok(mailsTo(anna).at(-1).includes("not responded to repeated check-in reminders"), "check-in mode wording");

  step("a contact added after the release gets nothing");
  const carol = `carol+${Date.now()}@example.com`;
  await page.goto(`${BASE}/contacts/new`);
  await page.getByLabel("Name", { exact: true }).fill("Carol Example");
  await page.getByLabel("Email", { exact: true }).fill(carol);
  await page.getByRole("button", { name: "Add contact" }).click();
  await page.waitForURL("**/contacts?saved=1");
  await cron();
  assert.equal(mailsTo(carol).filter((m) => m.includes("/access/")).length, 0, "no access link for Carol");
  const [{ id: carolId }] = await sql`select id from recipients where email=${carol}`;
  await page.goto(`${BASE}/contacts/${carolId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Remove" }).click();
  await page.waitForURL(/\/contacts$/);

  step("Anna opens her link");
  const annaLink = await lastLink(anna, "/access/");
  const rp = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await rp.goto(annaLink);
  await rp.getByRole("heading", { name: "Information from Joana Example" }).waitFor();
  await rp.getByText("Anna, you were the best sister.").waitFor();
  await rp.getByText("I love you all.", { exact: false }).waitFor();
  await rp.getByText("Account email").waitFor(); // how to find the Netflix account
  assert.equal(await rp.getByText("ING", { exact: true }).count(), 0, "bank hidden from Anna");
  await rp.screenshot({ path: `${SHOTS}/09-recipient-anna.png`, fullPage: true });

  step("Bob sees the bank");
  const bobLink = await lastLink(bob, "/access/");
  await rp.goto(bobLink);
  await rp.getByText("ING", { exact: true }).waitFor();

  step("owner revokes");
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Your vault has been released").waitFor();
  await shot("10-dashboard-released");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /revoke access/ }).click();
  await page.getByText("Your switch is active").waitFor();
  await rp.goto(annaLink);
  await rp.getByRole("heading", { name: /link isn.t valid/ }).waitFor();

  step("switch to claim mode → contacts get their personal links");
  await page.goto(`${BASE}/settings`);
  await page.getByRole("radio", { name: /Contacts can claim/ }).check();
  await page.getByText("Saving will email 2 contacts their personal link").waitFor();
  await page.getByRole("button", { name: "Save switch settings" }).click();
  await page.getByText("We emailed 2 contacts their personal link").waitFor();
  assert.ok(await page.getByRole("radio", { name: /Contacts can claim/ }).isChecked(), "selection survives saving");
  await shot("11-settings-claim");
  const annaClaim = await lastLink(anna, "/claim/");
  const bobClaim = await lastLink(bob, "/claim/");
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Your contacts can request access").waitFor();
  res = await cron();
  [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "active", "claim mode never starts on its own");

  step("opening the claim link changes nothing; pressing the button requests access");
  const claimPage = await browser.newPage();
  await claimPage.goto(annaClaim);
  await claimPage.getByRole("heading", { name: /Request access to Joana Example/ }).waitFor();
  [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "active");
  const ownerMails = emailsTo(owner);
  await claimPage.getByRole("button", { name: "Request access" }).click();
  await claimPage.getByRole("heading", { name: "Your request has been sent" }).waitFor();
  await claimPage.screenshot({ path: `${SHOTS}/12-claim-sent.png` });
  assert.equal(emailsTo(owner), ownerMails + 1, "owner is notified");

  step("owner opening the app does NOT cancel the claim; a second contact sees it's open");
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("Anna Example requested access to your vault").waitFor();
  await shot("13-dashboard-claim");
  [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "warning");
  const bobPage = await browser.newPage();
  await bobPage.goto(bobClaim);
  await bobPage.getByRole("heading", { name: "A request is already open" }).waitFor();

  step("owner rejects → contact is told");
  const annaMails = emailsTo(anna);
  await page.getByRole("button", { name: /reject this request/ }).click();
  await page.waitForURL("**/dashboard?rejected=1");
  await page.getByText("Your contacts can request access").waitFor();
  assert.equal(emailsTo(anna), annaMails + 1, "claimant gets the 'responded' email");

  step("claim again → reminders → expiry releases to everyone");
  await claimPage.goto(annaClaim);
  await claimPage.getByRole("button", { name: "Request access" }).click();
  await claimPage.getByRole("heading", { name: "Your request has been sent" }).waitFor();
  await sql`update users set last_reminder_at = now() - interval '1 day' where email=${owner}`;
  res = await cron();
  assert.ok(res.remind >= 1, JSON.stringify(res));
  await sql`update users set warning_started_at = now() - interval '4 days', last_reminder_at = now() - interval '1 day' where email=${owner}`;
  res = await cron();
  assert.ok(res.trigger >= 1, JSON.stringify(res));
  await bobPage.goto(await lastLink(bob, "/access/"));
  await bobPage.getByText("ING", { exact: true }).waitFor();
  assert.ok(mailsTo(bob).at(-1).includes("asked for access"), "claim mode wording in the release email");
  await claimPage.goto(annaClaim);
  await claimPage.getByRole("heading", { name: "The information has been released" }).waitFor();

  step("revoke, then back to email check-ins → claim links stop working");
  await page.goto(`${BASE}/dashboard`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /revoke access/ }).click();
  await page.getByText("Your contacts can request access").waitFor();
  await page.goto(`${BASE}/settings`);
  await page.getByRole("radio", { name: /Periodic check-ins/ }).check();
  await page.getByRole("button", { name: "Save switch settings" }).click();
  await page.getByText("Saved. Your timer starts from today.").waitFor();
  await claimPage.goto(annaClaim);
  await claimPage.getByRole("heading", { name: "This link isn't valid" }).waitFor();
  await claimPage.close();
  await bobPage.close();

  step("cron auth");
  assert.equal((await fetch(`${BASE}/api/cron/check-switches`, { headers: { authorization: "Bearer nope" } })).status, 401);

  step("unauthenticated access redirects");
  const anon = await browser.newPage();
  await anon.goto(`${BASE}/dashboard`);
  assert.ok(anon.url().endsWith("/login"));

  step("subscription ends → the switch keeps running; everything else stays free");
  await page.goto(`${BASE}/settings`);
  await page.getByText(/Renews on 4 November 2027/).waitFor();
  assert.equal((await paddleWebhook(subscriptionEvent("subscription.canceled", { status: "canceled", minutes: 10, userId: ownerId }))).status, 200);
  assert.equal((await sql`select switch_enabled from users where id=${ownerId}`)[0].switch_enabled, true, "switch still on");
  await page.goto(`${BASE}/vault`);
  await page.getByText("Your subscription has ended. Your release switch keeps running").waitFor();
  await page.getByRole("button", { name: "+ Add" }).waitFor(); // editing stays free
  await shot("19-lapsed");

  step("once turned off, turning it back on needs a renewal");
  await page.goto(`${BASE}/settings`);
  await page.getByLabel(/Switch is on/).uncheck();
  await page.getByRole("button", { name: "Save switch settings" }).click();
  await page.getByText("Saved. Your timer starts from today.").waitFor();
  assert.equal((await sql`select switch_enabled from users where id=${ownerId}`)[0].switch_enabled, false);
  await page.reload();
  await page.getByLabel(/Switch is off/).check();
  await page.getByRole("button", { name: "Save and subscribe to turn it on" }).click();
  await page.waitForURL("**/subscribe");
  await page.getByRole("heading", { name: "Renew your subscription" }).waitFor();
  assert.equal((await sql`select switch_enabled from users where id=${ownerId}`)[0].switch_enabled, false);

  step("late webhooks are ignored; renewing (new subscription) turns the switch back on");
  await paddleWebhook(subscriptionEvent("subscription.updated", { status: "active", minutes: 5, userId: ownerId }));
  assert.equal((await sql`select billing_status from users where id=${ownerId}`)[0].billing_status, "canceled", "older event ignored");
  const renewed = { id: "sub_e2eb", status: "active", minutes: 20 }; // no custom data: found by customer id
  assert.equal((await paddleWebhook(subscriptionEvent("subscription.created", renewed))).status, 200);
  await paddleWebhook(subscriptionEvent("subscription.updated", { status: "canceled", minutes: 30, userId: ownerId }));
  const [again] = await sql`select billing_status, switch_enabled from users where id=${ownerId}`;
  assert.equal(again.billing_status, "active", "the old subscription ending doesn't remove access");
  assert.equal(again.switch_enabled, true, "renewing turned the switch back on");
  await page.goto(`${BASE}/settings`);
  await paddleWebhook(subscriptionEvent("subscription.updated", { ...renewed, minutes: 40, cancel: true }));
  await page.reload();
  await page.getByText("Your subscription ends on 4 November 2027").waitFor();

  step("deleting an account must cancel billing first");
  await page.getByLabel(/Type "DELETE"/).fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByText("We couldn't cancel your subscription just now").waitFor(); // fake Paddle API key in tests
  assert.equal((await sql`select count(*)::int as n from users where id=${ownerId}`)[0].n, 1, "nothing deleted");
  await paddleWebhook(subscriptionEvent("subscription.canceled", { ...renewed, status: "canceled", minutes: 50 }));

  step("delete account");
  await page.goto(`${BASE}/settings`);
  await page.getByLabel(/Type "DELETE"/).fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForURL("**/?deleted=1");
  const left = await sql`select count(*)::int as n from users where email=${owner}`;
  assert.equal(left[0].n, 0);

  step("no Content-Security-Policy violations");
  assert.deepEqual(cspViolations, []);

  console.log("\n✅ ALL E2E CHECKS PASSED");
} catch (e) {
  await shot("zz-failure").catch(() => {});
  console.error("\n❌ E2E FAILED:", e);
  process.exitCode = 1;
} finally {
  await browser.close();
  await sql.end();
}
