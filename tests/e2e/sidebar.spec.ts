import { expect, test } from "@playwright/test";

test("toggles the mobile node toolbox overlay", async ({ page, isMobile }) => {
  test.skip(!isMobile, "This flow is specific to the mobile viewport.");

  await page.goto("/");

  const toggle = page.locator('.ff-canvas__drawer-handle[aria-controls="node-toolbox"]');
  const toolbox = page.locator('aside[aria-label="Node toolbox"]');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-label", "Open node toolbox");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toolbox).toHaveAttribute("aria-hidden", "true");

  await toggle.click();

  await expect(toggle).toHaveAttribute("aria-label", "Close node toolbox");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Close node toolbox overlay" })).toBeVisible();
  await expect(toolbox).toHaveAttribute("aria-hidden", "false");

  await page.getByRole("button", { name: "Close node toolbox overlay" }).click();
  await expect(toggle).toHaveAttribute("aria-label", "Open node toolbox");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toolbox).toHaveAttribute("aria-hidden", "true");
});