import { expect, test } from "@playwright/test";

test("shows the disconnected wallet action in the header", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
});

test("shows no-wallet guidance when connect is clicked without installed wallets", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Connect" }).click();

  await expect(page.getByText(/No compatible Sui wallet was detected in this browser/i)).toBeVisible();
});