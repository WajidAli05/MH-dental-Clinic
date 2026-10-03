// Dev helper: screenshot the /lab mesh page (real GPU).
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await page.goto("http://localhost:3000" + (process.argv[2] ?? "/lab"), { waitUntil: "load" });
await page.waitForTimeout(Number(process.argv[3] ?? 9000));
await page.screenshot({ path: "../media-review/shots/lab.png" });
console.log(errs.length ? errs.join("\n") : "no errors");
await browser.close();
