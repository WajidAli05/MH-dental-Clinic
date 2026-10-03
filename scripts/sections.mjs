// Dev helper: screenshot individual sections in real headless Chromium.
// Usage: node scripts/sections.mjs [path=/en] [width=1440] [height=900]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const path = process.argv[2] ?? "/en";
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 900);
const out = "../media-review/shots";
mkdirSync(out, { recursive: true });
const tag = `${path.replace(/\W+/g, "")}-${width}`;

// Use the real GPU (ANGLE on D3D11): software WebGL is far too slow for several 3D canvases.
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });
const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
const page = await ctx.newPage();
await page.goto("http://localhost:3000" + path, { waitUntil: "load" });
await page.waitForTimeout(1200);

const targets = (process.argv[5] ?? "main > section:first-of-type,#services,#learn,#results,[aria-labelledby=polish-title],#prices,[aria-labelledby=visit-title],#reviews,[aria-labelledby=doctor-title],[aria-labelledby=faq-title],#visit,footer").split(",");
let n = 0;
for (const sel of targets) {
  // Scroll by absolute position: scroll-scrubbed sections are never "stable" for Playwright.
  await page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    window.scrollTo(0, window.scrollY + r.top - 80);
  }, sel);
  await page.waitForTimeout(Number(process.env.WAIT ?? 1600));
  if (process.env.DEBUG)
    console.log(
      sel,
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        return { y: Math.round(scrollY), canvases: el.querySelectorAll("canvas").length, dot: el.querySelector("[aria-controls=mouth-card][style]")?.getAttribute("style") ?? null };
      }, sel),
    );
  await page.screenshot({ path: `${out}/sec-${tag}-${String(n++).padStart(2, "0")}.png` });
}
await browser.close();
console.log("done", n);


