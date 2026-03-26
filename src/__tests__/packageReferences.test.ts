import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
  WORLD_PACKAGE_OVERRIDE_STORAGE_KEY,
  getPackageReferenceBundle,
  getPackageReferenceBundleMap,
  parsePublishedWorldPackageManifest,
  refreshPublishedWorldPackageManifest,
  shouldRefreshPublishedWorldPackageManifest,
} from "../data/packageReferences";

describe("packageReferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("parses stillness and utopia world package ids from Published.toml", () => {
    expect(parsePublishedWorldPackageManifest(`
[published.testnet_stillness]
published-at = "0x111"
original-id = "0x222"

[published.testnet_utopia]
published-at = "0x333"
original-id = "0x444"
`)).toEqual({
  "testnet:stillness": "0x111",
  "testnet:utopia": "0x333",
    });
  });

  it("stores fetched world package ids and applies them to the resolved bundle", async () => {
    const fetchFn: typeof fetch = (input) => {
      const requestedUrl = input instanceof URL ? input.href : typeof input === "string" ? input : input.url;

      expect(requestedUrl).toBe(PUBLISHED_WORLD_PACKAGE_MANIFEST_URL);

      return Promise.resolve(new Response(`
[published.testnet_stillness]
published-at = "0xaaa"
original-id = "0xbbb"

[published.testnet_utopia]
published-at = "0xccc"
original-id = "0xddd"
`, { status: 200, headers: { "content-type": "text/plain" } }));
    };

    await refreshPublishedWorldPackageManifest({ fetchFn, storage: window.localStorage });

    expect(JSON.parse(window.localStorage.getItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY) ?? "{}")).toMatchObject({
      source: PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
      version: 2,
      worldPackageIds: {
        "testnet:stillness": "0xaaa",
        "testnet:utopia": "0xccc",
      },
    });
    expect(getPackageReferenceBundle("testnet:stillness").worldPackageId).toBe("0xaaa");
    expect(getPackageReferenceBundle("testnet:utopia").worldPackageId).toBe("0xccc");
    expect(getPackageReferenceBundle("testnet:stillness").sourceVersionTag).toBe("v0.0.18");
    expect(getPackageReferenceBundle("testnet:utopia").toolchainVersion).toBe("1.68.0");
  });

  it("exposes deploy-grade source metadata for each supported target", () => {
    expect(getPackageReferenceBundle("testnet:stillness")).toMatchObject({
      originalWorldPackageId: "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
      sourceVersionTag: "v0.0.18",
      toolchainVersion: "1.67.1",
    });
    expect(getPackageReferenceBundle("testnet:utopia")).toMatchObject({
      originalWorldPackageId: "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75",
      sourceVersionTag: "v0.0.21",
      toolchainVersion: "1.68.0",
    });
  });

  it("reuses the cached bundle map until stored overrides change", async () => {
    const initialMap = getPackageReferenceBundleMap();

    expect(getPackageReferenceBundleMap()).toBe(initialMap);

    await refreshPublishedWorldPackageManifest({
      fetchFn: () => Promise.resolve(new Response(`
[published.testnet_stillness]
published-at = "0xaaa"
original-id = "0xbbb"

[published.testnet_utopia]
published-at = "0xccc"
original-id = "0xddd"
`, { status: 200, headers: { "content-type": "text/plain" } })),
      storage: window.localStorage,
    });

    const refreshedMap = getPackageReferenceBundleMap();
    expect(refreshedMap).not.toBe(initialMap);
    expect(refreshedMap.get("testnet:stillness")?.worldPackageId).toBe("0xaaa");
  });

  it("skips manifest refresh when overrides were already verified today", () => {
    window.localStorage.setItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY, JSON.stringify({
      version: 2,
      lastVerifiedOn: new Date().toISOString().slice(0, 10),
      source: PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
      worldPackageIds: {
        "testnet:stillness": "0xaaa",
      },
    }));

    expect(shouldRefreshPublishedWorldPackageManifest(window.localStorage)).toBe(false);
  });

  it("forces a manifest refresh when stale version-1 overrides are present", () => {
    window.localStorage.setItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY, JSON.stringify({
      version: 1,
      lastVerifiedOn: new Date().toISOString().slice(0, 10),
      source: PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
      worldPackageIds: {
        "testnet:stillness": "0xbbb",
      },
    }));

    expect(shouldRefreshPublishedWorldPackageManifest(window.localStorage)).toBe(true);
  });
});