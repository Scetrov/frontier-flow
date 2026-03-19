import { describe, expect, it } from "vitest";

import { createNamedFlowContract, loadContractLibrary } from "../utils/contractStorage";

describe("contractStorage seeded library support", () => {
  it("merges seeded contracts into a fallback library", () => {
    const fallback = createNamedFlowContract("Starter Contract", [], []);
    const seeded = createNamedFlowContract("Aggressor First", [], [], {
      id: "seed:aggressor-first",
      description: "Seeded contract",
      isSeeded: true,
      updatedAt: new Date(0).toISOString(),
    });

    const library = loadContractLibrary(undefined, fallback, [seeded]);

    expect(library.version).toBe(2);
    expect(library.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Starter Contract", isSeeded: undefined }),
        expect.objectContaining({ id: "seed:aggressor-first", name: "Aggressor First", isSeeded: true }),
      ]),
    );
  });

  it("does not duplicate seeded contracts that already exist in storage", () => {
    const fallback = createNamedFlowContract("Starter Contract", [], []);
    const seeded = createNamedFlowContract("Aggressor First", [], [], {
      id: "seed:aggressor-first",
      description: "Seeded contract",
      isSeeded: true,
      updatedAt: new Date(0).toISOString(),
    });
    const storage = window.localStorage;

    storage.setItem(
      "frontier-flow:contracts",
      JSON.stringify({
        version: 2,
        activeContractName: "Starter Contract",
        contracts: [fallback, seeded],
      }),
    );

    const library = loadContractLibrary(storage, fallback, [seeded]);

    expect(library.contracts.filter((contract) => contract.id === "seed:aggressor-first")).toHaveLength(1);
  });
});