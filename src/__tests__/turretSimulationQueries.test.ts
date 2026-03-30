import { describe, expect, it, vi } from "vitest";

import { createJsonResponse } from "../test/turretSimulationMocks";
import { simulationDeploymentState } from "../test/turretSimulationFixtures";
import { fetchSimulationSuggestions } from "../utils/turretSimulationQueries";

describe("turretSimulationQueries", () => {
  it("loads wallet-owned character suggestions and derives the tribe value", async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          address: {
            objects: {
              nodes: [{
                address: "0xprofile",
                contents: {
                  json: {
                    character_id: "0xcafe42",
                  },
                },
              }],
            },
          },
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          object: {
            asMoveObject: {
              contents: {
                json: {
                  key: {
                    item_id: 42,
                    tenant: "utopia",
                  },
                  tribe_id: 7,
                  metadata: {
                    name: "Pilot Prime",
                  },
                },
              },
            },
          },
        },
      }));

    await expect(fetchSimulationSuggestions({
      deploymentState: simulationDeploymentState,
      turretObjectId: "0x111",
      walletAddress: "0x9999",
      ownerCharacterId: null,
      query: "",
      field: "characterId",
      fetchFn,
    })).resolves.toEqual({
      refreshedTurret: null,
      suggestions: [{
        field: "characterId",
        label: "Pilot Prime (42)",
        value: "42",
        description: "Name Pilot Prime · Tenant utopia · Tribe 7",
        derivedFields: {
          characterId: 42,
          characterTribe: 7,
        },
        sourceObjectId: "0xcafe42",
      }],
    });
  });

  it("searches shared character objects by typed name for character id suggestions", async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          objects: {
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
            nodes: [{
              address: "0xcafe42",
              asMoveObject: {
                contents: {
                  json: {
                    key: {
                      item_id: 42,
                    },
                    tribe_id: 7,
                    metadata: {
                      name: "Pilot Prime",
                    },
                  },
                },
              },
            }],
          },
        },
      }));

    await expect(fetchSimulationSuggestions({
      deploymentState: simulationDeploymentState,
      turretObjectId: "0x111",
      walletAddress: "0x9999",
      ownerCharacterId: null,
      query: "pilot",
      field: "characterId",
      fetchFn,
    })).resolves.toEqual({
      refreshedTurret: null,
      suggestions: [{
        field: "characterId",
        label: "Pilot Prime (42)",
        value: "42",
        description: "Name Pilot Prime · Tribe 7",
        derivedFields: {
          characterId: 42,
          characterTribe: 7,
        },
        sourceObjectId: "0xcafe42",
      }],
    });
  });

  it("derives multiple candidate fields from a looked-up object", async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          object: {
            asMoveObject: {
              contents: {
                json: {
                  metadata: { name: "Hostile Frigate" },
                  item_id: "900001",
                  type_id: "900002",
                  group_id: "25",
                  character_id: 99,
                  character_tribe: 12,
                },
              },
            },
          },
        },
      }));

    await expect(fetchSimulationSuggestions({
      deploymentState: simulationDeploymentState,
      turretObjectId: "0x111",
      walletAddress: "0x9999",
      ownerCharacterId: null,
      query: "0xabc123",
      field: "itemId",
      fetchFn,
    })).resolves.toEqual({
      refreshedTurret: null,
      suggestions: [{
        field: "itemId",
        label: "Hostile Frigate",
        value: "900001",
        description: "Type 900002 · Group 25 · Character 99 · Tribe 12",
        derivedFields: {
          itemId: "900001",
          typeId: "900002",
          groupId: "25",
          characterId: 99,
          characterTribe: 12,
        },
        sourceObjectId: "0xabc123",
      }],
    });
  });
});