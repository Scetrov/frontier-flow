import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    window.localStorage.clear();
  });

  function createTurretFetchFn() {
    return vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                contents: {
                  json: {
                    character_id: "0x1234",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                address: "0xownercap",
                contents: {
                  json: {
                    authorized_object_id: "0x111",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          object: {
            asMoveObject: {
              contents: {
                json: {
                  metadata: { name: "Perimeter Lancer" },
                },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));
  }

  it("returns the published GraphQL endpoint for remote targets", () => {
    expect(getTurretGraphQlEndpoint("local")).toBeNull();
    expect(getTurretGraphQlEndpoint("testnet:stillness")).toBe("https://graphql.testnet.sui.io/graphql");
    expect(getTurretGraphQlEndpoint("testnet:utopia")).toBe("https://graphql.testnet.sui.io/graphql");
  });

  it("loads turrets via the active character ownership path", async () => {
    const utopiaDeploymentState: StoredDeploymentState = {
      ...deploymentState,
      targetId: "testnet:utopia",
    };
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                contents: {
                  json: {
                    character_id: "0x1234",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                address: "0xownercap",
                contents: {
                  json: {
                    authorized_object_id: "0x111",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          object: {
            asMoveObject: {
              contents: {
                json: {
                  metadata: { name: "Utopia Bastion" },
                  extension: {
                    packageId: "0xfeedface",
                    moduleName: "starter_contract",
                    typeName: "0xfeedface::starter_contract::TurretAuth",
                  },
                },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchTurrets({
      walletAddress: "0x9999",
      deploymentState: utopiaDeploymentState,
      fetchFn,
    })).resolves.toEqual([
      {
        objectId: "0x111",
        displayName: "Utopia Bastion",
        currentExtension: {
          packageId: "0xfeedface",
          moduleName: "starter_contract",
          typeName: "0xfeedface::starter_contract::TurretAuth",
          isCurrentDeployment: true,
        },
      },
    ]);

    const turretLookupRequest = fetchFn.mock.calls[1]?.[1];
    expect(typeof turretLookupRequest?.body).toBe("string");
    expect(turretLookupRequest?.body).toContain("first: 50");
    expect(turretLookupRequest?.body).toContain("::access::OwnerCap<");
  });

  it("loads turrets across multiple wallet-owned player profiles", async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                contents: {
                  json: {
                    character_id: "0x1234",
                  },
                },
              }, {
                contents: {
                  json: {
                    character_id: "0x5678",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                address: "0xownercap",
                contents: {
                  json: {
                    authorized_object_id: "0x111",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          object: {
            asMoveObject: {
              contents: {
                json: {
                  metadata: { name: "Pilot Bastion" },
                },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchTurrets({
      walletAddress: "0x9999",
      deploymentState,
      fetchFn,
    })).resolves.toEqual([
      {
        objectId: "0x111",
        displayName: "Pilot Bastion",
        currentExtension: null,
      },
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it("uses the original world package id for utopia turret lookups", async () => {
    const utopiaDeploymentState: StoredDeploymentState = {
      ...deploymentState,
      targetId: "testnet:utopia",
    };
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                contents: {
                  json: {
                    character_id: "0x1234",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                address: "0xownercap",
                contents: {
                  json: {
                    authorized_object_id: "0x111",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          object: {
            asMoveObject: {
              contents: {
                json: {
                  metadata: { name: "Utopia Bastion" },
                },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchTurrets({
      walletAddress: "0x9999",
      deploymentState: utopiaDeploymentState,
      fetchFn,
    })).resolves.toEqual([
      {
        objectId: "0x111",
        displayName: "Utopia Bastion",
        currentExtension: null,
      },
    ]);

    expect(typeof fetchFn.mock.calls[0]?.[1]?.body).toBe("string");
    expect(fetchFn.mock.calls[0]?.[1]?.body).toContain("0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::character::PlayerProfile");
    expect(typeof fetchFn.mock.calls[1]?.[1]?.body).toBe("string");
    expect(fetchFn.mock.calls[1]?.[1]?.body).toContain("0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::access::OwnerCap<0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::turret::Turret>");
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

  it("only overlays mock authorization state when the mock environment is enabled", async () => {
    window.history.replaceState({}, "", "/");

    window.localStorage.setItem("frontier-flow:mock-authorizations", JSON.stringify({
      deployments: {
        "testnet:stillness:0xfeedface:starter_contract": ["0x111"],
      },
    }));

    await expect(fetchTurrets({
      walletAddress: "0x9999",
      deploymentState,
      fetchFn: createTurretFetchFn(),
    })).resolves.toEqual([
      {
        objectId: "0x111",
        displayName: "Perimeter Lancer",
        currentExtension: null,
      },
    ]);

    window.history.replaceState({}, "", "/?ff_mock_authorize_delay_ms=1");

    await expect(fetchTurrets({
      walletAddress: "0x9999",
      deploymentState,
      fetchFn: createTurretFetchFn(),
    })).resolves.toEqual([
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
    ]);
  });
});