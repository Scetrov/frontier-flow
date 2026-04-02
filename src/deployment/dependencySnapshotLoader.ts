import { DependencyResolutionError } from "../compiler/types";
import type { BundledDependencySnapshot, CachedDependencyResolution, FetchWorldSourceResult, PackageReferenceBundle } from "../compiler/types";
import { createSnapshotValidationResult, parseBundledDependencySnapshot } from "./dependencySnapshotValidation";

interface DependencySnapshotLoaderDependencies {
  readonly fetchFn?: typeof fetch;
}

const projectDependencySnapshotCache = new Map<string, Promise<ProjectDependencySnapshot | null>>();
type ProjectDependencySnapshot = BundledDependencySnapshot;

function createSnapshotUrl(relativePath: string): string {
  const baseUrl = import.meta.env.BASE_URL;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}${relativePath}`;
}

function createInvalidSnapshotError(message: string): DependencyResolutionError {
  return new DependencyResolutionError(message, {
    code: "bundled-snapshot-invalid",
    userMessage: message,
    suggestedAction: "Regenerate the bundled dependency snapshots or allow the runtime to fall back to upstream dependency resolution.",
  });
}

async function loadProjectDependencySnapshot(
  sourceVersionTag: string,
  dependencies: DependencySnapshotLoaderDependencies = {},
): Promise<ProjectDependencySnapshot | null> {
  const cachedSnapshot = projectDependencySnapshotCache.get(sourceVersionTag);
  if (cachedSnapshot !== undefined) {
    return await cachedSnapshot;
  }

  const relativePath = `deploy-grade-resolution-snapshots/${sourceVersionTag}.json`;

  const loadPromise = (async () => {
    const fetchFn = dependencies.fetchFn ?? globalThis.fetch;
    if (typeof fetchFn !== "function") {
      return null;
    }

    const response = await fetchFn(createSnapshotUrl(relativePath));
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to load deploy dependency snapshot for ${sourceVersionTag}: ${String(response.status)} ${response.statusText}`.trim());
    }

    const parsed = parseBundledDependencySnapshot(await response.json() as unknown);
    if (parsed === null) {
      const message = `Deploy dependency snapshot for ${sourceVersionTag} was invalid.`;
      throw createInvalidSnapshotError(message);
    }

    if (parsed.sourceVersionTag !== sourceVersionTag) {
      const message = `Deploy dependency snapshot for ${sourceVersionTag} had mismatched sourceVersionTag (${parsed.sourceVersionTag}).`;
      throw createInvalidSnapshotError(message);
    }

    const validation = createSnapshotValidationResult(parsed.resolvedDependencies);
    if (!validation.isValid) {
      throw createInvalidSnapshotError(validation.message);
    }

    return parsed;
  })();

  projectDependencySnapshotCache.set(sourceVersionTag, loadPromise);

  try {
    return await loadPromise;
  } catch (error) {
    projectDependencySnapshotCache.delete(sourceVersionTag);
    throw error;
  }
}

/**
 * Reset the project dependency snapshot cache for tests.
 */
export function resetProjectDependencySnapshotCacheForTests(): void {
  projectDependencySnapshotCache.clear();
}

/**
 * Load a bundled dependency-resolution snapshot when the project ships one for the target version.
 */
export async function getProjectCachedDependencyResolution(
  references: PackageReferenceBundle,
  dependencies: DependencySnapshotLoaderDependencies = {},
): Promise<CachedDependencyResolution | null> {
  const snapshot = await loadProjectDependencySnapshot(references.sourceVersionTag, dependencies);
  if (snapshot === null) {
    return null;
  }

  return {
    targetId: references.targetId,
    sourceVersionTag: snapshot.sourceVersionTag,
    resolvedDependencies: snapshot.resolvedDependencies,
    resolvedAt: snapshot.resolvedAt,
  };
}

/**
 * Create the minimal world-source shape required by deploy-grade compilation when a bundled snapshot is used.
 */
export function createWorldSourceFromCachedResolution(cachedResolution: CachedDependencyResolution): FetchWorldSourceResult {
  return {
    files: {},
    sourceVersionTag: cachedResolution.sourceVersionTag,
    fetchedAt: cachedResolution.resolvedAt,
  };
}