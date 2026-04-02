import { beforeEach, describe, expect, it, vi } from "vitest";
import { DependencyResolutionError } from "../compiler/types";
import { getProjectCachedDependencyResolution, resetProjectDependencySnapshotCacheForTests } from "../deployment/dependencySnapshotLoader";
import { createPackageReferenceBundle } from "./compiler/helpers";

function createFetchResponse(input: {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText?: string;
  readonly jsonValue: unknown;
}): Response {
  return {
    ok: input.ok,
    status: input.status,
    statusText: input.statusText ?? "OK",
    json: vi.fn(() => Promise.resolve(input.jsonValue)),
  } as unknown as Response;
}

describe("dependencySnapshotLoader", () => {
  beforeEach(() => {
    resetProjectDependencySnapshotCacheForTests();
  });

  it("throws a cache-invalid dependency resolution error for malformed bundled snapshots", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(createFetchResponse({
      ok: true,
      status: 200,
      jsonValue: { invalid: true },
    })));

    await expect(getProjectCachedDependencyResolution(createPackageReferenceBundle(), {
      fetchFn,
    })).rejects.toMatchObject({
      name: DependencyResolutionError.name,
      code: "bundled-snapshot-invalid",
      userMessage: "Deploy dependency snapshot for v0.0.23 was invalid.",
    });
  });

  it("throws a cache-invalid dependency resolution error when the bundled snapshot tag mismatches the requested version", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(createFetchResponse({
      ok: true,
      status: 200,
      jsonValue: {
        targetId: "testnet:stillness",
        sourceVersionTag: "v0.0.21",
        resolvedAt: 123,
        resolvedDependencies: {
          files: "{}",
          dependencies: "{}",
          lockfileDependencies: "{}",
        },
      },
    })));

    await expect(getProjectCachedDependencyResolution(createPackageReferenceBundle(), {
      fetchFn,
    })).rejects.toMatchObject({
      name: DependencyResolutionError.name,
      code: "bundled-snapshot-invalid",
      userMessage: "Deploy dependency snapshot for v0.0.23 had mismatched sourceVersionTag (v0.0.21).",
    });
  });
});