import type { Page } from "@playwright/test";

import { CONTRACT_LIBRARY_STORAGE_KEY, sanitizeContractName } from "../../../src/utils/contractStorage";

import { referenceGraphFixtures } from "../referenceGraphFixtures";

export const AUTHORIZATION_READINESS_QUERY = "?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120";

export async function openAuthorizationReadinessPage(page: Page, contractName = referenceGraphFixtures[0]?.contractName): Promise<void> {
  const contracts = referenceGraphFixtures.map((entry) => {
    const sanitizedName = sanitizeContractName(entry.contractName);

    return {
      id: `contract:${sanitizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: sanitizedName,
      nodes: entry.fixture.nodes,
      edges: entry.fixture.edges,
      updatedAt: "2026-03-20T00:00:00.000Z",
    };
  });
  const requestedContractName = sanitizeContractName(contractName);
  const activeContract = contracts.find((entry) => entry.name === requestedContractName) ?? contracts[0];

  await page.addInitScript(
    ({ storageKey, activeContractName, storageContracts }) => {
      window.localStorage.clear();
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 2,
          activeContractName,
          contracts: storageContracts,
        }),
      );
    },
    {
      storageKey: CONTRACT_LIBRARY_STORAGE_KEY,
      activeContractName: activeContract.name,
      storageContracts: contracts,
    },
  );

  await page.goto(`/${AUTHORIZATION_READINESS_QUERY}`);
}