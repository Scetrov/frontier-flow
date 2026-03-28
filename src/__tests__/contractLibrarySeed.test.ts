import { describe, expect, it } from "vitest";

import { createNamedFlowContract, loadContractLibrary, mergeImportedContract, updateNamedFlowContract } from "../utils/contractStorage";

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

  it("preserves distinct contracts whose generated ids would otherwise collide", () => {
    const fallback = createNamedFlowContract("Starter Contract", [], []);
    const dashed = createNamedFlowContract("Tribe-A", [], []);
    const spaced = createNamedFlowContract("Tribe A", [], []);
    const storage = window.localStorage;

    storage.setItem(
      "frontier-flow:contracts",
      JSON.stringify({
        version: 2,
        activeContractName: "Tribe-A",
        contracts: [dashed, spaced],
      }),
    );

    const library = loadContractLibrary(storage, fallback, []);

    expect(library.contracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Tribe-A" }),
        expect.objectContaining({ name: "Tribe A" }),
      ]),
    );
  });

  it("prefers the stored contract when a seeded example shares the same name", () => {
    const fallback = createNamedFlowContract("Starter Contract", [], []);
    const seeded = createNamedFlowContract("Aggressor First", [], [], {
      id: "seed:aggressor-first",
      description: "Seeded contract",
      isSeeded: true,
      updatedAt: new Date(0).toISOString(),
    });
    const customized = createNamedFlowContract("Aggressor First", [], [], {
      id: "contract:aggressor-first-custom",
      description: "Customized copy",
      updatedAt: new Date(1).toISOString(),
    });
    const storage = window.localStorage;

    storage.setItem(
      "frontier-flow:contracts",
      JSON.stringify({
        version: 2,
        activeContractName: "Aggressor First",
        contracts: [customized],
      }),
    );

    const library = loadContractLibrary(storage, fallback, [seeded]);
    const matchingContracts = library.contracts.filter((contract) => contract.name === "Aggressor First");

    expect(matchingContracts).toHaveLength(1);
    expect(matchingContracts[0]).toEqual(
      expect.objectContaining({
        id: "contract:aggressor-first-custom",
        description: "Customized copy",
        isSeeded: false,
      }),
    );
  });

  it("preserves contract metadata when updating a snapshot", () => {
    const existing = createNamedFlowContract("Aggressor First", [], [], {
      id: "seed:aggressor-first",
      description: "Seeded contract",
      isSeeded: true,
      updatedAt: new Date(0).toISOString(),
    });

    const updated = updateNamedFlowContract(existing, [], [], { preserveUpdatedAt: true });

    expect(updated).toEqual(
      expect.objectContaining({
        id: "seed:aggressor-first",
        name: "Aggressor First",
        description: "Seeded contract",
        isSeeded: true,
        updatedAt: existing.updatedAt,
      }),
    );
  });

  it("parses Walrus provenance from stored contracts", () => {
    const fallback = createNamedFlowContract("Starter Contract", [], []);
    const storage = window.localStorage;

    storage.setItem(
      "frontier-flow:contracts",
      JSON.stringify({
        version: 2,
        activeContractName: "Published Contract",
        contracts: [
          {
            description: "Published snapshot",
            edges: [],
            name: "Published Contract",
            nodes: [],
            updatedAt: "2026-03-23T12:00:00.000Z",
            walrusProvenance: {
              blobId: "blob-123",
              blobObjectId: "0xblob",
              contentType: "application/x.frontier-flow+yaml",
              network: "testnet",
              publishedAt: "2026-03-23T12:00:00.000Z",
            },
          },
        ],
      }),
    );

    const library = loadContractLibrary(storage, fallback, []);

    expect(library.contracts[0].walrusProvenance).toEqual(
      expect.objectContaining({ blobId: "blob-123", blobObjectId: "0xblob" }),
    );
  });

  it("merges imported contracts without overwriting existing names", () => {
    const existing = createNamedFlowContract("Aggressor First", [], []);
    const imported = createNamedFlowContract("Aggressor First", [], [], {
      walrusProvenance: {
        blobId: "blob-123",
        contentType: "application/x.frontier-flow+yaml",
        network: "testnet",
        publishedAt: "2026-03-23T12:00:00.000Z",
      },
    });

    const merged = mergeImportedContract({
      importedContract: imported,
      library: {
        activeContractName: existing.name,
        contracts: [existing],
        version: 2,
      },
    });

    expect(merged.importedContractName).toBe("Aggressor First (2)");
    expect(merged.library.contracts).toHaveLength(2);
    expect(merged.library.contracts[1].walrusProvenance).toEqual(imported.walrusProvenance);
  });
});