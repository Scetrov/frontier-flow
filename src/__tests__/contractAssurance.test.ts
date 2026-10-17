import { describe, expect, it } from "vitest";

import type { SimulationRunResult, TurretSimulationSession } from "../types/turretSimulation";
import { isContractSimulated, isSharedContract } from "../utils/contractAssurance";
import type { SharedExtension } from "../utils/sharedExtensionStorage";

const KEY = "testnet:stillness:0xfeedface:starter_contract";

const extension: SharedExtension = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xfeedface",
  deployedAt: new Date(0).toISOString(),
  contractName: "Starter Contract",
};

function session(overrides: Partial<Pick<TurretSimulationSession, "deploymentKey" | "latestResult">> = {}) {
  return { deploymentKey: null, latestResult: null, ...overrides } as Pick<TurretSimulationSession, "deploymentKey" | "latestResult">;
}

const result = {} as SimulationRunResult;

describe("shared contract detection", () => {
  it("recognises a contract that came from a saved shared extension", () => {
    expect(isSharedContract(KEY, [extension])).toBe(true);
  });

  it("does not treat the wallet's own deployment as shared", () => {
    expect(isSharedContract("testnet:stillness:0xabc:own_contract", [extension])).toBe(false);
  });

  it("treats the same package on another network as a different contract", () => {
    expect(isSharedContract("testnet:utopia:0xfeedface:starter_contract", [extension])).toBe(false);
  });

  it.each([
    ["no contract is selected", null, [extension]],
    ["nothing is saved", KEY, [] as readonly SharedExtension[]],
  ])("is false when %s", (_label, key, extensions) => {
    expect(isSharedContract(key, extensions)).toBe(false);
  });
});

describe("simulation assurance", () => {
  it("reports a contract exercised in this session", () => {
    expect(isContractSimulated(KEY, session({ deploymentKey: KEY, latestResult: result }))).toBe(true);
  });

  it("does not credit a result that belongs to a different contract", () => {
    expect(isContractSimulated(KEY, session({ deploymentKey: "testnet:utopia:0xabc:other", latestResult: result }))).toBe(false);
  });

  it("does not credit an opened session that produced no result", () => {
    expect(isContractSimulated(KEY, session({ deploymentKey: KEY }))).toBe(false);
  });

  it("is false when no contract is selected", () => {
    expect(isContractSimulated(null, session({ deploymentKey: null, latestResult: result }))).toBe(false);
  });
});
