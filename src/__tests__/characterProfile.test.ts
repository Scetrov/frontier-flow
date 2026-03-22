import { describe, expect, it, vi } from "vitest";

import {
  extractCharacterIdFromProfileContent,
  extractCharacterNameFromCharacterContent,
  fetchCharacterNameForWalletAcrossTargets,
  fetchCharacterNameForWallet,
  getCharacterProfileGraphQlEndpoint,
} from "../utils/characterProfile";

describe("characterProfile", () => {
  it("returns the published GraphQL endpoint for remote targets", () => {
    expect(getCharacterProfileGraphQlEndpoint("local")).toBeNull();
    expect(getCharacterProfileGraphQlEndpoint("testnet:stillness")).toBe("https://graphql.testnet.sui.io/graphql");
  });

  it("extracts a character id from PlayerProfile content", () => {
    expect(extractCharacterIdFromProfileContent({ character_id: "0xabc123" })).toBe("0xabc123");
    expect(extractCharacterIdFromProfileContent({ fields: { characterId: "0xdef456" } })).toBe("0xdef456");
    expect(extractCharacterIdFromProfileContent({ character_id: "not-an-address" })).toBeNull();
  });

  it("extracts a character name from nested metadata content", () => {
    expect(extractCharacterNameFromCharacterContent({ metadata: { name: "Pilot Prime" } })).toBe("Pilot Prime");
    expect(extractCharacterNameFromCharacterContent({ metadata: { fields: { name: "Pilot Prime" } } })).toBe("Pilot Prime");
    expect(extractCharacterNameFromCharacterContent({ metadata: { fields: { vec: [{ name: "Pilot Prime" }] } } })).toBe("Pilot Prime");
    expect(extractCharacterNameFromCharacterContent({ metadata: null })).toBeNull();
  });

  it("fetches the PlayerProfile and Character object name over GraphQL", async () => {
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: {
          address: {
            objects: {
              nodes: [{
                contents: {
                  json: { character_id: "0xabc123" },
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
                  metadata: {
                    fields: {
                      vec: [{ name: "Pilot Prime" }],
                    },
                  },
                },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchCharacterNameForWallet({
      walletAddress: "0x123456",
      targetId: "testnet:stillness",
      fetchFn,
    })).resolves.toBe("Pilot Prime");

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("falls back across published targets when the preferred target has no profile", async () => {
    const fetchFn = vi.fn<typeof fetch>()
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
                contents: {
                  json: { character_id: "0xabc123" },
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
                  metadata: {
                    name: "Pilot Prime",
                  },
                },
              },
            },
          },
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));

    await expect(fetchCharacterNameForWalletAcrossTargets({
      walletAddress: "0x123456",
      preferredTargetId: "testnet:stillness",
      fetchFn,
    })).resolves.toBe("Pilot Prime");

    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});