import { expect, test } from "@playwright/test";

test("keeps the itinerary available after the phone goes offline", async ({ context, page }) => {
  await page.goto("./");
  await expect(page.getByText("BUSAN · KST")).toBeVisible();
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 5_000 },
  ).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByText("BUSAN · KST")).toBeVisible();
  await expect(page.getByRole("button", { name: "注意" })).toBeVisible();
  await expect(page.getByRole("link", { name: "NAVER Map" })).toBeVisible();
});

test("keeps mobile text readable, content centered, and raw notes hidden", async ({ page }, testInfo) => {
  await page.goto("./");

  await expect(page.locator("body")).toHaveCSS("font-size", "18px");
  await expect(page.locator(".weather-days > div").first()).toHaveCSS("align-items", "center");
  await expect(page.getByRole("button", { name: "今天" })).toHaveCSS("align-items", "center");
  await testInfo.attach("today-mobile", {
    body: await page.screenshot({ fullPage: false }),
    contentType: "image/png",
  });

  await page.getByRole("button", { name: "注意" }).click();
  await expect(page.getByRole("heading", { name: "韓國注意事項" })).toBeVisible();
  await expect(page.locator(".attention-list li")).toHaveCount(61);
  await expect(page.getByText("吃完飯請立即移動！")).toBeVisible();
  await page.getByText("互動與拍照", { exact: true }).click();
  await expect(page.getByText("不要「嗯嗯」，要說「內內」！")).toBeVisible();
  await page.getByText("市場與 SPA", { exact: true }).click();
  await expect(page.getByText("浴場不要帶手機拍照").locator("..")).toHaveClass(/red-line/);
  await expect(page.getByText("地鐵、公車與步行導航")).toHaveCount(0);
  await expect(page.getByText("韓國與釜山文化注意事項")).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await testInfo.attach("attention-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("checks and persists preparation progress", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "行前" }).click();
  await page.getByRole("button", { name: "確認兩本護照效期與機票英文姓名" }).click();
  await page.getByRole("button", { name: "標示已安裝：NAVER Map" }).click();
  await expect(page.getByText("1／21 項完成")).toBeVisible();
  await expect(page.getByText("1／7")).toBeVisible();
  await expect(page.getByText("地鐵、公車與步行導航")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "行前" }).click();
  await expect(page.getByRole("button", { name: "確認兩本護照效期與機票英文姓名" })).toHaveAttribute("aria-pressed", "true");
});

test("enlarges and closes the transport route map", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "放大今日交通路線圖" }).click();
  await expect(page.getByRole("dialog", { name: "放大的今日交通路線圖" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "放大的今日交通路線圖" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "放大今日交通路線圖" })).toBeFocused();
});

test("works at 320px, text zoom, rainy mode, and high contrast", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("./");
  await expect(page.getByRole("link", { name: "NAVER Map" })).toBeVisible();
  await page.getByRole("button", { name: "切換為雨天行程" }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-weather", "rainy");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "今天" })).toBeVisible();
});
