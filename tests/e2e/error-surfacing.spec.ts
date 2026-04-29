import { expect, test, type Page } from "@playwright/test";

import { CONTRACT_LIBRARY_STORAGE_KEY } from "../../src/utils/contractStorage";
import { SEEN_TUTORIAL_STORAGE_STATE, TUTORIAL_STORAGE_KEY } from "./fixtures/storage";

function getCompilationStatusButton(page: Page) {
  return page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
}

async function prepareInvalidCompilationPage(page: Page) {
  await page.addInitScript(
    ({ storageKey, tutorialState, tutorialStorageKey }) => {
      window.localStorage.clear();
      window.localStorage.setItem(tutorialStorageKey, JSON.stringify(tutorialState));
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: 2,
        activeContractName: "Broken Queue Contract",
        contracts: [
          {
            id: "contract:broken-queue-contract",
            name: "Broken Queue Contract",
            nodes: [
              { id: "trigger", type: "enteredAttacked", position: { x: 0, y: 0 }, data: {} },
              { id: "queue", type: "addToQueue", position: { x: 320, y: 0 }, data: {} },
            ],
            edges: [],
            updatedAt: "1970-01-01T00:00:00.000Z",
          },
        ],
      }));
    },
    {
      storageKey: CONTRACT_LIBRARY_STORAGE_KEY,
      tutorialState: SEEN_TUTORIAL_STORAGE_STATE,
      tutorialStorageKey: TUTORIAL_STORAGE_KEY,
    },
  );

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=600&ff_idle_ms=120");
}

test("surfaces invalid disconnected nodes and returns to compiled after removal", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await prepareInvalidCompilationPage(page);
  const statusButton = getCompilationStatusButton(page);

  await expect(statusButton).toContainText("Error");
  await statusButton.click();
  await expect(page.getByRole("button", { name: /Required input 'priority queue' is not connected\./ })).toBeVisible();
  await expect(page.locator('.ff-node[data-validation-error="true"]')).toHaveCount(1);

  const queueNode = page.locator(".ff-node").filter({ has: page.getByText("Add to Queue", { exact: true }) }).first();

  await queueNode.getByRole("button", { name: "Delete Add to Queue" }).click();
  await expect(queueNode.getByRole("button", { name: "Confirm delete Add to Queue" })).toBeVisible();
  await queueNode.getByRole("button", { name: "Confirm delete Add to Queue" }).click();

  await expect(statusButton).toContainText("Compiled");
  await expect(page.locator('.ff-node[data-validation-error="true"]')).toHaveCount(0);
});