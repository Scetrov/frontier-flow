import { expect, test, type Page } from "@playwright/test";

import { expectNoAccessibilityViolations } from "./fixtures/accessibility";

const TUTORIAL_STORAGE_KEY = "frontier-flow:tutorial";

const tutorialMessages = [
  "Select the network you want to deploy to here",
  "Drag nodes from here into the canvas to create a flow.",
  "Drag from a socket to a matching socket to connect two nodes",
  "You can save or load a previous flow from the Browser Storage, or export YAML to share",
  "Once your flow is complete, move on to review the code and Deploy from here",
] as const;

async function prepareTutorialPage(page: Page, options?: { readonly hasSeenTutorial?: boolean }) {
  await page.addInitScript(({ hasSeenTutorial, storageKey }) => {
    window.localStorage.clear();

    if (hasSeenTutorial) {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, hasSeenTutorial: true }));
    }
  }, {
    hasSeenTutorial: options?.hasSeenTutorial ?? false,
    storageKey: TUTORIAL_STORAGE_KEY,
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120");
}

async function expectTutorialStep(page: Page, stepNumber: number) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`Step ${String(stepNumber)} of 5`);
  await expect(dialog).toContainText(tutorialMessages[stepNumber - 1]);
  return dialog;
}

test("auto-starts for first-time users and completes the full walkthrough", async ({ page }) => {
  await prepareTutorialPage(page);

  const toolboxPanel = page.locator("#node-toolbox");
  const savedContractPanel = page.locator("#saved-contract-controls");

  const firstDialog = await expectTutorialStep(page, 1);
  await firstDialog.getByRole("button", { name: "Next" }).click();

  const toolboxDialog = await expectTutorialStep(page, 2);
  await expect(toolboxPanel).not.toHaveAttribute("aria-hidden", "true");
  await toolboxDialog.getByRole("button", { name: "Next" }).click();

  const socketDialog = await expectTutorialStep(page, 3);
  await expect(toolboxPanel).toHaveAttribute("aria-hidden", "true");
  await expect(savedContractPanel).toHaveAttribute("aria-hidden", "true");
  await socketDialog.getByRole("button", { name: "Next" }).click();

  const saveLoadDialog = await expectTutorialStep(page, 4);
  await expect(savedContractPanel).not.toHaveAttribute("aria-hidden", "true");
  await saveLoadDialog.getByRole("button", { name: "Next" }).click();

  const finalDialog = await expectTutorialStep(page, 5);
  await finalDialog.getByRole("button", { name: "Finish" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(async () => page.evaluate((storageKey) => {
    return window.localStorage.getItem(storageKey);
  }, TUTORIAL_STORAGE_KEY)).toContain('"hasSeenTutorial":true');
});

test("only shows tutorial help in the visual designer view", async ({ page }) => {
  await prepareTutorialPage(page, { hasSeenTutorial: true });

  await expect(page.getByRole("button", { name: "Start tutorial" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Code" })).toBeEnabled();
  await page.getByRole("button", { name: "Code" }).click();
  await expect(page.getByRole("button", { name: "Start tutorial" })).toHaveCount(0);
  await page.getByRole("button", { name: "Visual" }).click();
  await expect(page.getByRole("button", { name: "Start tutorial" })).toBeVisible();
});

test("does not auto-start when already seen and can be restarted from the header", async ({ page }) => {
  await prepareTutorialPage(page, { hasSeenTutorial: true });

  await expect(page.getByRole("button", { name: "Start tutorial" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Start tutorial" }).click();
  const dialog = await expectTutorialStep(page, 1);
  await dialog.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("supports keyboard navigation, passes focused accessibility auditing, and keeps step transitions responsive across the next frame", async ({ page }) => {
  await prepareTutorialPage(page);

  const dialog = await expectTutorialStep(page, 1);
  await expectNoAccessibilityViolations(page, { include: [".ff-tutorial__panel"] });

  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Next" })).toBeFocused();

  const transitionDuration = await page.evaluate(async () => {
    const nextButton = document.querySelector<HTMLButtonElement>(".ff-tutorial__button--primary");
    if (nextButton === null) {
      throw new Error("Tutorial next button is missing.");
    }

    performance.clearMarks("tutorial-step-start");
    performance.clearMarks("tutorial-step-frame");
    performance.clearMeasures("tutorial-step-transition");
    performance.mark("tutorial-step-start");
    nextButton.click();
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        performance.mark("tutorial-step-frame");
        resolve();
      });
    });
    performance.measure("tutorial-step-transition", "tutorial-step-start", "tutorial-step-frame");
    const entry = performance.getEntriesByName("tutorial-step-transition").at(-1);
    return entry?.duration ?? Number.POSITIVE_INFINITY;
  });

  expect(transitionDuration).toBeLessThan(150);
  await expectTutorialStep(page, 2);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});