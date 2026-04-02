import type {
  BundledDependencySnapshot,
  ResolvedDependencies,
  ResolvedDependencyPackageSnapshot,
  SnapshotValidationResult,
} from "../compiler/types";

const REQUIRED_REMOTE_DEPENDENCY_PACKAGES = ["MoveStdlib", "Sui", "World"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

export function normalizeDependencyPackageName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function hasResolvedDependenciesShape(value: unknown): value is ResolvedDependencies {
  return typeof value === "object"
    && value !== null
    && typeof (value as ResolvedDependencies).files === "string"
    && typeof (value as ResolvedDependencies).dependencies === "string"
    && typeof (value as ResolvedDependencies).lockfileDependencies === "string";
}

export function parseResolvedDependencyPackages(
  resolvedDependencies: ResolvedDependencies,
): readonly ResolvedDependencyPackageSnapshot[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(resolvedDependencies.dependencies) as unknown;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const packages: ResolvedDependencyPackageSnapshot[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) {
      return null;
    }

    const name = entry.name;
    const files = entry.files;

    if (name !== undefined && typeof name !== "string") {
      return null;
    }

    if (files !== undefined && !isStringRecord(files)) {
      return null;
    }

    packages.push({
      name,
      files,
    });
  }

  return packages;
}

export function parseBundledDependencySnapshot(value: unknown): BundledDependencySnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.sourceVersionTag !== "string"
    || typeof value.resolvedAt !== "number"
    || !hasResolvedDependenciesShape(value.resolvedDependencies)
  ) {
    return null;
  }

  return {
    sourceVersionTag: value.sourceVersionTag,
    resolvedAt: value.resolvedAt,
    resolvedDependencies: value.resolvedDependencies,
  };
}

function buildPackagesByName(
  dependencyPackages: readonly ResolvedDependencyPackageSnapshot[],
): ReadonlyMap<string, readonly ResolvedDependencyPackageSnapshot[]> {
  const packagesByName = new Map<string, readonly ResolvedDependencyPackageSnapshot[]>();

  for (const dependencyPackage of dependencyPackages) {
    const normalizedName = normalizeDependencyPackageName(dependencyPackage.name ?? "");
    if (normalizedName.length === 0) {
      continue;
    }

    const existing = packagesByName.get(normalizedName) ?? [];
    packagesByName.set(normalizedName, [...existing, dependencyPackage]);
  }

  return packagesByName;
}

function classifyRequiredPackages(
  packagesByName: ReadonlyMap<string, readonly ResolvedDependencyPackageSnapshot[]>,
  requiredPackages: readonly string[],
): { readonly missingPackages: readonly string[]; readonly emptyPackageNames: readonly string[] } {
  const missingPackages: string[] = [];
  const emptyPackageNames: string[] = [];

  for (const requiredPackage of requiredPackages) {
    const matchingPackages = packagesByName.get(normalizeDependencyPackageName(requiredPackage));
    if (matchingPackages === undefined || matchingPackages.length === 0) {
      missingPackages.push(requiredPackage);
      continue;
    }

    const hasFiles = matchingPackages.some((matchingPackage) => Object.keys(matchingPackage.files ?? {}).length > 0);
    if (!hasFiles) {
      emptyPackageNames.push(requiredPackage);
    }
  }

  return {
    missingPackages,
    emptyPackageNames,
  };
}

function buildSnapshotValidationMessage(
  missingPackages: readonly string[],
  emptyPackageNames: readonly string[],
): string {
  const issues: string[] = [];
  if (missingPackages.length > 0) {
    issues.push(`missing package payloads for ${missingPackages.join(", ")}`);
  }
  if (emptyPackageNames.length > 0) {
    issues.push(`empty file payloads for ${emptyPackageNames.join(", ")}`);
  }

  return issues.length === 0
    ? "Bundled dependency snapshot includes the required package payloads."
    : `Bundled dependency snapshot is invalid: ${issues.join("; ")}.`;
}

export function createSnapshotValidationResult(
  resolvedDependencies: ResolvedDependencies,
  requiredPackages: readonly string[] = REQUIRED_REMOTE_DEPENDENCY_PACKAGES,
): SnapshotValidationResult {
  const dependencyPackages = parseResolvedDependencyPackages(resolvedDependencies);
  if (dependencyPackages === null) {
    return {
      isValid: false,
      missingPackages: [...requiredPackages],
      emptyPackageNames: [],
      fallbackAllowed: true,
      message: "Bundled dependency snapshot could not be parsed.",
    };
  }

  const packagesByName = buildPackagesByName(dependencyPackages);
  const { missingPackages, emptyPackageNames } = classifyRequiredPackages(packagesByName, requiredPackages);
  const message = buildSnapshotValidationMessage(missingPackages, emptyPackageNames);

  return {
    isValid: missingPackages.length === 0 && emptyPackageNames.length === 0,
    missingPackages,
    emptyPackageNames,
    fallbackAllowed: true,
    message,
  };
}

function sortStringRecord(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function stableSortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSortJsonValue(entry));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, stableSortJsonValue(nestedValue)]),
  );
}

function canonicalizeJsonString(value: string): string {
  try {
    return JSON.stringify(stableSortJsonValue(JSON.parse(value) as unknown));
  } catch {
    return value;
  }
}

export function canonicalizeResolvedDependencies(resolvedDependencies: ResolvedDependencies): ResolvedDependencies {
  const dependencyPackages = parseResolvedDependencyPackages(resolvedDependencies);
  const canonicalDependencies = dependencyPackages === null
    ? resolvedDependencies.dependencies
    : JSON.stringify(
      dependencyPackages
        .map((dependencyPackage) => ({
          ...dependencyPackage,
          files: dependencyPackage.files === undefined ? undefined : sortStringRecord({ ...dependencyPackage.files }),
        }))
        .sort((left, right) => normalizeDependencyPackageName(left.name ?? "").localeCompare(normalizeDependencyPackageName(right.name ?? ""))),
    );

  return {
    files: canonicalizeJsonString(resolvedDependencies.files),
    dependencies: canonicalDependencies,
    lockfileDependencies: canonicalizeJsonString(resolvedDependencies.lockfileDependencies),
  };
}