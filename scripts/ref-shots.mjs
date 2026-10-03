// Dev helper: capture a reference site at several scroll depths.
// Usage: node scripts/ref-shots.mjs <url> <tag> [stops=10]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [url, tag, stopsArg] = process.argv.slice(2);
const out = "../media-review/refs";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4000);
const stops = Number(stopsArg ?? 10);
for (let i = 0; i <= stops; i++) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  // Wheel-scroll so smooth-scroll libraries and scroll triggers actually fire.
  const target = Math.round((total * i) / stops);
  const cur = await page.evaluate(() => scrollY);
  let d = target - cur;
  while (Math.abs(d) > 10) {
    const step = Math.sign(d) * Math.min(400, Math.abs(d));
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(120);
    d -= step;
  }
  await page.mouse.move(700 + i * 20, 450);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${tag}-${String(i).padStart(2, "0")}.png` });
}
console.log(tag, "height", await page.evaluate(() => document.documentElement.scrollHeight));
await browser.close();
