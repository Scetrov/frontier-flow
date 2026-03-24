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
  await openDeployWorkflow(page);
  await page.getByRole("button", { name: "Select deployment target" }).click();
  await page.getByRole("menuitemradio", { name: target }).click();
}