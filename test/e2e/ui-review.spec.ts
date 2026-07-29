import { expect, test } from "@playwright/test";

const sections = ["今天", "行程", "注意", "行前"] as const;

test("captures every primary section for UI review", async ({ page }) => {
  await page.goto("/");

  for (const section of sections) {
    await page.getByRole("button", { name: section, exact: true }).click();
    await expect(page.getByRole("button", { name: section, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.screenshot({
      path: `test-results/ui-${section}.png`,
      fullPage: true,
    });
    await expect(page).toHaveScreenshot(`section-${section}.png`, {
      fullPage: true,
      mask: [page.locator(".seoul-clock span")],
    });
  }
});

test("captures every expanded attention group for UI review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "注意", exact: true }).click();

  const groups = page.locator(".attention-group");
  await expect(groups).toHaveCount(4);

  for (let index = 0; index < await groups.count(); index += 1) {
    const group = groups.nth(index);

    if (await group.getAttribute("open") === null) {
      await group.locator("summary").click();
    }

    await expect(group).toHaveAttribute("open", "");
    await expect(page).toHaveScreenshot(`attention-group-${index + 1}.png`, { fullPage: true });
  }
});

test("captures every expanded itinerary for UI review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "行程", exact: true }).click();

  const dayCards = page.locator(".day-card");
  await expect(dayCards).toHaveCount(4);

  for (let dayIndex = 0; dayIndex < await dayCards.count(); dayIndex += 1) {
    const dayCard = dayCards.nth(dayIndex);
    const plans = dayCard.locator("details");
    await expect(plans).toHaveCount(2);

    for (let planIndex = 0; planIndex < await plans.count(); planIndex += 1) {
      const plan = plans.nth(planIndex);
      await plan.locator("summary").click();
      await expect(plan).toHaveAttribute("open", "");
      await page.screenshot({
        path: `test-results/ui-itinerary-day-${dayIndex + 1}-${planIndex === 0 ? "sunny" : "rainy"}.png`,
        fullPage: true,
      });
      await expect(dayCard).toHaveScreenshot(
        `itinerary-day-${dayIndex + 1}-${planIndex === 0 ? "sunny" : "rainy"}.png`,
      );
      await plan.locator("summary").click();
    }
  }
});
