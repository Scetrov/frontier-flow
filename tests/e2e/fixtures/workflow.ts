import { expect, type Page } from "@playwright/test";

export function getCompilationStatusButton(page: Page) {
  return page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
}

export async function openDeployWorkflow(page: Page) {
  await expect(getCompilationStatusButton(page)).toContainText("Compiled");
  await page.locator("header").getByRole("button", { name: "Deploy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pre-flight deployment checks" })).toBeVisible();
}

export async function selectDeploymentTarget(page: Page, target: "local" | "testnet:stillness" | "testnet:utopia") {
  await page.locator("header").getByRole("button", { name: "Visual", exact: true }).click();
  await expect(page.getByRole("button", { name: "Target network/server" })).toBeVisible();
  await page.getByRole("button", { name: "Target network/server" }).click();
  await page.getByRole("menuitemradio", { name: target, exact: true }).click();
  await openDeployWorkflow(page);
}