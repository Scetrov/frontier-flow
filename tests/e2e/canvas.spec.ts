import { expect, test, type Page } from "@playwright/test";

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

test("drops representative contract nodes onto the canvas", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await page.goto("/");
  const workspace = page.getByTestId("canvas-workspace");

  await dropNode(page, "Aggression", 220, 180);
  await ensureCategoryExpanded(page, "Data Source");
  await dropNode(page, "Group Bonus Config", 360, 260);
  await ensureCategoryExpanded(page, "Logic Gate");
  await dropNode(page, "Exclude Same Tribe", 520, 320);
  await ensureCategoryExpanded(page, "Action");
  await dropNode(page, "Add to Queue", 680, 380);

  await expect(workspace.getByText("Aggression")).toHaveCount(2);
  await expect(workspace.getByText("Group Bonus Config")).toHaveCount(1);
  await expect(workspace.getByText("Exclude Same Tribe")).toHaveCount(2);
  await expect(workspace.getByText("Add to Queue")).toHaveCount(2);
});