// Checks that every ad design fits on one screen (no scrolling) and its button is visible, at common sizes.
// Usage: BASE_URL=http://localhost:3000 [SHOTS=dir] node e2e/ads-fit.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SHOTS = process.env.SHOTS;
const VIEWPORTS = [
  [375, 667], [390, 844], [412, 915], [768, 1024], [1280, 720], [1366, 768], [1440, 900], [1920, 1080],
];

// Discover every ad URL from the gallery page.
const browser = await chromium.launch();
const index = await browser.newPage();
await index.goto(`${BASE}/for`);
const urls = await index.$$eval('a[href^="/for/"]', (as) => [...new Set(as.map((a) => a.getAttribute("href")).filter((h) => /^\/for\/[^/]+\/[^/]+$/.test(h)))]);
await index.close();

let failures = 0;
for (const url of urls) {
  const problems = [];
  for (const [w, h] of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    const r = await page.evaluate(() => {
      const cta = [...document.querySelectorAll("main a")].find((a) => a.getAttribute("href")?.startsWith("/"));
      const box = cta?.getBoundingClientRect();
      return {
        scrollH: document.documentElement.scrollHeight,
        scrollW: document.documentElement.scrollWidth,
        ctaBottom: box ? box.bottom : Infinity,
        ctaRight: box ? box.right : Infinity,
      };
    });
    if (r.scrollH > h + 1) problems.push(`${w}×${h}: scrolls (${r.scrollH}px tall)`);
    if (r.scrollW > w + 1) problems.push(`${w}×${h}: horizontal scroll (${r.scrollW}px wide)`);
    if (r.ctaBottom > h || r.ctaRight > w) problems.push(`${w}×${h}: button off-screen`);
    if (SHOTS && ((w === 1440 && h === 900) || (w === 390 && h === 844) || (w === 375 && h === 667))) {
      await page.screenshot({ path: `${SHOTS}/${url.slice(5).replace("/", "-")}-${w}x${h}.png` });
    }
    await page.close();
  }
  if (problems.length) failures++;
  console.log(problems.length ? `❌ ${url}\n   ${problems.join("\n   ")}` : `✅ ${url} fits on one screen at all ${VIEWPORTS.length} sizes`);
}
await browser.close();
console.log(failures ? `\n${failures} design(s) need fixing` : `\nAll ${urls.length} designs fit`);
process.exitCode = failures ? 1 : 0;
