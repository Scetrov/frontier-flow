import type { StoredDeploymentState } from "../types/authorization";

export const SHARED_EXTENSION_STORAGE_KEY = "frontier-flow:shared-extensions";

/**
 * Extensions published by somebody else that this wallet wants to authorize.
 * Authorization only needs `<packageId>::<moduleName>::TurretAuth` as a type
 * argument, so a turret owner never has to republish a shared contract.
 */
export interface SharedExtension extends Omit<StoredDeploymentState, "targetId"> {
  /** Shared extensions are only meaningful on published remote targets. */
  readonly targetId: Exclude<StoredDeploymentState["targetId"], "local">;
}

function isPackageId(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function isModuleName(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function isSharedTargetId(value: unknown): value is SharedExtension["targetId"] {
  return value === "testnet:stillness" || value === "testnet:utopia";
}

function parseSharedExtension(value: unknown): SharedExtension | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!isPackageId(candidate.packageId) || !isModuleName(candidate.moduleName) || !isSharedTargetId(candidate.targetId)) {
    return null;
  }

  return {
    version: 1,
    packageId: candidate.packageId,
    moduleName: candidate.moduleName,
    targetId: candidate.targetId,
    transactionDigest: text(candidate.transactionDigest, candidate.packageId),
    deployedAt: text(candidate.deployedAt, new Date(0).toISOString()),
    contractName: text(candidate.contractName, candidate.moduleName),
  };
}

export function getSharedExtensionKey(extension: Pick<SharedExtension, "moduleName" | "packageId" | "targetId">): string {
  return `${extension.targetId}:${extension.packageId}:${extension.moduleName}`;
}

/** Reads saved shared extensions, discarding any malformed entries. */
export function loadSharedExtensions(storage: Storage | undefined): readonly SharedExtension[] {
  const raw = storage?.getItem(SHARED_EXTENSION_STORAGE_KEY);
  if (raw === null || raw === undefined) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const extensions = parsed.map(parseSharedExtension).filter((entry): entry is SharedExtension => entry !== null);
    return dedupeSharedExtensions(extensions);
  } catch {
    return [];
  }
}

export const SHARED_EXTENSION_CHANGE_EVENT = "frontier-flow:shared-extensions-changed";

export function saveSharedExtensions(storage: Storage | undefined, extensions: readonly SharedExtension[]): void {
  storage?.setItem(SHARED_EXTENSION_STORAGE_KEY, JSON.stringify(extensions));
  // Navigation gating lives outside the authorize view, so announce the change.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SHARED_EXTENSION_CHANGE_EVENT));
  }
}

export function dedupeSharedExtensions(extensions: readonly SharedExtension[]): readonly SharedExtension[] {
  const merged = new Map<string, SharedExtension>();
  for (const extension of extensions) merged.set(getSharedExtensionKey(extension), extension);
  return [...merged.values()];
}

/** Adds (or replaces) one shared extension and returns the new list. */
export function addSharedExtension(
  extensions: readonly SharedExtension[],
  extension: SharedExtension,
): readonly SharedExtension[] {
  return dedupeSharedExtensions([...extensions, extension]);
}

export function removeSharedExtension(
  extensions: readonly SharedExtension[],
  key: string,
): readonly SharedExtension[] {
  return extensions.filter((extension) => getSharedExtensionKey(extension) !== key);
}
