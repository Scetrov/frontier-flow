import { expect, test, type Page } from "@playwright/test";

const contractLibraryStorageKey = "frontier-flow:contracts";

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

async function seedContractLibrary(page: Page, library: unknown) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: contractLibraryStorageKey, value: library },
  );
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

test("authors primitive targeting rules without retired bundled nodes in the toolbox", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop drag and drop coverage only.");

  await page.goto("/");

  await ensureCategoryExpanded(page, "Logic Gate");

  await expect(page.getByRole("button", { name: "Is Same Tribe", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "NOT", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "OR", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exclude Same Tribe", exact: true })).toHaveCount(0);

  await dropNode(page, "Is Same Tribe", 260, 180);
  await dropNode(page, "NOT", 420, 220);
  await dropNode(page, "OR", 580, 260);

  const workspace = page.getByTestId("canvas-workspace");
  await expect(workspace.getByText("Is Same Tribe")).toHaveCount(2);
  await expect(workspace.getByText("NOT")).toHaveCount(2);
  await expect(workspace.getByText("OR")).toHaveCount(2);
});

test("auto-migrates legacy bundled same-tribe contracts into primitive nodes on load", async ({ page }) => {
  await seedContractLibrary(page, {
    version: 2,
    activeContractName: "Legacy Same Tribe",
    contracts: [
      {
        id: "legacy:same-tribe",
        name: "Legacy Same Tribe",
        nodes: [
          { id: "trigger", type: "aggression", position: { x: 0, y: 0 }, data: {} },
          { id: "tribe", type: "getTribe", position: { x: 200, y: 0 }, data: {} },
          { id: "aggressor", type: "isAggressor", position: { x: 200, y: 180 }, data: {} },
          { id: "legacy_same_tribe", type: "excludeSameTribe", position: { x: 420, y: 60 }, data: {} },
          { id: "queue", type: "addToQueue", position: { x: 760, y: 120 }, data: {} },
        ],
        edges: [
          { id: "edge_tribe", source: "tribe", sourceHandle: "tribe", target: "legacy_same_tribe", targetHandle: "tribe" },
          { id: "edge_owner_tribe", source: "tribe", sourceHandle: "owner_tribe", target: "legacy_same_tribe", targetHandle: "owner_tribe" },
          { id: "edge_aggressor", source: "aggressor", sourceHandle: "is_aggressor", target: "legacy_same_tribe", targetHandle: "is_aggressor" },
          { id: "edge_predicate", source: "legacy_same_tribe", sourceHandle: "include", target: "queue", targetHandle: "predicate" },
        ],
        updatedAt: new Date(0).toISOString(),
      },
    ],
  });

  await page.goto("/");

  const workspace = page.getByTestId("canvas-workspace");
  await expect(workspace.getByText("Is Same Tribe")).toHaveCount(1);
  await expect(workspace.getByText("NOT")).toHaveCount(1);
  await expect(workspace.getByText("OR")).toHaveCount(1);
  await expect(workspace.getByText("Exclude Same Tribe")).toHaveCount(0);
  await expect(page.getByText("Legacy remediation required")).toHaveCount(0);
});

test("shows a visible remediation notice for unsupported legacy content", async ({ page }) => {
  await seedContractLibrary(page, {
    version: 2,
    activeContractName: "Unsupported Legacy",
    contracts: [
      {
        id: "legacy:unsupported",
        name: "Unsupported Legacy",
        nodes: [
          { id: "trigger", type: "aggression", position: { x: 0, y: 0 }, data: {} },
          { id: "legacy_unknown", type: "obsoleteNode", position: { x: 200, y: 0 }, data: {} },
        ],
        edges: [],
        updatedAt: new Date(0).toISOString(),
      },
    ],
  });

  await page.goto("/");

  await expect(page.getByText("Legacy remediation required")).toBeVisible();
  await expect(page.getByText(/Legacy node \"obsoleteNode\" could not be restored automatically\./)).toBeVisible();
});