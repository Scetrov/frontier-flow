import { expect, test } from "@playwright/test";

test("shows staged deployment progress in a modal and continues after dismissal", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_stage_delay_ms=120");

  const compilationStatus = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
  await expect(compilationStatus).toContainText("Compiled");

  await page.getByRole("button", { name: "Select deployment target" }).click();
  await page.getByRole("option", { name: "testnet:stillness" }).click();
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const modal = page.getByRole("dialog", { name: "Deployment in progress" });
  await expect(modal).toBeVisible();
  await expect(modal.locator(".ff-deployment-modal__copy", { hasText: "Target: testnet:stillness" })).toBeVisible();
  await expect(modal.locator(".ff-deployment-modal__stage-label", { hasText: "Validating" })).toBeVisible();

  await expect(modal.locator(".ff-deployment-modal__stage-label", { hasText: "Preparing" })).toBeVisible();
  await expect(modal.locator(".ff-deployment-modal__stage--active .ff-deployment-modal__stage-state", { hasText: "Active" })).toBeVisible();

  await modal.getByRole("button", { name: "Dismiss" }).click();
  await expect(modal).toBeHidden();

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Deployed");
  await deploymentStatus.click();
  await expect(page.getByText(/Deployment completed for testnet:stillness/i)).toBeVisible();
});