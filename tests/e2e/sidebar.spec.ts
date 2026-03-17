import { expect, test } from "@playwright/test";

test("toggles the mobile node toolbox overlay", async ({ page, isMobile }) => {
  test.skip(!isMobile, "This flow is specific to the mobile viewport.");

  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Open node toolbox" });
  const toolbox = page.locator('aside[aria-label="Node toolbox"]');
  await expect(toggle).toBeVisible();
  await expect(toolbox).toHaveAttribute("aria-hidden", "true");

  await toggle.click();

  await expect(
    page.getByRole("button", { exact: true, name: "Close node toolbox" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Close node toolbox overlay" })).toBeVisible();
  await expect(toolbox).toHaveAttribute("aria-hidden", "false");

  await page.getByRole("button", { name: "Close node toolbox overlay" }).click();
  await expect(page.getByRole("button", { name: "Open node toolbox" })).toBeVisible();
  await expect(toolbox).toHaveAttribute("aria-hidden", "true");
});