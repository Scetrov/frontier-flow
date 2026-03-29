import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "./fixtures/accessibility";
import { clearStorageAndMarkTutorialSeen } from "./fixtures/storage";
import { getCompilationStatusButton, selectDeploymentTarget } from "./fixtures/workflow";

test("shows signing-stage cancellation details in the status popup", async ({ page }) => {
  await clearStorageAndMarkTutorialSeen(page);

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_reject=1&ff_mock_deploy_stage_delay_ms=0");

  const compilationStatus = getCompilationStatusButton(page);
  await expect(compilationStatus).toContainText("Compiled");

  await selectDeploymentTarget(page, "testnet:stillness");
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const cancellationModal = page.getByRole("dialog", { name: "Deployment cancelled" });
  await expect(cancellationModal).toBeVisible();
  await cancellationModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText("Deployment cancelled", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText(/^Artifact ID:/)).toBeVisible();
  await expect(deploymentDetails.getByText("Stage: signing", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText("Severity: warning", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText(/Approve the wallet signing request to continue deployment/i)).toBeVisible();
  await expectNoAccessibilityViolations(page);
});

test("preserves the earlier blocked attempt after a later successful deployment", async ({ page }) => {
  await clearStorageAndMarkTutorialSeen(page);

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_local_deploy_ready=0&ff_mock_deploy_stage_delay_ms=0");

  const compilationStatus = getCompilationStatusButton(page);
  await expect(compilationStatus).toContainText("Compiled");

  await selectDeploymentTarget(page, "local");
  await page.getByRole("button", { name: /^Deploy localnet:0x[a-f0-9]{4}\.\.\.$/i }).click();
  const blockedModal = page.getByRole("dialog", { name: "Deployment blocked" });
  await expect(blockedModal).toBeVisible();
  await blockedModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");

  await selectDeploymentTarget(page, "testnet:stillness");
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const deploymentModal = page.getByRole("dialog", { name: "Deployed" });
  await expect(deploymentModal).toBeVisible();
  await deploymentModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  await expect(deploymentStatus).toContainText("Deployed");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText("Deployed", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText(/^Artifact ID:/)).toBeVisible();
  await expect(deploymentDetails.locator(".ff-compilation-status__message").filter({ hasText: /^Package ID:/ })).toBeVisible();
  await expect(deploymentDetails.getByText("Earlier this session", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText(/Deployment blocked - local - validating/)).toBeVisible();
});

