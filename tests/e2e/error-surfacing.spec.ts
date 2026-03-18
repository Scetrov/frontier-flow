import { expect, test, type Page } from "@playwright/test";

async function prepareCompilationPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=600&ff_idle_ms=120");
}

async function ensureCategoryExpanded(page: Page, categoryLabel: string) {
  const toggle = page.getByRole("button", { name: `${categoryLabel} category` });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
}

async function dropNode(page: Page, label: string, clientX: number, clientY: number) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  const source = page.getByRole("button", { name: label, exact: true }).first();
  const canvas = page.locator('[data-testid="canvas-workspace"] .react-flow').first();

  await source.dispatchEvent("dragstart", { dataTransfer });
  await canvas.dispatchEvent("dragover", { dataTransfer });
  await canvas.dispatchEvent("drop", { clientX, clientY, dataTransfer });
}

test("surfaces invalid disconnected nodes and returns to compiled after removal", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await prepareCompilationPage(page);
  const statusButton = page.locator(".ff-compilation-status__button");

  await expect(statusButton).toContainText("Compiling");
  await expect(statusButton).toContainText("Compiled");

  await ensureCategoryExpanded(page, "Action");
  await dropNode(page, "Add to Queue", 760, 420);

  await expect(statusButton).toContainText("Error");
  await statusButton.click();
  await expect(page.getByRole("button", { name: /Required input 'priority in' is not connected\./ })).toBeVisible();
  await expect(page.locator('.ff-node[data-validation-error="true"]')).toHaveCount(1);

  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.reload();

  await expect(statusButton).toContainText("Compiling");
  await expect(statusButton).toContainText("Compiled");
  await expect(page.locator('.ff-node[data-validation-error="true"]')).toHaveCount(0);
});