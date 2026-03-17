import { expect, test, type Page } from "@playwright/test";

async function dropNode(page: Page, label: string, clientX: number, clientY: number) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  const source = page.getByRole("button", { name: new RegExp(label) }).first();
  const canvas = page.locator('[data-testid="canvas-workspace"] .react-flow').first();

  await source.dispatchEvent("dragstart", { dataTransfer });
  await canvas.dispatchEvent("dragover", { dataTransfer });
  await canvas.dispatchEvent("drop", { clientX, clientY, dataTransfer });
}

test("drops representative contract nodes onto the canvas", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await page.goto("/");
  const workspace = page.getByTestId("canvas-workspace");

  await dropNode(page, "Aggression", 220, 180);
  await dropNode(page, "Group Bonus Config", 360, 260);
  await dropNode(page, "Exclude Same Tribe", 520, 320);
  await dropNode(page, "Add to Queue", 680, 380);

  await expect(workspace.getByText("Aggression")).toBeVisible();
  await expect(workspace.getByText("Group Bonus Config")).toBeVisible();
  await expect(workspace.getByText("Exclude Same Tribe")).toBeVisible();
  await expect(workspace.getByText("Add to Queue")).toBeVisible();
});