import { expect, test, type Page } from "@playwright/test";

import { CONTRACT_LIBRARY_STORAGE_KEY } from "../../src/utils/contractStorage";
import { referenceGraphFixtures, type GraphFixtureEdge, type GraphFixtureNode } from "./referenceGraphFixtures";

async function prepareCompilationPage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=600&ff_idle_ms=120");
}

async function prepareCompilationPageWithQuery(page: Page, query: string) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto(`/${query}`);
}

async function prepareCompilationPageWithLibrary(
  page: Page,
  query: string,
  library: {
    readonly version: 1;
    readonly activeContractName: string;
    readonly contracts: readonly {
      readonly name: string;
      readonly nodes: readonly GraphFixtureNode[];
      readonly edges: readonly GraphFixtureEdge[];
      readonly updatedAt: string;
    }[];
  },
) {
  await page.addInitScript(
    ({ storageKey, storageLibrary }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(storageLibrary));
    },
    { storageKey: CONTRACT_LIBRARY_STORAGE_KEY, storageLibrary: library },
  );
  await page.goto(`/${query}`);
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

function getCompilationStatusButton(page: Page) {
  return page.locator('.ff-compilation-status__button[aria-controls="compilation-diagnostics"]');
}

test("auto-compiles after idle and supports manual build", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await prepareCompilationPage(page);

  const statusButton = getCompilationStatusButton(page);
  const buildButton = page.getByRole("button", { name: "Build" });
  const moveTab = page.getByRole("button", { name: "Move" });

  await expect(statusButton).toBeVisible();
  await ensureCategoryExpanded(page, "Event Trigger");
  await dropNode(page, "Proximity", 360, 260);
  await expect(statusButton).toContainText("Compiled");

  await buildButton.click();
  await expect(page.getByRole("button", { name: "Building" })).toBeDisabled();
  await expect(statusButton).toContainText("Compiled");

  await moveTab.click();
  await expect(page.getByText("Generated source")).toBeVisible();
  await expect(page.getByText("starter_contract.move")).toBeVisible();
  await expect(page.getByText(/module builder_extensions::starter_contract/i)).toBeVisible();
});

test("reference graph matrix compiles multiple supported saved contracts through the same workflow", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  const library = {
    version: 1 as const,
    contracts: referenceGraphFixtures.map((entry) => {
      return {
        name: entry.contractName,
        nodes: entry.fixture.nodes,
        edges: entry.fixture.edges,
        updatedAt: "2026-03-18T00:00:00.000Z",
      };
    }),
  };

  for (const entry of referenceGraphFixtures) {
    await prepareCompilationPageWithLibrary(page, "?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120", {
      ...library,
      activeContractName: entry.contractName,
    });

    const statusButton = getCompilationStatusButton(page);
    const buildButton = page.getByRole("button", { name: "Build", exact: true });
    const moveTab = page.getByRole("button", { name: "Move", exact: true });

    await expect(statusButton).toContainText("Compiled");
    await buildButton.click();
    await expect(statusButton).toContainText("Compiled");

    await moveTab.click();
    await expect(page.getByText(`${entry.expectedModuleName}.move`)).toBeVisible();
    await expect(page.getByText(new RegExp(`module builder_extensions::${entry.expectedModuleName}`, "i"))).toBeVisible();
  }
});

test("surfaces mock compiler warnings while keeping the build successful", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await prepareCompilationPageWithQuery(page, "?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_mock_compile_warning=1&ff_idle_ms=120");

  const statusButton = getCompilationStatusButton(page);

  await expect(statusButton).toContainText("Compiled");
  await expect(statusButton).toBeEnabled();

  await statusButton.click();
  await expect(page.getByText(/mock compile warning/i)).toBeVisible();
});

test("surfaces mock compiler failures through the build status panel", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await prepareCompilationPageWithQuery(page, "?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_mock_compile_error=1&ff_idle_ms=120");

  const statusButton = getCompilationStatusButton(page);
  await expect(statusButton).toContainText("Error");
  await expect(statusButton).toBeEnabled();

  await statusButton.click();
  await expect(page.getByText(/mock compile failure/i)).toBeVisible();

  await page.getByRole("button", { name: "Move", exact: true }).click();
  await expect(page.getByText(/module builder_extensions::starter_contract/i)).toBeVisible();
});