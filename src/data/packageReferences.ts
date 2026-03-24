import type { PackageReferenceBundle } from "../compiler/types";

const RESOURCE_SOURCE = "https://docs.evefrontier.com/tools/resources";
const LAST_VERIFIED_ON = "2026-03-21";
export const PUBLISHED_WORLD_PACKAGE_MANIFEST_URL = "https://raw.githubusercontent.com/evefrontier/world-contracts/refs/heads/main/contracts/world/Published.toml";
export const WORLD_PACKAGE_OVERRIDE_STORAGE_KEY = "frontier-flow:world-package-overrides";

type RemoteDeploymentTargetId = Exclude<PackageReferenceBundle["targetId"], "local">;

interface StoredWorldPackageOverrides {
  readonly version: 1;
  readonly lastVerifiedOn: string;
  readonly source: string;
  readonly worldPackageIds: Partial<Record<RemoteDeploymentTargetId, string>>;
}

/**
 * Maintained Stillness and Utopia package references used for deployment validation.
 */
export const PACKAGE_REFERENCE_BUNDLES: readonly PackageReferenceBundle[] = [
  {
    targetId: "testnet:stillness",
    environmentLabel: "Stillness",
    worldPackageId: "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
    objectRegistryId: "0x454a9aa3d37e1d08d3c9181239c1b683781e4087fbbbd48c935d54b6736fd05c",
    serverAddressRegistryId: "0xeb97b81668699672b1147c28dacb3d595534c48f4e177d3d80337dbde464f05f",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
  {
    targetId: "testnet:utopia",
    environmentLabel: "Utopia",
    worldPackageId: "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75",
    objectRegistryId: "0xc2b969a72046c47e24991d69472afb2216af9e91caf802684514f39706d7dc57",
    serverAddressRegistryId: "0x9a9f2f7d1b8cf100feb532223aa6c38451edb05406323af5054f9d974555708b",
    source: RESOURCE_SOURCE,
    lastVerifiedOn: LAST_VERIFIED_ON,
  },
];

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function getCurrentIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isPublishedPackageId(value: string): boolean {
  return /^0x[a-f0-9]+$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStoredWorldPackageOverrides(value: unknown): StoredWorldPackageOverrides | null {
  if (
    !isRecord(value)
    || value.version !== 1
    || typeof value.lastVerifiedOn !== "string"
    || typeof value.source !== "string"
    || !isRecord(value.worldPackageIds)
  ) {
    return null;
  }

  const worldPackageIds: Partial<Record<RemoteDeploymentTargetId, string>> = {};
  for (const targetId of ["testnet:stillness", "testnet:utopia"] as const) {
    const packageId = value.worldPackageIds[targetId];
    if (typeof packageId === "string" && isPublishedPackageId(packageId)) {
      worldPackageIds[targetId] = packageId;
    }
  }

  return {
    version: 1,
    lastVerifiedOn: value.lastVerifiedOn,
    source: value.source,
    worldPackageIds,
  };
}

function getStoredWorldPackageOverrides(storage: Storage | undefined): StoredWorldPackageOverrides | null {
  const rawValue = storage?.getItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return parseStoredWorldPackageOverrides(parsedValue);
  } catch {
    return null;
  }
}

function saveStoredWorldPackageOverrides(storage: Storage | undefined, overrides: StoredWorldPackageOverrides): void {
  storage?.setItem(WORLD_PACKAGE_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
}

function extractPublishedSectionValue(manifest: string, sectionName: string, fieldName: string): string | null {
  const sectionPattern = new RegExp(`\\[published\\.${sectionName}\\]([\\s\\S]*?)(?:\\n\\[|$)`);
  const sectionMatch = manifest.match(sectionPattern);
  if (sectionMatch === null) {
    return null;
  }

  const fieldPattern = new RegExp(`${fieldName}\\s*=\\s*"([^"]+)"`);
  const fieldMatch = sectionMatch[1].match(fieldPattern);

  return fieldMatch?.[1] ?? null;
}

function getResolvedPackageReferenceBundles(storage = getBrowserStorage()): readonly PackageReferenceBundle[] {
  const storedOverrides = getStoredWorldPackageOverrides(storage);

  return PACKAGE_REFERENCE_BUNDLES.map((bundle) => {
    const overrideWorldPackageId = storedOverrides?.worldPackageIds[bundle.targetId as RemoteDeploymentTargetId];
    if (overrideWorldPackageId === undefined) {
      return bundle;
    }

    return {
      ...bundle,
      worldPackageId: overrideWorldPackageId,
      source: storedOverrides?.source ?? bundle.source,
      lastVerifiedOn: storedOverrides?.lastVerifiedOn ?? bundle.lastVerifiedOn,
    } satisfies PackageReferenceBundle;
  });
}

function createPackageReferenceBundleMap(storage = getBrowserStorage()): ReadonlyMap<PackageReferenceBundle["targetId"], PackageReferenceBundle> {
  return new Map(getResolvedPackageReferenceBundles(storage).map((bundle) => [bundle.targetId, bundle]));
}

/**
 * Parse Published.toml world package ids for the supported EVE Frontier targets.
 */
export function parsePublishedWorldPackageManifest(manifest: string): Partial<Record<RemoteDeploymentTargetId, string>> {
  const results: Partial<Record<RemoteDeploymentTargetId, string>> = {};

  for (const [sectionName, targetId] of [["testnet_stillness", "testnet:stillness"], ["testnet_utopia", "testnet:utopia"]] as const) {
    const originalId = extractPublishedSectionValue(manifest, sectionName, "original-id");
    const publishedAt = extractPublishedSectionValue(manifest, sectionName, "published-at");
    const resolvedPackageId = originalId ?? publishedAt;

    if (resolvedPackageId !== null && isPublishedPackageId(resolvedPackageId)) {
      results[targetId] = resolvedPackageId;
    }
  }

  return results;
}

/**
 * Refresh the cached world package ids from the maintained Published.toml manifest.
 */
export async function refreshPublishedWorldPackageManifest(input: {
  readonly fetchFn?: typeof fetch;
  readonly storage?: Storage;
} = {}): Promise<Partial<Record<RemoteDeploymentTargetId, string>>> {
  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const response = await fetchFn(PUBLISHED_WORLD_PACKAGE_MANIFEST_URL);

  if (!response.ok) {
    throw new Error(`Failed to load published world package manifest: ${String(response.status)} ${response.statusText}`.trim());
  }

  const manifest = await response.text();
  const worldPackageIds = parsePublishedWorldPackageManifest(manifest);
  saveStoredWorldPackageOverrides(input.storage ?? getBrowserStorage(), {
    version: 1,
    lastVerifiedOn: getCurrentIsoDate(),
    source: PUBLISHED_WORLD_PACKAGE_MANIFEST_URL,
    worldPackageIds,
  });

  return worldPackageIds;
}

/**
 * Return all maintained package reference bundles keyed by target id.
 */
export function getPackageReferenceBundleMap(): ReadonlyMap<PackageReferenceBundle["targetId"], PackageReferenceBundle> {
  return createPackageReferenceBundleMap();
}

/**
 * Resolve the published package reference bundle for a non-local deployment target.
 */
export function getPackageReferenceBundle(targetId: PackageReferenceBundle["targetId"]): PackageReferenceBundle {
  const bundle = createPackageReferenceBundleMap().get(targetId);

  if (bundle === undefined) {
    throw new Error(`Missing package reference bundle for ${targetId}`);
  }

  return bundle;
}

/**
 * Validate that a maintained bundle preserves the published-target metadata shape.
 */
export function hasValidPackageReferenceBundleShape(bundle: PackageReferenceBundle): boolean {
  return bundle.environmentLabel.length > 0
    && bundle.source.length > 0
    && bundle.lastVerifiedOn.length > 0
    && bundle.worldPackageId.startsWith("0x")
    && bundle.objectRegistryId.startsWith("0x")
    && bundle.serverAddressRegistryId.startsWith("0x");
}