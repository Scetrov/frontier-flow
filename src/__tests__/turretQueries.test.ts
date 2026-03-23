import { describe, expect, it, vi } from "vitest";

import type { StoredDeploymentState } from "../types/authorization";
import { fetchTurrets, getTurretGraphQlEndpoint, parseTurretResponse } from "../utils/turretQueries";

const deploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

describe("turretQueries", () => {
  it("returns the published GraphQL endpoint for remote targets", () => {
    expect(getTurretGraphQlEndpoint("local")).toBeNull();
    expect(getTurretGraphQlEndpoint("testnet:stillness")).toBe("https://graphql.testnet.sui.io/graphql");
  });

  it("parses turret payloads and marks the current deployment extension", () => {
    expect(parseTurretResponse({
      address: {
        objects: {
          nodes: [
            {
              address: "0x111",
              contents: {
                json: {
                  metadata: { name: "Perimeter Lancer" },
                  extension: {
                    packageId: "0xfeedface",
                    moduleName: "starter_contract",
                    typeName: "0xfeedface::starter_contract::TurretAuth",
                  },
                },
              },
            },
            {
              address: "0x222",
              contents: {
                json: {
                  metadata: { name: "Outer Bastion" },
                },
              },
            },
          ],
        },
      },
    }, deploymentState)).toEqual([
      {
        objectId: "0x111",
        displayName: "Perimeter Lancer",
        currentExtension: {
          packageId: "0xfeedface",
          moduleName: "starter_contract",
          typeName: "0xfeedface::starter_contract::TurretAuth",
          isCurrentDeployment: true,
        },
      },
      {
        objectId: "0x222",
        displayName: "Outer Bastion",
        currentExtension: null,
      },
    ]);
  });

  it("returns an empty list when the response contains no turrets", () => {
    expect(parseTurretResponse({
      address: {
        objects: {
          nodes: [],
        },
      },
    }, deploymentState)).toEqual([]);
  });

  it("rejects malformed turret responses", () => {
    expect(() => parseTurretResponse({
      address: {
        objects: {
          nodes: [{ address: null }],
        },
      },
    }, deploymentState)).toThrow("GraphQL turret response was malformed.");
  });

  it("surfaces GraphQL errors returned by the endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        errors: [{ message: "Turret lookup denied" }],
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    await expect(fetchTurrets({
      walletAddress: "0x1234",
      deploymentState,
      fetchFn,
    })).rejects.toThrow("Turret lookup denied");
  });

  it("surfaces network failures from the endpoint", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error("socket hang up"));

    await expect(fetchTurrets({
      walletAddress: "0x1234",
      deploymentState,
      fetchFn,
    })).rejects.toThrow("socket hang up");
  });

  it("passes the abort signal through to fetch", async () => {
    const abortController = new AbortController();
    const fetchFn = vi.fn<typeof fetch>().mockImplementation((_, init) => {
      expect(init?.signal).toBe(abortController.signal);

      return Promise.resolve(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));
    });

    await expect(fetchTurrets({
      walletAddress: "0x1234",
      deploymentState,
      fetchFn,
      signal: abortController.signal,
    })).resolves.toEqual([]);
  });
});