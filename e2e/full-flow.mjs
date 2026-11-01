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
  await page.getByRole("link", { name: "Create your free vault" }).first().waitFor();
  await shot("01-landing");

  step("arrive from a crypto ad → homepage → sign up");
  await page.goto(`${BASE}/for/crypto?utm_source=e2e&utm_campaign=launch`);
  await shot("01b-ad-crypto");
  await page.waitForFunction(() => document.querySelector('main a[href*="from=crypto"][href*="utm_campaign=launch"]'));
  await page.locator("main a[href^='/?']").first().click();
  await page.waitForURL(/\/\?from=crypto&utm_source=e2e&utm_campaign=launch$/);
  await page.waitForFunction(() => document.querySelector('a[href^="/login?from=crypto"][href*="utm_campaign=launch"]'));
  await page.getByRole("link", { name: "Create your free vault" }).first().click();
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
  await page.waitForURL("**/welcome");
  await page.getByLabel("Your full name").fill("Joana Example");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/items/new?kind=crypto");
  await page.getByText("Never write your seed phrase").waitFor();
  await shot("03-start-crypto");
  const [attr] = await sql`select signup_source, signup_campaign from users where email=${owner}`;
  assert.equal(attr.signup_source, "crypto");
  assert.equal(attr.signup_campaign, "utm_source=e2e&utm_campaign=launch");
  await page.goto(`${BASE}/dashboard`);

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
  let [u] = await sql`select switch_status from users where email=${owner}`;
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

  step("switch to claim mode → contacts get their personal links");
  await page.goto(`${BASE}/settings`);
  await page.getByRole("radio", { name: /Trusted contacts claim/ }).check();
  await page.getByText("Saving will email 2 contacts their personal link").waitFor();
  await page.getByRole("button", { name: "Save switch settings" }).click();
  await page.getByText("We emailed 2 contacts their personal link").waitFor();
  assert.ok(await page.getByRole("radio", { name: /Trusted contacts claim/ }).isChecked(), "selection survives saving");
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
  await claimPage.goto(annaClaim);
  await claimPage.getByRole("heading", { name: "The information has been released" }).waitFor();

  step("revoke, then back to email check-ins → claim links stop working");
  await page.goto(`${BASE}/dashboard`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /revoke access/ }).click();
  await page.getByText("Your contacts can request access").waitFor();
  await page.goto(`${BASE}/settings`);
  await page.getByRole("radio", { name: /Email check-ins/ }).check();
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
