import { expect, test } from "@playwright/test";

test("keeps the itinerary available after the phone goes offline", async ({ context, page }) => {
  await page.goto("./");
  await expect(page.getByText("釜山 2026").first()).toBeVisible();
  await expect.poll(
    () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    { timeout: 5_000 },
  ).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByText("釜山 2026").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "注意" })).toBeVisible();
});
