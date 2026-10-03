// Dev helper: screenshot the running site in real headless Chromium.
// Usage: node scripts/shots.mjs [path=/en] [outDir=../media-review/shots]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const path = process.argv[2] ?? "/en";
const out = process.argv[3] ?? "../media-review/shots";
const base = "http://localhost:3000";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const tag = path.replace(/\W+/g, "") || "root";

async function run(name, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${tag}-${name}-0-top.png` });

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = viewport.height;
  const stops = opts.stops ?? [0.06, 0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  let i = 1;
  for (const f of stops) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((total - vh) * f));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${tag}-${name}-${i++}.png` });
  }
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(name, { total, sideways, errors });
  await ctx.close();
}

await run("desktop", { width: 1440, height: 900 }, { stops: [0.03, 0.07, 0.11, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
await run("phone", { width: 375, height: 812 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
