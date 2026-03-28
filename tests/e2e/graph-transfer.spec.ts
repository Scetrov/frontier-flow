import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "./fixtures/accessibility";

test("shows transfer actions in the saved-contract drawer and supports keyboard dismissal", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drawer layout coverage only.");

  await page.goto("/");
  const contractDrawer = page.locator("#saved-contract-controls");

  await expect(contractDrawer.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await expect(contractDrawer.getByRole("button", { name: "Save Copy", exact: true })).toBeVisible();
  await expect(contractDrawer.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
  await expect(contractDrawer.getByRole("button", { name: "Import YAML", exact: true })).toBeVisible();
  await expect(contractDrawer.getByRole("button", { name: "Import Walrus", exact: true })).toBeVisible();
  await expect(contractDrawer.getByRole("button", { name: "Export YAML", exact: true })).toBeVisible();
  await expect(contractDrawer.getByRole("button", { name: "Export Walrus", exact: true })).toBeDisabled();

  await contractDrawer.getByRole("button", { name: "Import Walrus", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Import From Walrus" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Import From Walrus" })).toHaveCount(0);
});

test("imports a YAML graph document without leaving the workspace", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop file import coverage only.");

  await page.goto("/");

  await page.getByRole("button", { name: "Import YAML" }).click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("tests/e2e/fixtures/aggressor-first.frontier-flow.yaml");

  await expect(page.locator(".ff-transfer-dialog__status")).toContainText("Imported");
  await expect(page.getByText("Imported contract")).toBeVisible();
});

test("has no accessibility violations for the import dialog", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop accessibility snapshot only.");

  await page.goto("/");
  await page.getByRole("button", { name: "Import Walrus" }).click();

  await expectNoAccessibilityViolations(page, {
    include: [".ff-transfer-dialog"],
  });
});