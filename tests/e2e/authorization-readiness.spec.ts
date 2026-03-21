import { expect, test } from "@playwright/test";

import { openAuthorizationReadinessPage } from "./fixtures/authorizationReadiness";

test("surfaces existing-turret deployment status without lifecycle actions", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop deployment status coverage only.");

  await openAuthorizationReadinessPage(page);

  await expect(page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]')).toContainText("Compiled");
  const deploymentButton = page.getByRole("button", { name: /Deployment Blocked/i });
  await expect(deploymentButton).toBeVisible();
  await deploymentButton.click();
  await expect(page.getByText(/Select a deployment target and validate the wallet or local-environment prerequisites before deploying\./i)).toBeVisible();

  await expect(page.getByRole("button", { name: /Anchor/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Online/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Offline/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Unanchor/i })).toHaveCount(0);
});