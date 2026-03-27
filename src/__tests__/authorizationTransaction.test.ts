import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAuthorizeTurretTransaction,
  fetchOwnerCap,
  getAuthorizationWitnessType,
  isDeploymentAlreadyAuthorized,
} from "../utils/authorizationTransaction";
import type { StoredDeploymentState } from "../types/authorization";

const deploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

describe("authorizationTransaction", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("builds the borrow-authorize-return transaction sequence", () => {
    const transaction = buildAuthorizeTurretTransaction({
      deploymentState,
      characterId: "0x1234",
      ownerCapId: "0x4567",
      turretObjectId: "0x89ab",
    });
    const data = transaction.getData();
    const commands = data.commands.map((command) => command.MoveCall);

    expect(commands).toHaveLength(3);
    expect(commands[0]?.function).toBe("borrow_owner_cap");
    expect(commands[1]?.function).toBe("authorize_extension");
    expect(commands[2]?.function).toBe("return_owner_cap");
    expect(commands[1]?.typeArguments).toEqual(["0xfeedface::starter_contract::TurretAuth"]);
  });

  it("derives the deployed authorization witness type from persisted deployment state", () => {
    expect(getAuthorizationWitnessType(deploymentState)).toBe("0xfeedface::starter_contract::TurretAuth");
    expect(isDeploymentAlreadyAuthorized({
      deploymentState,
      currentExtensionType: "0xfeedface::starter_contract::TurretAuth",
    })).toBe(true);
    expect(isDeploymentAlreadyAuthorized({
      deploymentState,
      currentExtensionType: "0xfeedface::other_module::TurretAuth",
    })).toBe(false);
  });

  it("rejects building an authorization transaction when the turret already uses the deployed extension", () => {
    expect(() => buildAuthorizeTurretTransaction({
      deploymentState,
      characterId: "0x1234",
      currentExtensionType: "0xfeedface::starter_contract::TurretAuth",
      ownerCapId: "0x4567",
      turretObjectId: "0x89ab",
    })).toThrow("The selected turret is already authorized for this deployed extension.");
  });

  it("rejects malformed turret ids before building the transaction", () => {
    expect(() => buildAuthorizeTurretTransaction({
      deploymentState,
      characterId: "0x1234",
      ownerCapId: "0x4567",
      turretObjectId: "not-a-sui-object",
    })).toThrow("Turret id must be a valid Sui object id.");
  });

  it("returns the owner capability matching the selected turret", async () => {
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
                address: "0xabcd",
                contents: {
                  json: {
                    authorized_object_id: "0x1111",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchOwnerCap({
      deploymentState,
      walletAddress: "0x9999",
      turretObjectId: "0x1111",
      fetchFn,
    })).resolves.toBe("0xabcd");

    const ownerCapLookupRequest = fetchFn.mock.calls[1]?.[1];
    expect(typeof ownerCapLookupRequest?.body).toBe("string");
    expect(ownerCapLookupRequest?.body).toContain("first: 50");
    expect(ownerCapLookupRequest?.body).toContain("::access::OwnerCap<");
  });

  it("searches across multiple wallet-owned player profiles for the matching owner capability", async () => {
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
                address: "0xabcd",
                contents: {
                  json: {
                    authorized_object_id: "0x1111",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchOwnerCap({
      deploymentState,
      walletAddress: "0x9999",
      turretObjectId: "0x1111",
      fetchFn,
    })).resolves.toBe("0xabcd");

    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("fails when the owner capability query does not contain the selected turret", async () => {
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
                address: "0xabcd",
                contents: {
                  json: {
                    authorized_object_id: "0x2222",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchOwnerCap({
      deploymentState,
      walletAddress: "0x9999",
      turretObjectId: "0x1111",
      fetchFn,
    })).rejects.toThrow("Could not find ownership capability for this turret.");
  });

  it("uses the original world package id for utopia owner-cap lookups", async () => {
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
                address: "0xabcd",
                contents: {
                  json: {
                    authorized_object_id: "0x1111",
                  },
                },
              }],
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchOwnerCap({
      deploymentState: utopiaDeploymentState,
      walletAddress: "0x9999",
      turretObjectId: "0x1111",
      fetchFn,
    })).resolves.toBe("0xabcd");

    expect(typeof fetchFn.mock.calls[0]?.[1]?.body).toBe("string");
    expect(fetchFn.mock.calls[0]?.[1]?.body).toContain("0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::character::PlayerProfile");
    expect(typeof fetchFn.mock.calls[1]?.[1]?.body).toBe("string");
    expect(fetchFn.mock.calls[1]?.[1]?.body).toContain("0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::access::OwnerCap<0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::turret::Turret>");
  });
});