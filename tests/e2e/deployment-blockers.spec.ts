import { expect, test } from "@playwright/test";

import { getCompilationStatusButton, getTargetDisplayLabel, openDeployWorkflow, selectDeploymentTarget } from "./fixtures/workflow";

test("blocks stillness deployment when no wallet is connected", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=disconnected");

  const compilationStatus = getCompilationStatusButton(page);
  await expect(compilationStatus).toContainText("Compiled");

  await selectDeploymentTarget(page, "testnet:stillness");
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const blockedModal = page.getByRole("dialog", { name: "Deployment blocked" });
  await expect(blockedModal).toBeVisible();
  await expect(blockedModal.getByText("Target: testnet:stillness")).toBeVisible();
  await expect(blockedModal.locator(".ff-deployment-modal__message")).toContainText("Connect a Sui-compatible wallet before deploying to testnet:stillness.");
  await expect(blockedModal.locator(".ff-deployment-modal__remediation")).toContainText("Resolve the reported blocker before retrying deployment.");
  await blockedModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText("Target: testnet:stillness")).toBeVisible();
  await expect(deploymentDetails.getByText(/Connect a Sui-compatible wallet before deploying to testnet:stillness/i)).toBeVisible();

  await page.getByRole("button", { name: "Move" }).click();
  await expect(page.locator(".ff-move-source__filename", { hasText: /Connect and approve a Sui-compatible wallet for testnet:stillness, then retry deployment/i }).first()).toBeVisible();
});

test("blocks local deployment when the local target is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_local_deploy_ready=0");

  const compilationStatus = getCompilationStatusButton(page);
  await expect(compilationStatus).toContainText("Compiled");
  const localTargetLabel = getTargetDisplayLabel("local");

  await openDeployWorkflow(page);
  await page.getByRole("button", { name: /^Deploy localnet:0x[a-f0-9]{4}\.\.\.$/i }).click();

  const blockedModal = page.getByRole("dialog", { name: "Deployment blocked" });
  await expect(blockedModal).toBeVisible();
  await expect(blockedModal.locator(".ff-deployment-modal__copy")).toContainText(localTargetLabel);
  await expect(blockedModal.locator(".ff-deployment-modal__message")).toContainText("The local validator required for local deployment is unavailable.");
  await expect(blockedModal.locator(".ff-deployment-modal__remediation")).toContainText("Resolve the reported blocker before retrying deployment.");
  await blockedModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails).toBeVisible();
  await expect(deploymentDetails.getByText("Deployment blocked", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText("Target: local", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText("Stage: validating", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText("Severity: error", { exact: true })).toBeVisible();
  await expect(deploymentDetails.getByText("The local validator required for local deployment is unavailable.")).toBeVisible();
  await expect(deploymentDetails.getByText(/Start or configure the local validator, then retry deployment to local/i)).toBeVisible();
});

test("surfaces failed deployments as non-successful and keeps retry guidance visible", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_fail=1&ff_mock_deploy_stage_delay_ms=80");

  const compilationStatus = getCompilationStatusButton(page);
  await expect(compilationStatus).toContainText("Compiled");

  await selectDeploymentTarget(page, "testnet:stillness");
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const failedModal = page.getByRole("dialog", { name: "Deployment failed" });
  await expect(failedModal).toBeVisible();
  await expect(failedModal.locator(".ff-deployment-modal__message")).toContainText("failed before confirmation completed");
  await expect(failedModal.locator(".ff-deployment-modal__remediation")).toContainText("Review the wallet and RPC error details, then retry deployment once the target is healthy.");
  await failedModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText("Deployment failed")).toBeVisible();
  await expect(deploymentDetails.getByText(/Review the wallet and RPC error details, then retry deployment once the target is healthy/i)).toBeVisible();
});

test("surfaces unresolved deployments as non-successful and preserves confirmation evidence", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_unresolved=1&ff_mock_deploy_stage_delay_ms=80");

  const compilationStatus = getCompilationStatusButton(page);
  await expect(compilationStatus).toContainText("Compiled");

  await selectDeploymentTarget(page, "testnet:utopia");
  await page.getByRole("button", { name: "Deploy testnet:utopia" }).click();

  const unresolvedModal = page.getByRole("dialog", { name: "Deployment unresolved" });
  await expect(unresolvedModal).toBeVisible();
  await expect(unresolvedModal.locator(".ff-deployment-modal__message")).toContainText("could not be confirmed within the verification window");
  await expect(unresolvedModal.getByText(/^Package ID: 0x[a-f0-9]{64}$/i)).toBeVisible();
  await expect(unresolvedModal.getByText(/^Transaction Digest: 0x[a-f0-9]{64}$/i)).toBeVisible();
  await expect(unresolvedModal.locator(".ff-deployment-modal__remediation")).toContainText("Retry confirmation or redeploy after checking the target network and transaction digest.");
  await unresolvedModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployment Blocked");
  await deploymentStatus.click();
  const deploymentDetails = page.locator("#deployment-status-details");
  await expect(deploymentDetails.getByText("Deployment unresolved")).toBeVisible();
  await expect(deploymentDetails.getByText(/^Package ID: 0x[a-f0-9]{64}$/i)).toBeVisible();
  await expect(deploymentDetails.getByText(/^Transaction Digest: 0x[a-f0-9]{64}$/i)).toBeVisible();
});