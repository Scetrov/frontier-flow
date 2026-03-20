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

function getCanvasNodes(page: Page) {
  return page.locator('[data-testid="canvas-workspace"] .react-flow__viewport .ff-node');
}

async function selectSavedContractAndWaitForDialog(page: Page, contractLabel: string) {
  return Promise.all([
    page.waitForEvent("dialog"),
    page.evaluate((label) => {
      window.setTimeout(() => {
        const select = document.querySelector<HTMLSelectElement>('select[aria-label="Saved contract"]');
        if (select === null) {
          throw new Error("Missing saved contract select");
        }

        const targetOption = Array.from(select.options).find((option) => option.label === label || option.value === label);
        if (targetOption === undefined) {
          throw new Error(`Missing saved contract option: ${label}`);
        }

        select.value = targetOption.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }, 0);
    }, contractLabel),
  ]);
}

test("shows seeded example contracts in the load panel on a clean workspace", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/");

  const contractOptions = page.locator('select[aria-label="Saved contract"] option');
  await expect(contractOptions.filter({ hasText: "Example · Turret Aggressor First" })).toHaveCount(1);
  await expect(contractOptions.filter({ hasText: "Example · Turret Low HP Finisher" })).toHaveCount(1);
  await expect(contractOptions.filter({ hasText: "Example · Turret Player Screen" })).toHaveCount(1);
});

test("asks before replacing unsaved canvas work with a seeded example contract", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop load-panel replacement coverage only.");

  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/");

  await ensureCategoryExpanded(page, "Event Trigger");
  await dropNode(page, "Proximity", 420, 220);

  const [dialog] = await selectSavedContractAndWaitForDialog(page, "Example · Turret Aggressor First");

  expect(dialog.message()).toContain("unsaved canvas changes");
  await dialog.accept();

  const canvasNodes = getCanvasNodes(page);
  await expect(canvasNodes.filter({ hasText: "Aggressor Bonus" })).toHaveCount(1);
  await expect(canvasNodes.filter({ hasText: "Proximity" })).toHaveCount(0);
});