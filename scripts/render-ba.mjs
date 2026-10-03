// Render the before/after pairs from /lab/ba into public/media/ba-<case>-<state>.jpg.
// Same camera for both states, so the slider lines up perfectly.
import { chromium } from "@playwright/test";
const cases = process.argv.slice(2).length ? process.argv.slice(2) : ["whitening", "scaling", "filling", "braces"];
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
for (const c of cases) {
  for (const state of ["before", "after"]) {
    await page.goto(`http://localhost:3000/lab/ba?case=${c}&state=${state}`, { waitUntil: "load" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }); // hide the dev badge
    await page.waitForTimeout(6000);
    await page.locator("#ba").screenshot({ path: `public/media/ba-${c}-${state}.jpg`, type: "jpeg", quality: 88 });
    console.log("rendered", c, state);
  }
}
await browser.close();
