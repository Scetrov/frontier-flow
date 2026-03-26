import type { CachedDependencyResolution, FetchWorldSourceResult, PackageReferenceBundle, ResolvedDependencies } from "../compiler/types";

interface ProjectDependencySnapshot {
  readonly sourceVersionTag: string;
  readonly resolvedAt: number;
  readonly resolvedDependencies: ResolvedDependencies;
}

interface DependencySnapshotLoaderDependencies {
  readonly fetchFn?: typeof fetch;
}

const projectDependencySnapshotCache = new Map<string, Promise<ProjectDependencySnapshot | null>>();

function hasResolvedDependenciesShape(value: unknown): value is ResolvedDependencies {
  return typeof value === "object"
    && value !== null
    && typeof (value as ResolvedDependencies).files === "string"
    && typeof (value as ResolvedDependencies).dependencies === "string"
    && typeof (value as ResolvedDependencies).lockfileDependencies === "string";
}

function parseProjectDependencySnapshot(value: unknown): ProjectDependencySnapshot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const snapshot = value as Partial<ProjectDependencySnapshot>;
  if (
    typeof snapshot.sourceVersionTag !== "string"
    || typeof snapshot.resolvedAt !== "number"
    || !hasResolvedDependenciesShape(snapshot.resolvedDependencies)
  ) {
    return null;
  }

  return {
    sourceVersionTag: snapshot.sourceVersionTag,
    resolvedAt: snapshot.resolvedAt,
    resolvedDependencies: snapshot.resolvedDependencies,
  };
}

function createSnapshotUrl(relativePath: string): string {
  const baseUrl = import.meta.env.BASE_URL;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}${relativePath}`;
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

    const parsed = parseProjectDependencySnapshot(await response.json() as unknown);
    if (parsed === null) {
      throw new Error(`Deploy dependency snapshot for ${sourceVersionTag} was invalid.`);
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