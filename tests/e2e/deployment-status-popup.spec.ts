import { expect, test } from "@playwright/test";

test("shows signing-stage cancellation details in the status popup", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_reject=1&ff_mock_deploy_stage_delay_ms=0");

  const compilationStatus = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
  await expect(compilationStatus).toContainText("Compiled");

  await page.getByRole("button", { name: "Select deployment target" }).click();
  await page.getByRole("option", { name: "testnet:stillness" }).click();
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const cancellationModal = page.getByRole("dialog", { name: "Deployment cancelled" });
  await expect(cancellationModal).toBeVisible();
  await cancellationModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText("Deployment cancelled", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText("Stage: signing", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText("Severity: warning", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText(/Approve the wallet signing request to continue deployment/i)).toBeVisible();
});

test("preserves the earlier blocked attempt after a later successful deployment", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_local_deploy_ready=0&ff_mock_deploy_stage_delay_ms=0");

  const compilationStatus = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
  await expect(compilationStatus).toContainText("Compiled");

  await page.getByRole("button", { name: "Deploy local" }).click();
  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");

  await page.getByRole("button", { name: "Select deployment target" }).click();
  await page.getByRole("option", { name: "testnet:stillness" }).click();
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const deploymentModal = page.getByRole("dialog", { name: "Deployment deployed" });
  await expect(deploymentModal).toBeVisible();
  await deploymentModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  await expect(deploymentStatus).toContainText("Deployment Deployed");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText("Deployment deployed", { exact: true })).toBeVisible();
  await expect(deploymentDetails.locator(".ff-compilation-status__message").filter({ hasText: /^Package ID:/ })).toBeVisible();
  await expect(deploymentDetails.getByText("Earlier this session", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText(/Deployment blocked - local - validating/)).toBeVisible();
});
