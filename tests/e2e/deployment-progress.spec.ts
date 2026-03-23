import { expect, test } from "@playwright/test";

for (const scenario of [
  {
    target: "testnet:stillness",
    search: "?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_stage_delay_ms=120",
  },
  {
    target: "local",
    search: "?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_deploy_stage_delay_ms=120",
  },
] as const) {
  test(`shows staged deployment progress for ${scenario.target} and keeps evidence after dismissal`, async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto(`/${scenario.search}`);

    const compilationStatus = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
    await expect(compilationStatus).toContainText("Compiled");

    await page.getByRole("button", { name: "Select deployment target" }).click();
    await page.getByRole("menuitemradio", { name: scenario.target }).click();
    await page.getByRole("button", { name: `Deploy ${scenario.target}` }).click();

    const modal = page.locator(".ff-deployment-modal__panel");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".ff-deployment-modal__copy", { hasText: `Target: ${scenario.target}` })).toBeVisible();
    await expect(modal.locator(".ff-deployment-modal__stage-label", { hasText: "Validating" })).toBeVisible();
    await expect(modal.locator(".ff-deployment-modal__stage-label", { hasText: "Preparing" })).toBeVisible();
    await expect(modal.locator(".ff-deployment-modal__stage-state").filter({ hasText: /Active|Complete/ }).first()).toBeVisible();

    await modal.getByRole("button", { name: "Dismiss" }).click();
    await expect(modal).toBeHidden();

    const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
    await expect(deploymentStatus).toContainText("Deployed");
    await deploymentStatus.click();
    const deploymentDetails = page.locator("#deployment-status-details");
    await expect(deploymentDetails.getByText(new RegExp(`Deployment completed for ${scenario.target}`, "i"))).toBeVisible();
    await expect(deploymentDetails.locator(".ff-compilation-status__message").filter({ hasText: /^Package ID: 0x[a-f0-9]{64}$/i })).toBeVisible();
    await expect(deploymentDetails.locator(".ff-compilation-status__message").filter({ hasText: /^Transaction Digest: 0x[a-f0-9]{64}$/i })).toBeVisible();
  });
}