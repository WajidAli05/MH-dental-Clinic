import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://shapeofintelligence.com/", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4000);
const info = await page.evaluate(() => ({
  canvases: [...document.querySelectorAll("canvas")].map((c) => ({ w: c.width, h: c.height, cls: c.className, pos: getComputedStyle(c).position, z: getComputedStyle(c).zIndex, pe: getComputedStyle(c).pointerEvents })),
  filters: [...document.querySelectorAll("filter")].map((f) => f.id + ":" + [...f.children].map((c) => c.tagName).join(",")),
  scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
  cursorEls: [...document.querySelectorAll("[class*=cursor i]")].map((e) => e.className.toString()).slice(0, 10),
}));
console.log(JSON.stringify(info, null, 1));
// Hover sweep across the hero title to capture the effect.
for (let i = 0; i < 6; i++) {
  await page.mouse.move(300 + i * 120, 300 + (i % 2) * 140, { steps: 8 });
  await page.waitForTimeout(150);
}
await page.screenshot({ path: "../media-review/refs/soi-hover.png" });
await page.mouse.down();
await page.waitForTimeout(120);
await page.screenshot({ path: "../media-review/refs/soi-click.png" });
await page.mouse.up();
await browser.close();
