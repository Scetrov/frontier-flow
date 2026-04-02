import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBuildMovePackage = vi.fn();
const mockFetchPackageFromGitHub = vi.fn();
const mockGetSuiMoveVersion = vi.fn();
const mockInitMoveCompiler = vi.fn();
const mockResolveDependencies = vi.fn();

vi.mock("@zktx.io/sui-move-builder/lite", () => ({
  buildMovePackage: mockBuildMovePackage,
  fetchPackageFromGitHub: mockFetchPackageFromGitHub,
  getSuiMoveVersion: mockGetSuiMoveVersion,
  initMoveCompiler: mockInitMoveCompiler,
  resolveDependencies: mockResolveDependencies,
}));

import { loadMoveBuilderLite, resetMoveBuilderLiteForTests } from "../../compiler/moveBuilderLite";

const RAW_SOURCE_URL = "https://raw.githubusercontent.com/MystenLabs/sui/04dd28d5c5d92bff685ddfecb86f8acce18ce6df/crates/sui-framework/packages/sui-framework/sources/token.move";
const LOCAL_MIRROR_URL = "/upstream-sources/MystenLabs/sui/04dd28d5c5d92bff685ddfecb86f8acce18ce6df/crates/sui-framework/packages/sui-framework/sources/token.move";
const UNMIRRORED_RAW_SOURCE_URL = "https://raw.githubusercontent.com/MystenLabs/sui/unmirrored-test-revision/crates/sui-framework/packages/sui-framework/sources/token.move";

function toFetchUrl(input: RequestInfo | URL): string {
  if (input instanceof URL) {
    return input.toString();
  }

  return input instanceof Request ? input.url : input;
}

describe("moveBuilderLite raw GitHub fetch cache", () => {
  beforeEach(() => {
    resetMoveBuilderLiteForTests();
    mockBuildMovePackage.mockReset();
    mockFetchPackageFromGitHub.mockReset();
    mockGetSuiMoveVersion.mockReset();
    mockInitMoveCompiler.mockReset();
    mockResolveDependencies.mockReset();
  });

  it("memoizes repeated raw GitHub source fetches across build requests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("module sui::token {}", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );
    mockBuildMovePackage.mockImplementation(async () => {
      const response = await fetch(RAW_SOURCE_URL);
      await response.text();

      return {
        modules: [],
        dependencies: [],
      };
    });

    try {
      const module = await loadMoveBuilderLite();

      await module.buildMovePackage({ files: {}, silenceWarnings: true, network: "testnet" });
      await module.buildMovePackage({ files: {}, silenceWarnings: true, network: "testnet" });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("prefers the locally mirrored upstream source when the project ships one", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = toFetchUrl(input);
      if (url === LOCAL_MIRROR_URL) {
        return Promise.resolve(new Response("module sui::token {}", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }));
      }

      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    mockBuildMovePackage.mockImplementation(async () => {
      const response = await fetch(RAW_SOURCE_URL);
      await response.text();

      return {
        modules: [],
        dependencies: [],
      };
    });

    try {
      const module = await loadMoveBuilderLite();

      await module.buildMovePackage({ files: {}, silenceWarnings: true, network: "testnet" });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(LOCAL_MIRROR_URL);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("skips the raw GitHub cache shim in headless Bun environments", async () => {
    const originalWindow = globalThis.window;
    const globalObject = globalThis as typeof globalThis & { Bun?: unknown };
    const originalBun = globalObject.Bun;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = toFetchUrl(input);
      if (url === RAW_SOURCE_URL) {
        return Promise.resolve(new Response("module sui::token {}", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }));
      }

      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    mockBuildMovePackage.mockImplementation(async () => {
      const response = await fetch(RAW_SOURCE_URL);
      await response.text();

      return {
        modules: [],
        dependencies: [],
      };
    });

    try {
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, "Bun", {
        value: {},
        configurable: true,
        writable: true,
      });

      const module = await loadMoveBuilderLite();

      await module.buildMovePackage({ files: {}, silenceWarnings: true, network: "testnet" });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(RAW_SOURCE_URL);
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, "Bun", {
        value: originalBun,
        configurable: true,
        writable: true,
      });
      fetchSpy.mockRestore();
    }
  });

  it("backs off repeated raw GitHub rate-limit responses before retrying the network", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T00:00:00Z"));

    let rawFetchAttempts = 0;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = toFetchUrl(input);
      if (url === "/upstream-sources/MystenLabs/sui/unmirrored-test-revision/crates/sui-framework/packages/sui-framework/sources/token.move") {
        return Promise.resolve(new Response("Not Found", { status: 404, statusText: "Not Found" }));
      }

      if (url === UNMIRRORED_RAW_SOURCE_URL) {
        rawFetchAttempts += 1;
        return Promise.resolve(rawFetchAttempts === 1
          ? new Response("Too Many Requests", { status: 429, statusText: "Too Many Requests" })
          : new Response("module sui::token {}", { status: 200, headers: { "content-type": "text/plain" } }));
      }

      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    mockBuildMovePackage.mockImplementation(async () => {
      const response = await fetch(UNMIRRORED_RAW_SOURCE_URL);
      if (!response.ok) {
        throw new Error(`${String(response.status)} ${response.statusText}`);
      }

      await response.text();
      return {
        modules: [],
        dependencies: [],
      };
    });

    try {
      const module = await loadMoveBuilderLite();

      await expect(module.buildMovePackage({ files: {}, silenceWarnings: true, network: "testnet" })).rejects.toThrow("429 Too Many Requests");
      await expect(module.buildMovePackage({ files: {}, silenceWarnings: true, network: "testnet" })).rejects.toThrow("429 Too Many Requests");
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      vi.advanceTimersByTime(30_001);

      await expect(module.buildMovePackage({ files: {}, silenceWarnings: true, network: "testnet" })).resolves.toEqual({
        modules: [],
        dependencies: [],
      });
      expect(fetchSpy).toHaveBeenCalledTimes(5);
    } finally {
      vi.useRealTimers();
      fetchSpy.mockRestore();
    }
  });
});