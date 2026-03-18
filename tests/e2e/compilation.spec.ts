import { expect, test, type Page } from "@playwright/test";

async function prepareCompilationPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=600&ff_idle_ms=120");
}

async function dropNode(page: Page, label: string, clientX: number, clientY: number) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  const source = page.getByRole("button", { name: label, exact: true }).first();
  const canvas = page.locator('[data-testid="canvas-workspace"] .react-flow').first();

  await source.dispatchEvent("dragstart", { dataTransfer });
  await canvas.dispatchEvent("dragover", { dataTransfer });
  await canvas.dispatchEvent("drop", { clientX, clientY, dataTransfer });
}

async function ensureCategoryExpanded(page: Page, categoryLabel: string) {
  const toggle = page.getByRole("button", { name: `${categoryLabel} category` });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
}

test("auto-compiles after idle and supports manual build", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await prepareCompilationPage(page);

  const statusButton = page.locator(".ff-compilation-status__button");
  const buildButton = page.getByRole("button", { name: "Build" });

  await expect(statusButton).toContainText("Idle");
  await ensureCategoryExpanded(page, "Data Source");
  await dropNode(page, "Group Bonus Config", 360, 260);
  await expect(statusButton).toContainText("Idle");
  await expect(statusButton).toContainText("Compiling");
  await expect(statusButton).toContainText("Compiled");

  await buildButton.click();
  await expect(page.getByRole("button", { name: "Building" })).toBeDisabled();
  await expect(statusButton).toContainText("Compiling");
  await expect(statusButton).toContainText("Compiled");
});