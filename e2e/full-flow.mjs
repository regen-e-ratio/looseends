// End-to-end test of the whole product against a running server that prints emails to its log
// (no email provider configured). Usage:
//   SERVER_LOG=/tmp/server.log BASE_URL=http://localhost:3000 DATABASE_URL=... node e2e/full-flow.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // uses the globally installed Playwright (NODE_PATH)
import { readFileSync, mkdirSync } from "node:fs";
import postgres from "postgres";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const LOG = process.env.SERVER_LOG || "/tmp/server.log";
const SHOTS = process.env.SHOTS || "/tmp/shots";
const CRON_SECRET = process.env.CRON_SECRET;
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
const emailsTo = (to) => readFileSync(LOG, "utf8").split("📧 [dev email]").filter((b) => b.includes(`to=${to} `)).length;
async function cron() {
  const r = await fetch(`${BASE}/api/cron/check-switches`, { headers: { authorization: `Bearer ${CRON_SECRET}` } });
  assert.equal(r.status, 200);
  return r.json();
}
const step = (s) => console.log("•", s);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR", e));
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });

try {
  step("landing");
  await page.goto(BASE);
  await shot("01-landing");
  await page.getByRole("link", { name: "Create your free vault" }).click();

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
  await page.waitForURL("**/welcome");
  await page.getByLabel("Your full name").fill("Joana Example");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/dashboard");
  await shot("03-dashboard-empty");

  step("token is single use");
  const p2 = await browser.newPage();
  await p2.goto(loginLink);
  await p2.getByText("This link has expired").waitFor();
  await p2.close();

  step("add items");
  async function addItem(kind, fields) {
    await page.goto(`${BASE}/items/new?kind=${kind}`);
    for (const [label, value] of Object.entries(fields)) await page.getByLabel(label, { exact: false }).first().fill(value);
    await page.getByRole("button", { name: /^Add / }).click();
    await page.waitForURL("**/dashboard?saved=1*");
  }
  await addItem("subscription", { Service: "Netflix", Cost: "€15.99 / month", "What should happen": "Cancel it please" });
  await addItem("bank", { Bank: "ING", "Approximate balance": "≈ €10,000", "Notes & instructions": "Bereavement team" });
  await addItem("message", { Subject: "To my family", Message: "I love you all. Don't fight over the record collection." });

  step("validation error on empty title");
  await page.goto(`${BASE}/items/new?kind=investment`);
  await page.locator("#title").evaluate((el) => el.removeAttribute("required"));
  await page.getByRole("button", { name: /^Add / }).click();
  await page.getByText("Please give it a name").waitFor();

  step("add contacts");
  for (const [name, email, msg] of [["Anna Example", anna, "Anna, you were the best sister."], ["Bob Example", bob, ""]]) {
    await page.goto(`${BASE}/contacts/new`);
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Email", { exact: true }).fill(email);
    if (msg) await page.getByLabel("Personal message").fill(msg);
    await page.getByRole("button", { name: "Add contact" }).click();
    await page.waitForURL("**/contacts?saved=1");
  }
  assert.equal(emailsTo(anna), 1, "anna gets 'you were added' email");
  await shot("04-contacts");

  step("share bank only with Bob");
  await page.goto(`${BASE}/dashboard`);
  await page.getByRole("link", { name: /ING/ }).click();
  await page.getByLabel("Only specific people").check();
  await page.getByLabel(/Bob Example/).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/dashboard?saved=1*");
  await page.getByText("Bob Example", { exact: true }).waitFor();
  await shot("05-dashboard-items");

  step("data is encrypted at rest");
  const rows = await sql`select payload from items i join users u on u.id=i.user_id where u.email=${owner}`;
  assert.equal(rows.length, 3);
  for (const r of rows) assert.ok(r.payload.startsWith("v2.") && !r.payload.includes("Netflix"));

  step("preview as Anna (no bank)");
  await page.goto(`${BASE}/contacts`);
  await page.getByRole("link", { name: "Preview what they'll see" }).first().click();
  await page.getByText("Anna, you were the best sister.").waitFor();
  assert.equal(await page.getByText("ING", { exact: true }).count(), 0);
  await page.getByText("Netflix").waitFor();
  await shot("06-preview-anna");

  step("enable switch");
  await page.goto(`${BASE}/settings`);
  await page.getByLabel(/Switch is off/).check();
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
  assert.ok(res.none >= 1 && res.trigger === 0, JSON.stringify(res));

  step("8 days pass → reminder");
  await sql`update users set last_check_in_at = now() - interval '8 days' where email=${owner}`;
  res = await cron();
  assert.ok(res.start_warning >= 1, JSON.stringify(res));
  const checkLink = await lastLink(owner, "/check-in");
  await page.goto(`${BASE}/dashboard`);
  await page.getByText("We're waiting for your check-in").waitFor();
  await shot("08-dashboard-warning");

  step("one-click check-in from email");
  await page.goto(checkLink);
  await page.getByRole("button", { name: "I'm OK" }).click();
  await page.getByRole("heading", { name: /you're checked in/ }).waitFor();
  let [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "active");

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
  res = await cron();
  assert.ok(res.trigger >= 1, JSON.stringify(res));
  [u] = await sql`select switch_status from users where email=${owner}`;
  assert.equal(u.switch_status, "triggered");

  step("Anna opens her link");
  const annaLink = await lastLink(anna, "/access/");
  const rp = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await rp.goto(annaLink);
  await rp.getByRole("heading", { name: "Information from Joana Example" }).waitFor();
  await rp.getByText("Anna, you were the best sister.").waitFor();
  await rp.getByText("I love you all.", { exact: false }).waitFor();
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

  step("cron auth");
  assert.equal((await fetch(`${BASE}/api/cron/check-switches`, { headers: { authorization: "Bearer nope" } })).status, 401);

  step("unauthenticated access redirects");
  const anon = await browser.newPage();
  await anon.goto(`${BASE}/dashboard`);
  assert.ok(anon.url().endsWith("/login"));

  step("delete account");
  await page.goto(`${BASE}/settings`);
  await page.getByLabel(/Type "DELETE"/).fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForURL("**/?deleted=1");
  const left = await sql`select count(*)::int as n from users where email=${owner}`;
  assert.equal(left[0].n, 0);

  console.log("\n✅ ALL E2E CHECKS PASSED");
} catch (e) {
  await shot("zz-failure").catch(() => {});
  console.error("\n❌ E2E FAILED:", e);
  process.exitCode = 1;
} finally {
  await browser.close();
  await sql.end();
}
