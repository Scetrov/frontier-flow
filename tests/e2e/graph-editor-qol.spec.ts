import { expect, test, type Page } from "@playwright/test";

import { clearStorageAndMarkTutorialSeen } from "./fixtures/storage";

async function dropNode(page: Page, label: string, clientX: number, clientY: number) {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  const source = page.getByRole("button", { exact: true, name: label }).first();
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

test("supports graph-editor QoL deletion and taxonomy flows", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop graph QoL validation only.");

  await clearStorageAndMarkTutorialSeen(page);
  await page.goto("/");

  expect(await page.getByRole("heading", { level: 3 }).allTextContents()).toEqual([
    "Event Trigger",
    "Static Data",
    "Data Extractor",
    "Logic",
    "Action",
  ]);

  await page.getByRole("button", { name: "Close saved contract controls" }).click();

  await dropNode(page, "Aggression", 240, 180);
  const node = page.locator(".ff-node").filter({ has: page.getByText("Aggression", { exact: true }) }).first();
  const workspace = page.getByTestId("canvas-workspace");

  await node.getByRole("button", { name: "Delete Aggression" }).click();
  await expect(node.getByRole("button", { name: "Confirm delete Aggression" })).toBeVisible();
  await node.getByRole("button", { name: "Confirm delete Aggression" }).click();
  await expect(workspace.locator(".ff-node__title").filter({ hasText: /^Aggression$/ })).toHaveCount(1);

  await ensureCategoryExpanded(page, "Static Data");
  await expect(page.getByRole("button", { name: "List of Tribe", exact: true })).toBeVisible();
  await ensureCategoryExpanded(page, "Data Extractor");
  await expect(page.getByRole("button", { name: "Get Behaviour", exact: true })).toBeVisible();
});