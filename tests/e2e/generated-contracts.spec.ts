import { expect, test } from "@playwright/test";

import { openAuthorizationReadinessPage } from "./fixtures/authorizationReadiness";
import { referenceGraphFixtures } from "./referenceGraphFixtures";

test("preview and build consume the same generated artifact", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop artifact preview coverage only.");

  const referenceFixture = referenceGraphFixtures[0];
  await openAuthorizationReadinessPage(page, referenceFixture.contractName);

  const statusButton = page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
  await expect(statusButton).toContainText("Compiled");

  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(statusButton).toContainText("Compiled");

  await page.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.getByText(`${referenceFixture.expectedModuleName}.move`)).toBeVisible();
  await expect(page.getByText(new RegExp(`module builder_extensions::${referenceFixture.expectedModuleName}`, "i"))).toBeVisible();
  await expect(page.locator(".ff-move-source__filename").filter({ hasText: /Select a deployment target and validate the target prerequisites before deploying\./i })).toBeVisible();
});