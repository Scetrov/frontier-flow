import { expect, test } from "@playwright/test";

import { openAuthorizationReadinessPage } from "./fixtures/authorizationReadiness";

test("surfaces existing-turret deployment status without lifecycle actions", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop deployment status coverage only.");

  await openAuthorizationReadinessPage(page);

  await expect(page.locator(".ff-compilation-status__button")).toContainText("Compiled");
  await expect(page.getByText(/Deployment Blocked/i)).toBeVisible();
  await expect(page.getByText(/Provide the target turret package and extension registration details to continue deployment\./i)).toBeVisible();

  await expect(page.getByRole("button", { name: /Anchor/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Online/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Offline/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Unanchor/i })).toHaveCount(0);
});