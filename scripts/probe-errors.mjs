// Dev helper: load a page, scroll through it, and print any page errors or console errors.
import { chromium } from "@playwright/test";
const path = process.argv[2] ?? "/en";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && !/40[04]/.test(m.text()) && errors.push("console: " + m.text()));
await page.goto("http://localhost:3000" + path, { waitUntil: "load" });
await page.waitForTimeout(2000);
await page.evaluate(() => document.querySelector("#learn").scrollIntoView());
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(1000);
  const dot = await page.evaluate(() => document.querySelector("#learn [aria-controls=mouth-card][style]")?.getAttribute("style") ?? "none");
  const canvases = await page.evaluate(() => document.querySelectorAll("#learn canvas").length);
  console.log(`t=${i + 1}s canvases=${canvases} firstDot=${dot}`);
  if (dot !== "none") break;
}
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();

