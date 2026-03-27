import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "./fixtures/accessibility";
import { getCodeViewButton, getCompilationStatusButton } from "./fixtures/workflow";
import { openAuthorizationReadinessPage } from "./fixtures/authorizationReadiness";
import { referenceGraphFixtures } from "./referenceGraphFixtures";

test("preview and build consume the same generated artifact", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop artifact preview coverage only.");

  const referenceFixture = referenceGraphFixtures[0];
  await openAuthorizationReadinessPage(page, referenceFixture.contractName);

  const statusButton = getCompilationStatusButton(page);
  await expect(statusButton).toContainText("Compiled");

  await expect(getCodeViewButton(page)).toBeEnabled();
  await expect(page.getByRole("button", { name: "Deploy", exact: true })).toBeEnabled();

  await getCodeViewButton(page).click();
  await expect(page.getByText(`${referenceFixture.expectedModuleName}.move`)).toBeVisible();
  await expect(page.getByText(new RegExp(`module builder_extensions::${referenceFixture.expectedModuleName}`, "i"))).toBeVisible();
  await expect(page.locator(".ff-move-source__meta")).toHaveCount(0);
  await expectNoAccessibilityViolations(page);
});