// Dev helper: capture interactive states (open popup, phone hero, Urdu hero, review card).
import { chromium } from "@playwright/test";
const out = "../media-review/shots";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });

async function shot(name, { path = "/en", viewport = { width: 1440, height: 900 }, mobile = false, act }) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000" + path, { waitUntil: "load" });
  await page.waitForTimeout(3500);
  if (act) await act(page);
  await page.screenshot({ path: `${out}/state-${name}.png` });
  await ctx.close();
}

await shot("mouth-open", {
  act: async (p) => {
    await p.evaluate(() => document.querySelector("#learn").scrollIntoView());
    const dot = p.locator('#learn button[aria-label^="Missing tooth"]');
    for (let i = 0; i < 40 && !((await dot.getAttribute("style")) ?? "").includes("translate3d"); i++) await p.waitForTimeout(500);
    await p.evaluate(() => window.scrollBy(0, 160));
    await p.waitForTimeout(800);
    await dot.hover();
    await p.waitForTimeout(1200);
  },
});
await shot("phone-hero", { viewport: { width: 390, height: 844 }, mobile: true });
await shot("ur-hero", { path: "/ur" });
await shot("reviews-card", {
  act: async (p) => {
    await p.evaluate(() => {
      const r = document.querySelector("#reviews blockquote").getBoundingClientRect();
      window.scrollTo(0, scrollY + r.top - 380);
    });
    await p.waitForTimeout(2000);
  },
});
await browser.close();
console.log("done");
