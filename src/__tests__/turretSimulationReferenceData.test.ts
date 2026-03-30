import { describe, expect, it, vi } from "vitest";

import type { SimulationReferenceDataPayload } from "../types/turretSimulation";
import { createJsonResponse } from "../test/turretSimulationMocks";
import { simulationDeploymentState } from "../test/turretSimulationFixtures";
import {
  loadSimulationReferenceData,
  resetSimulationReferenceDataCacheForTests,
} from "../utils/turretSimulationReferenceData";

describe("turretSimulationReferenceData", () => {
  it("loads ship, tribe, and character options from the configured remote sources", async () => {
    resetSimulationReferenceDataCacheForTests();

    const expected: SimulationReferenceDataPayload = {
      characterOptions: [{
        characterId: 42,
        characterTribe: 7,
        description: "Tenant utopia · Tribe 7",
        label: "Pilot Prime (42)",
        sourceObjectId: "0xcafe42",
      }, {
        characterId: 84,
        characterTribe: 9,
        description: "Tenant utopia · Tribe 9",
        label: "Pilot Second (84)",
        sourceObjectId: "0xcafe84",
      }],
      errorMessages: [],
      shipOptions: [{
        description: "Frigate · Group 25",
        groupId: "25",
        label: "USV",
        typeId: "81609",
      }],
      tribeOptions: [{
        description: "SEP",
        label: "Sepharim",
        value: 7,
      }],
    };

    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        data: [{
          id: 81609,
          name: "USV",
          classId: 25,
          className: "Frigate",
        }],
      }))
      .mockResolvedValueOnce(createJsonResponse({
        data: [{
          id: 7,
          name: "Sepharim",
          nameShort: "SEP",
        }],
      }))
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
              }, {
                address: "0xprofile-2",
                contents: {
                  json: {
                    character_id: "0xcafe84",
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
      }))
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          object: {
            asMoveObject: {
              contents: {
                json: {
                  key: {
                    item_id: 84,
                    tenant: "utopia",
                  },
                  tribe_id: 9,
                  metadata: {
                    name: "Pilot Second",
                  },
                },
              },
            },
          },
        },
      }));

    await expect(loadSimulationReferenceData({
      deploymentState: simulationDeploymentState,
      fetchFn,
      walletAddress: "0x1234",
    })).resolves.toEqual(expected);
  });

  it("returns partial data and an error message when one remote source fails", async () => {
    resetSimulationReferenceDataCacheForTests();

    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(createJsonResponse({
        data: [{
          id: 81609,
          name: "USV",
          classId: 25,
          className: "Frigate",
        }],
      }))
      .mockResolvedValueOnce(new Response("boom", { status: 503 }))
      .mockResolvedValueOnce(createJsonResponse({
        data: {
          address: {
            objects: {
              nodes: [],
            },
          },
        },
      }));

    const result = await loadSimulationReferenceData({
      deploymentState: simulationDeploymentState,
      fetchFn,
      walletAddress: "0x1234",
    });

    expect(result.shipOptions).toHaveLength(1);
    expect(result.tribeOptions).toEqual([]);
    expect(result.errorMessages).toEqual(["Could not load tribes from World API. Request failed with status 503"]);
  });
});