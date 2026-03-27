import { expect, type Page } from "@playwright/test";

function getTargetOptionName(target: "local" | "testnet:stillness" | "testnet:utopia"): string | RegExp {
  return target === "local"
    ? /^localnet:0x[a-f0-9]{4}\.\.\.$/i
    : target;
}

export function getTargetDisplayLabel(target: "local" | "testnet:stillness" | "testnet:utopia"): string | RegExp {
  return target === "local"
    ? /localnet:0x[a-f0-9]{4}\.\.\./i
    : target;
}

export function getCompilationStatusButton(page: Page) {
  return page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
}

export function getCodeViewButton(page: Page) {
  return page.locator("header").getByRole("button", { name: "Code", exact: true });
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
  await page.getByRole("menuitemradio", { name: getTargetOptionName(target) }).click();
  await openDeployWorkflow(page);
}