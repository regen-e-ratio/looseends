// Smoke test for a deployed site — needs no secrets. Usage: BASE_URL=https://www.looseends.life node e2e/live-smoke.mjs
// Sends one real sign-in email through the configured provider to Resend's test inbox (delivered@resend.dev).
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = (process.env.BASE_URL || "https://www.looseends.life").replace(/\/$/, "");
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(["✅", name]);
  } catch (e) {
    results.push(["❌", `${name}: ${e.message.split("\n")[0]}`]);
  }
}
const get = (path, init) => fetch(BASE + path, { redirect: "manual", ...init });

await check("health: database, migrations, secrets and email provider configured", async () => {
  const r = await get("/api/health");
  const h = await r.json();
  assert.equal(r.status, 200, JSON.stringify(h));
  assert.equal(h.ok, true);
  assert.equal(h.emailProvider, "resend");
  assert.equal(h.emailFrom, true);
  assert.ok(h.appUrl.startsWith("https://"), `appUrl=${h.appUrl}`);
  console.log("   health:", JSON.stringify(h));
});

await check("bare domain redirects to the canonical host", async () => {
  const host = new URL(BASE).hostname;
  const other = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const r = await fetch(`https://${other}/`, { redirect: "manual" });
  assert.ok([301, 307, 308].includes(r.status), `status ${r.status}`);
  assert.ok(r.headers.get("location")?.includes(host), r.headers.get("location"));
});

await check("security headers", async () => {
  const r = await get("/");
  assert.equal(r.headers.get("referrer-policy"), "no-referrer");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.match(r.headers.get("strict-transport-security") ?? "", /max-age/);
  for (const p of ["/login", "/access/x", "/check-in"]) assert.match((await get(p)).headers.get("x-robots-tag") ?? "", /noindex/, p);
});

await check("landing pages are live, indexable and in the sitemap", async () => {
  const sitemap = await (await get("/sitemap.xml")).text();
  for (const slug of ["family", "investors", "crypto"]) {
    const r = await get(`/for/${slug}`);
    assert.equal(r.status, 200, slug);
    assert.equal(r.headers.get("x-robots-tag"), null, `${slug} should be indexable`);
    assert.ok(sitemap.includes(`/for/${slug}`), `${slug} missing from sitemap`);
  }
  assert.equal((await get("/for/nope")).status, 404);
});

await check("cron endpoint rejects missing and wrong secrets", async () => {
  assert.equal((await get("/api/cron/check-switches")).status, 401);
  assert.equal((await get("/api/cron/check-switches", { headers: { authorization: "Bearer wrong" } })).status, 401);
});

await check("private pages redirect anonymous visitors to /login", async () => {
  for (const p of ["/dashboard", "/contacts", "/contacts/new", "/settings", "/items/new", "/welcome"]) {
    const r = await get(p);
    assert.ok([302, 303, 307].includes(r.status), `${p} → ${r.status}`);
    assert.match(r.headers.get("location") ?? "", /\/login$/, p);
  }
});

await check("Vercel Web Analytics is enabled for the project", async () => {
  const r = await get("/_vercel/insights/script.js");
  assert.equal(r.status, 200, "enable it in Vercel → project → Analytics");
});

await check("favicon is served", async () => {
  const r = await get("/icon.svg");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") ?? "", /svg/);
});

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await check("ad click on a landing page carries attribution to sign-up", async () => {
  await page.goto(`${BASE}/for/crypto?utm_source=smoke&utm_campaign=test`);
  await page.waitForFunction(() => document.querySelector('a[href*="from=crypto"][href*="utm_campaign=test"]'));
  await page.getByRole("link", { name: "Map my wallets — free" }).first().click();
  await page.waitForURL(/\/login\?from=crypto/);
});

await check("landing page shows the Loose Ends brand", async () => {
  await page.goto(BASE);
  assert.match(await page.title(), /Loose Ends/);
  await page.getByRole("heading", { name: /untangling/ }).waitFor();
  assert.equal(await page.getByText("Afterword").count(), 0, "old name still visible");
  await page.screenshot({ path: "/tmp/shots/live-landing.png" });
});

await check("login form validates input", async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByLabel("Email address").evaluate((el) => (el.type = "text"));
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByText("Please enter a valid email address.").waitFor();
});

await check("sign-in email is sent through the email provider (to delivered@resend.dev)", async () => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email address").fill("delivered@resend.dev");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByRole("heading", { name: "Check your email" }).waitFor({ timeout: 20_000 });
});

await check("invalid sign-in, check-in and access links are rejected", async () => {
  await page.goto(`${BASE}/auth/verify?token=bogus`);
  await page.getByRole("heading", { name: "This link has expired" }).waitFor();
  await page.goto(`${BASE}/check-in?u=00000000-0000-0000-0000-000000000000&t=bogus`);
  await page.getByRole("button", { name: "I'm OK" }).click();
  await page.getByRole("heading", { name: /no longer valid/ }).waitFor();
  await page.goto(`${BASE}/access/${"x".repeat(43)}`);
  await page.getByRole("heading", { name: /link isn.t valid/ }).waitFor();
});

await check("no client-side errors", async () => assert.deepEqual(errors, []));
await browser.close();

for (const [icon, name] of results) console.log(icon, name);
const failed = results.filter(([i]) => i === "❌").length;
console.log(failed ? `\n${failed} check(s) failed` : `\nAll ${results.length} live checks passed`);
process.exitCode = failed ? 1 : 0;
