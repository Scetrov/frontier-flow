import { expect, test } from "@playwright/test";

test("selects a deployment target and surfaces deployment success metadata", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_stage_delay_ms=0");

  const compilationStatus = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
  await expect(compilationStatus).toContainText("Compiled");

  await page.getByRole("button", { name: "Select deployment target" }).click();
  await page.getByRole("menuitemradio", { name: "testnet:stillness" }).click();
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const deploymentModal = page.getByRole("dialog", { name: "Deployed" });
  await expect(deploymentModal).toBeVisible();
  await deploymentModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployed");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText(/Deployment completed for testnet:stillness/i)).toBeVisible();
  await expect(deploymentDetails.locator(".ff-compilation-status__message").filter({ hasText: /^Package ID: 0x[a-f0-9]{64}$/i })).toBeVisible();

  await page.getByRole("button", { name: "Move" }).click();
  await expect(page.locator(".ff-move-source__badge", { hasText: "testnet:stillness" })).toBeVisible();
  await expect(page.locator(".ff-move-source__filename", { hasText: /0x[a-f0-9]{64}/i }).first()).toBeVisible();
});