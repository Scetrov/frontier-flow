import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWorldSource, resetWorldSourceFetcherCacheForTests } from "../deployment/worldSourceFetcher";

describe("worldSourceFetcher", () => {
  beforeEach(() => {
    resetWorldSourceFetcherCacheForTests();
  });

  afterEach(() => {
    resetWorldSourceFetcherCacheForTests();
  });

  it("caches fetched world sources by repository, version tag, and subdirectory", async () => {
    const fetchPackage = vi.fn(() => Promise.resolve({
      "Move.toml": "[package]\nname = \"world\"\n",
    }));

    const first = await fetchWorldSource({
      repositoryUrl: "https://github.com/evefrontier/world-contracts",
      versionTag: "v0.0.18",
      subdirectory: "contracts/world",
    }, {
      fetchPackage,
      now: () => 123,
    });
    const second = await fetchWorldSource({
      repositoryUrl: "https://github.com/evefrontier/world-contracts",
      versionTag: "v0.0.18",
      subdirectory: "contracts/world",
    }, {
      fetchPackage,
      now: () => 456,
    });

    expect(fetchPackage).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first).toEqual({
      files: { "Move.toml": "[package]\nname = \"world\"\n" },
      sourceVersionTag: "v0.0.18",
      fetchedAt: 123,
    });
  });

  it("does not reuse cached world sources across different subdirectories", async () => {
    const fetchPackage = vi.fn((url: string) => Promise.resolve({
      "source-url.txt": url,
    }));

    const first = await fetchWorldSource({
      repositoryUrl: "https://github.com/evefrontier/world-contracts",
      versionTag: "v0.0.18",
      subdirectory: "contracts/world",
    }, {
      fetchPackage,
      now: () => 123,
    });
    const second = await fetchWorldSource({
      repositoryUrl: "https://github.com/evefrontier/world-contracts",
      versionTag: "v0.0.18",
      subdirectory: "contracts/alternate-world",
    }, {
      fetchPackage,
      now: () => 456,
    });

    expect(fetchPackage).toHaveBeenCalledTimes(2);
    expect(first).not.toBe(second);
    expect(second.files["source-url.txt"]).toContain("contracts/alternate-world");
  });

  it("rejects with AbortError when the caller aborts the fetch", async () => {
    const controller = new AbortController();
    const fetchPackage = vi.fn(() => new Promise<Record<string, string>>((resolve) => {
      window.setTimeout(() => {
        resolve({});
      }, 50);
    }));
    const promise = fetchWorldSource({
      repositoryUrl: "https://github.com/evefrontier/world-contracts",
      versionTag: "v0.0.21",
      subdirectory: "contracts/world",
      signal: controller.signal,
    }, {
      fetchPackage,
    });

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("wraps upstream fetch failures with version-tag context", async () => {
    const fetchPackage = vi.fn(() => Promise.reject(new Error("GitHub rate limited the request")));

    await expect(fetchWorldSource({
      repositoryUrl: "https://github.com/evefrontier/world-contracts",
      versionTag: "v0.0.18",
      subdirectory: "contracts/world",
    }, {
      fetchPackage,
    })).rejects.toThrow("Failed to fetch world source for v0.0.18: GitHub rate limited the request");
  });
});