import { test, expect } from "@playwright/test";

// Run against the dev server: npm run dev, then npm run test:e2e
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test("hero: poster type, stickers and the 3D tooth canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/en`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Gentle");
  await expect(page.locator("#hero-title ~ div canvas").first()).toBeAttached({ timeout: 20_000 });
  await expect(page.getByText("Painless", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Book on WhatsApp/ }).first()).toHaveAttribute("href", /wa\.me\/923348694111/);
});

test("custom cursor follows the mouse and labels interactive things", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/en`);
  // Hydration on the unoptimised dev build can take a few seconds.
  await expect(page.locator("html")).toHaveClass(/has-cursor/, { timeout: 20_000 });
  const btn = page.getByRole("link", { name: /Book on WhatsApp/ }).nth(1);
  const box = (await btn.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await expect(page.locator("[data-mode=label]").first()).toBeAttached();
});

test("press and hold polishes the tooth; early release eases back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/en`);
  const btn = page.getByRole("button", { name: /press and hold/i });
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const box = (await btn.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByRole("button", { name: /polishing/i })).toBeVisible();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await expect(page.getByText("Clean and smooth.")).toHaveCount(0);
  await page.mouse.down();
  await expect(page.getByText("Clean and smooth.")).toBeVisible({ timeout: 15_000 });
  await page.mouse.up();
});

test("mouth explorer: a dot opens its card on a cord", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/en`);
  await page.locator("#learn").scrollIntoViewIfNeeded();
  // Wait until the 3D scene has parked the dots (they get a transform once projected).
  const dot = page.locator('#learn button[aria-label^="Missing tooth"]');
  await expect.poll(async () => dot.getAttribute("style"), { timeout: 30_000 }).toContain("translate3d");
  await dot.click();
  const card = page.locator("#mouth-card");
  await expect(card).toContainText("A gap after losing a tooth");
  await expect(card).toContainText("implant");
  await expect.poll(async () => page.locator("#learn svg path").first().getAttribute("d")).toMatch(/^M/);
  await page.keyboard.press("Escape");
  await expect(card).toHaveCount(0);
});

test("reviews carousel advances and shows real reviews", async ({ page }) => {
  await page.goto(`${BASE}/en`);
  await page.locator("#reviews").scrollIntoViewIfNeeded();
  const counter = page.locator("#reviews").getByText(/^\d\d \/ \d\d$/);
  const first = await counter.textContent();
  await page.getByRole("button", { name: "Next review" }).click();
  await expect(counter).not.toHaveText(first!);
  await expect(page.locator("#reviews blockquote")).not.toBeEmpty();
});

test("form without Formspree hands off to WhatsApp honestly", async ({ page }) => {
  await page.goto(`${BASE}/en`);
  await page.locator("#visit").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Please fill in your name and number.")).toBeVisible();
  await page.getByLabel("Your name").fill("Test Patient");
  await page.getByLabel("Phone or WhatsApp number").fill("03001234567");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Almost there.")).toBeVisible();
  const href = await page.getByRole("link", { name: "Continue on WhatsApp" }).getAttribute("href");
  expect(href).toContain("wa.me/923348694111");
  expect(decodeURIComponent(href!)).toContain("Test Patient");
});

test("reduced motion: no custom cursor, polish already done", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`);
  await page.waitForTimeout(1500);
  await expect(page.locator("html")).not.toHaveClass(/has-cursor/);
  await expect(page.getByText("Clean and smooth.")).toBeAttached();
  await ctx.close();
});

test("phones: no sideways scroll, no custom cursor", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`);
  await page.waitForTimeout(1500);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(sideways).toBe(0);
  await expect(page.locator("html")).not.toHaveClass(/has-cursor/);
  await ctx.close();
});

test("short phone: service cards are visible, not just their 3D models", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 530 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`);
  for (const n of [1, 6, 12]) {
    const card = page.locator(`#services article:nth-child(${n})`);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(async () => card.locator("> div").evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 10_000 }).toBeGreaterThan(0.95);
  }
  await ctx.close();
});

test("short phone: closing a teeth popup by tap does not open the next one", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 530 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en`);
  await page.locator("#learn").scrollIntoViewIfNeeded();
  const dot = page.locator('#learn button[aria-label^="Missing tooth"]');
  await expect.poll(async () => dot.getAttribute("style"), { timeout: 30_000 }).toContain("translate3d");
  await dot.scrollIntoViewIfNeeded();
  await dot.tap();
  const card = page.locator("#mouth-card");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Close" }).tap();
  await page.waitForTimeout(1500);
  await expect(card).toHaveCount(0);
  await ctx.close();
});

test("urdu page is right-to-left and switches back to English", async ({ page }) => {
  await page.goto(`${BASE}/ur`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("link", { name: "Read this site in English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});
