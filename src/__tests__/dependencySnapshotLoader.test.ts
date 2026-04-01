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
      userMessage: "Deploy dependency snapshot for v0.0.18 was invalid.",
    });
  });
});