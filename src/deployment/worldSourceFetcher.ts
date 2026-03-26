import { fetchPackageFromGitHub } from "@zktx.io/sui-move-builder/lite";
import type { FetchWorldSourceRequest, FetchWorldSourceResult } from "../compiler/types";

export const WORLD_CONTRACTS_REPOSITORY_URL = "https://github.com/evefrontier/world-contracts";

interface WorldSourceFetcherDependencies {
  readonly fetchPackage?: typeof fetchPackageFromGitHub;
  readonly now?: () => number;
}

const worldSourceCache = new Map<string, FetchWorldSourceResult>();

function normalizeRepositoryUrl(repositoryUrl: string): string {
  return repositoryUrl.endsWith("/") ? repositoryUrl.slice(0, -1) : repositoryUrl;
}

function normalizeSubdirectory(subdirectory: string): string {
  return subdirectory.replace(/^\/+|\/+$/g, "");
}

function createPackageUrl(request: FetchWorldSourceRequest): string {
  return `${normalizeRepositoryUrl(request.repositoryUrl)}/tree/${request.versionTag}/${normalizeSubdirectory(request.subdirectory)}`;
}

function createAbortError(versionTag: string): Error {
  const error = new Error(`Fetching world source for ${versionTag} was aborted.`);
  error.name = "AbortError";
  return error;
}

async function withAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined, versionTag: string): Promise<T> {
  if (signal === undefined) {
    return promise;
  }

  if (signal.aborted) {
    throw createAbortError(versionTag);
  }

  return await new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      signal.removeEventListener("abort", handleAbort);
      reject(createAbortError(versionTag));
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then((value) => {
      signal.removeEventListener("abort", handleAbort);
      resolve(value);
    }, (error: unknown) => {
      signal.removeEventListener("abort", handleAbort);
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

/**
 * Reset the session-scoped world source cache for tests.
 */
export function resetWorldSourceFetcherCacheForTests(): void {
  worldSourceCache.clear();
}

/**
 * Fetch the upstream world package source tree for a pinned version tag.
 */
export async function fetchWorldSource(
  request: FetchWorldSourceRequest,
  dependencies: WorldSourceFetcherDependencies = {},
): Promise<FetchWorldSourceResult> {
  const cachedResult = worldSourceCache.get(request.versionTag);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const fetchPackage = dependencies.fetchPackage ?? fetchPackageFromGitHub;

  try {
    const files = await withAbort(fetchPackage(createPackageUrl(request)), request.signal, request.versionTag);
    const result: FetchWorldSourceResult = {
      files,
      sourceVersionTag: request.versionTag,
      fetchedAt: dependencies.now?.() ?? Date.now(),
    };

    worldSourceCache.set(request.versionTag, result);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch world source for ${request.versionTag}: ${detail}`, { cause: error });
  }
}