import { describe, expect, it } from "vitest";

import {
  clearDeploymentState,
  DEPLOYMENT_STATE_STORAGE_KEY,
  loadActiveContractName,
  loadDeploymentState,
  saveDeploymentState,
  validateDeploymentState,
} from "../utils/deploymentStateStorage";

describe("deploymentStateStorage", () => {
  it("saves and loads a valid deployment snapshot", () => {
    const state = {
      version: 1 as const,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "testnet:stillness" as const,
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "Starter Contract",
    };

    saveDeploymentState(window.localStorage, state);

    expect(loadDeploymentState(window.localStorage)).toEqual(state);
  });

  it("returns null for corrupted JSON", () => {
    window.localStorage.setItem(DEPLOYMENT_STATE_STORAGE_KEY, "{broken-json");

    expect(loadDeploymentState(window.localStorage)).toBeNull();
  });

  it("returns null for an unsupported schema version", () => {
    window.localStorage.setItem(DEPLOYMENT_STATE_STORAGE_KEY, JSON.stringify({ version: 2 }));

    expect(loadDeploymentState(window.localStorage)).toBeNull();
  });

  it("validates matching contract and deployment target", () => {
    const state = {
      version: 1 as const,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "testnet:stillness" as const,
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "Starter Contract",
    };

    expect(validateDeploymentState(state, { contractName: "Starter Contract", targetId: "testnet:stillness" })).toBe(true);
    expect(validateDeploymentState(state, { contractName: "Different Contract", targetId: "testnet:stillness" })).toBe(false);
    expect(validateDeploymentState(state, { contractName: "Starter Contract", targetId: "testnet:utopia" })).toBe(false);
    expect(validateDeploymentState(state, { contractName: "Starter Contract", targetId: "testnet:stillness", moduleName: "other_module" })).toBe(false);
  });

  it("clears the persisted deployment snapshot", () => {
    window.localStorage.setItem(DEPLOYMENT_STATE_STORAGE_KEY, JSON.stringify({ version: 1 }));

    clearDeploymentState(window.localStorage);

    expect(window.localStorage.getItem(DEPLOYMENT_STATE_STORAGE_KEY)).toBeNull();
  });

  it("reads the active contract name from the stored contract library", () => {
    window.localStorage.setItem("frontier-flow:contracts", JSON.stringify({
      version: 2,
      activeContractName: "Starter Contract",
      contracts: [],
    }));

    expect(loadActiveContractName(window.localStorage)).toBe("Starter Contract");
  });
});