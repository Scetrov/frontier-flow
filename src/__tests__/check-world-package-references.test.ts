import { describe, expect, it, vi } from "vitest";
import { resolve as resolvePath } from "node:path";

import { runValidation, type FetchClient } from "../../scripts/check-world-package-references";

const REPO_ROOT = resolvePath(import.meta.dirname, "..", "..");

function createManifestResponse(content: string): Response {
  return new Response(content, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

const COHERENT_MANIFEST = `
[published.testnet_stillness]
published-at = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
original-id = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1"
toolchain-version = "1.74.0"

[published.testnet_utopia]
published-at = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1"
original-id = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75"
toolchain-version = "1.68.0"
`;

/**
 * Track GraphQL queries to return appropriate responses per object.
 */
function createGraphQLHandler(): (body: string) => Response {
  const objectTypes: Record<string, string> = {
    // Stillness objects
    "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1":
      "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1::world::World",
    "0xf6aed9361acc0d7021672b653ebe9dae45d88e11fecef01cc5434c8f60ae764f":
      "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1::object_registry::ObjectRegistry",
    "0xdb5f40fd5659e4f21d6b07ed3cedcd532a21a6054815a7b3fe3817631ed6dbd2":
      "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1::access::ServerAddressRegistry",
    // Utopia objects
    "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1":
      "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::world::World",
    "0xc2b969a72046c47e24991d69472afb2216af9e91caf802684514f39706d7dc57":
      "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::object_registry::ObjectRegistry",
    "0x9a9f2f7d1b8cf100feb532223aa6c38451edb05406323af5054f9d974555708b":
      "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::access::ServerAddressRegistry",
  };

  const packageIds = new Set([
    "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
    "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1",
  ]);
  const publicationTransactions: Record<string, { originalPackageId: string; registries: readonly [string, string][] }> = {
    "5rnk369zjxUZdo9Tovv8moGymDGAUnRUhhUutFH119nv": {
      originalPackageId: "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
      registries: [
        ["0xf6aed9361acc0d7021672b653ebe9dae45d88e11fecef01cc5434c8f60ae764f", objectTypes["0xf6aed9361acc0d7021672b653ebe9dae45d88e11fecef01cc5434c8f60ae764f"]],
        ["0xdb5f40fd5659e4f21d6b07ed3cedcd532a21a6054815a7b3fe3817631ed6dbd2", objectTypes["0xdb5f40fd5659e4f21d6b07ed3cedcd532a21a6054815a7b3fe3817631ed6dbd2"]],
      ],
    },
    "AzBhmMFd9UTbr4m4hnSjSbBLkmVW3VESUDG15DGnCT8": {
      originalPackageId: "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75",
      registries: [
        ["0xc2b969a72046c47e24991d69472afb2216af9e91caf802684514f39706d7dc57", objectTypes["0xc2b969a72046c47e24991d69472afb2216af9e91caf802684514f39706d7dc57"]],
        ["0x9a9f2f7d1b8cf100feb532223aa6c38451edb05406323af5054f9d974555708b", objectTypes["0x9a9f2f7d1b8cf100feb532223aa6c38451edb05406323af5054f9d974555708b"]],
      ],
    },
  };

  return (body: string) => {
    const parsed = JSON.parse(body) as { query?: string; variables?: Record<string, unknown> };
    const objectId = parsed.variables?.id as string | undefined;
    const digest = parsed.variables?.digest as string | undefined;

    if (digest !== undefined && digest in publicationTransactions) {
      const publication = publicationTransactions[digest];
      return new Response(JSON.stringify({
        data: {
          transaction: {
            digest,
            effects: {
              objectChanges: {
                nodes: [
                  { address: publication.originalPackageId, idCreated: true, outputState: { asMovePackage: { address: publication.originalPackageId }, asMoveObject: null } },
                  ...publication.registries.map(([address, type]) => ({ address, idCreated: true, outputState: { asMovePackage: null, asMoveObject: { contents: { type: { repr: type } } } } })),
                ],
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    if (objectId !== undefined && objectId in objectTypes) {
      return new Response(JSON.stringify({
        data: {
          object: {
            address: objectId,
            asMovePackage: packageIds.has(objectId) ? { address: objectId } : null,
            asMoveObject: {
              contents: {
                type: { repr: objectTypes[objectId] },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }

    return new Response(JSON.stringify({ data: { object: null } }), { status: 200, headers: { "content-type": "application/json" } });
  };
}

function createCoherentFetchClient(): FetchClient {
  const graphqlHandler = createGraphQLHandler();

  return {
    fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      // Current manifest (main branch)
      if (url.includes("/main/contracts/world/Published.toml")) {
        return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
      }

      // Tag-specific manifests
      if (url.includes("/v0.0.24/contracts/world/Published.toml")) {
        return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
      }
      if (url.includes("/v0.0.21/contracts/world/Published.toml")) {
        return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
      }

      // GraphQL
      if (url === "https://graphql.testnet.sui.io/graphql") {
        const body = typeof init?.body === "string" ? init.body : "";
        return Promise.resolve(graphqlHandler(body));
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }),
  };
}

describe("check-world-package-references", () => {
  describe("coherent targets (all layers agree)", () => {
    it("passes all checks when manifest, tags, cache, and on-chain data agree", async () => {
      const client = createCoherentFetchClient();
      const output = await runValidation({ client, repoRoot: REPO_ROOT });

      expect(output.allPassed).toBe(true);
      expect(output.targetSummaries.every((t) => t.passed)).toBe(true);

      for (const summary of output.targetSummaries) {
        expect(summary.resolvedUpstreamRevision).toBeDefined();
      }
    });
  });

  describe("manifest drift", () => {
    it("fails when current manifest has different published-at", async () => {
      const graphqlHandler = createGraphQLHandler();
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml")) {
            const drifted = COHERENT_MANIFEST.replace(
              "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
              "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            );
            return Promise.resolve(createManifestResponse(drifted));
          }

          if (url.includes("/v0.0.24/contracts/world/Published.toml") || url.includes("/v0.0.21/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }
          if (url.includes("graphql.testnet.sui.io")) {
            const body = typeof init?.body === "string" ? init.body : "";
            return Promise.resolve(graphqlHandler(body));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      const manifestResult = output.results.find(
        (r) => r.layer === "current-manifest" && r.targetId === "testnet:stillness" && !r.passed,
      );
      expect(manifestResult).toBeDefined();
      expect(manifestResult?.message).toContain("drifted");
    });
  });

  describe("source drift", () => {
    it("fails when pinned source tag has different identity", async () => {
      const graphqlHandler = createGraphQLHandler();
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }

          // Source tag returns different published-at for Stillness
          if (url.includes("/v0.0.24/contracts/world/Published.toml")) {
            const drifted = COHERENT_MANIFEST.replace(
              "published-at = \"0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1\"",
              "published-at = \"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef\"",
            );
            return Promise.resolve(createManifestResponse(drifted));
          }

          if (url.includes("/v0.0.21/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }

          if (url.includes("graphql.testnet.sui.io")) {
            const body = typeof init?.body === "string" ? init.body : "";
            return Promise.resolve(graphqlHandler(body));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      const sourceResult = output.results.find(
        (r) => r.layer === "source-tag" && r.targetId === "testnet:stillness" && !r.passed,
      );
      expect(sourceResult).toBeDefined();
      expect(sourceResult?.message).toContain("identity mismatch");
    });
  });

  describe("cache drift", () => {
    it("verifies cache layer runs for each target", async () => {
      const client = createCoherentFetchClient();
      const output = await runValidation({ client, repoRoot: REPO_ROOT });

      const cacheResults = output.results.filter((r) => r.layer === "deploy-cache");
      expect(cacheResults.length).toBe(2);
      expect(cacheResults.every((r) => r.passed)).toBe(true);
    });
  });

  describe("mixed-lineage registries", () => {
    it("fails when registry type is not rooted at originalWorldPackageId", async () => {
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request, init?: RequestInit) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }
          if (url.includes("/v0.0.24/contracts/world/Published.toml") || url.includes("/v0.0.21/contracts/world/Published.toml")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }

          if (url.includes("graphql.testnet.sui.io")) {
            const body = typeof init?.body === "string" ? JSON.parse(init.body) as { variables?: { id?: string } } : {};
            const objectId = body.variables?.id ?? "0x0";
            return Promise.resolve(new Response(JSON.stringify({
              data: {
                object: {
                  address: objectId,
                  asMovePackage: { address: objectId },
                  asMoveObject: {
                    contents: {
                      type: {
                        repr: "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75::object_registry::ObjectRegistry",
                      },
                    },
                  },
                },
              },
            }), { status: 200, headers: { "content-type": "application/json" } }));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });

      // Stillness should fail because the registry type is rooted at Utopia's original ID
      const stillnessOnChain = output.results.find(
        (r) => r.targetId === "testnet:stillness" && r.layer === "on-chain" && !r.passed,
      );
      expect(stillnessOnChain).toBeDefined();
      expect(stillnessOnChain?.message).toContain("did not equal expected");
    });
  });

  describe("malformed responses", () => {
    it("fails when GraphQL returns null data", async () => {
      const client: FetchClient = {
        fetch: vi.fn((input: string | URL | Request) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

          if (url.includes("/main/contracts/world/Published.toml") || url.includes("/v0.0.24/") || url.includes("/v0.0.21/")) {
            return Promise.resolve(createManifestResponse(COHERENT_MANIFEST));
          }
          if (url.includes("graphql.testnet.sui.io")) {
            return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 200 }));
          }

          return Promise.reject(new Error(`Unexpected URL: ${url}`));
        }),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      const onChainFails = output.results.filter(
        (r) => r.layer === "on-chain" && !r.passed,
      );
      expect(onChainFails.length).toBeGreaterThan(0);
    });
  });

  describe("exhausted endpoint retries", () => {
    it("fails with unreachable diagnostics when all retries fail", async () => {
      const client: FetchClient = {
        fetch: vi.fn(() => Promise.reject(new Error("Network error"))),
      };

      const output = await runValidation({ client, repoRoot: REPO_ROOT });
      expect(output.allPassed).toBe(false);

      // All layers should have reported unreachable/network errors
      const unreachableResults = output.results.filter(
        (r) => !r.passed && (r.message.includes("Unreachable") || r.message.includes("Network error") || r.message.includes("Exhausted") || r.message.includes("Failed to")),
      );
      expect(unreachableResults.length).toBeGreaterThan(0);
    }, 30_000);
  });
});
