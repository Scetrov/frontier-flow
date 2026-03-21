import { expect, test } from "@playwright/test";

test("blocks stillness deployment when no wallet is connected", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=disconnected");

  const compilationStatus = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
  await expect(compilationStatus).toContainText("Compiled");

  await page.getByRole("button", { name: "Select deployment target" }).click();
  await page.getByRole("menuitemradio", { name: "testnet:stillness" }).click();
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const blockedModal = page.getByRole("dialog", { name: "Deployment blocked" });
  await expect(blockedModal).toBeVisible();
  await expect(blockedModal.getByText("Target: testnet:stillness")).toBeVisible();
  await expect(blockedModal.getByText(/Connect a Sui-compatible wallet before deploying to testnet:stillness/i)).toBeVisible();
  await blockedModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  await expect(page.getByText("Target: testnet:stillness")).toBeVisible();
  await expect(page.getByText(/Connect a Sui-compatible wallet before deploying to testnet:stillness/i)).toBeVisible();

  await page.getByRole("button", { name: "Move" }).click();
  await expect(page.locator(".ff-move-source__filename", { hasText: /Connect and approve the target wallet, then retry deployment/i }).first()).toBeVisible();
});

test("blocks local deployment when the local target is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_local_deploy_ready=0");

  const compilationStatus = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
  await expect(compilationStatus).toContainText("Compiled");

  await page.getByRole("button", { name: "Deploy local" }).click();

  const blockedModal = page.getByRole("dialog", { name: "Deployment blocked" });
  await expect(blockedModal).toBeVisible();
  await expect(blockedModal.getByText("Target: local")).toBeVisible();
  await expect(blockedModal.getByText("Local deployment is unavailable.")).toBeVisible();
  await blockedModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  await expect(page.getByText("Target: local")).toBeVisible();
  await expect(page.getByText("Local deployment is unavailable.")).toBeVisible();
  await expect(page.getByText(/Start or configure the local deployment target before retrying/i)).toBeVisible();
});