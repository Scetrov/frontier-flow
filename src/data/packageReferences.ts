import type { PackageReferenceBundle } from "../compiler/types";
import { getMoveBuilderGitHubAccessToken } from "../compiler/moveBuilderLite";
import { GITHUB_API_VERSION } from "../utils/githubApi";
import {
  MAINTAINED_REMOTE_TARGET_IDS,
  MAINTAINED_WORLD_PACKAGE_REFERENCES,
  type MaintainedRemoteTargetId,
} from "./maintainedWorldPackageReferences";
import { parsePublishedManifestStrict } from "./publishedManifestParser";
import {
  DEFAULT_LOCAL_GRAPHQL_URL,
  DEFAULT_LOCAL_WORLD_PACKAGE_ID,
  DEFAULT_LOCAL_WORLD_PACKAGE_VERSION,
  getLocalEnvironmentConfigSnapshot,
  getLocalDeploymentEnvironmentLabel,
  loadLocalEnvironmentConfig,
  toWorldPackageVersionTag,
} from "./localEnvironment";

const RAW_GITHUB_HOSTNAME = "raw.githubusercontent.com";
export const PUBLISHED_WORLD_PACKAGE_MANIFEST_URL = "https://raw.githubusercontent.com/evefrontier/world-contracts/main/contracts/world/Published.toml";
export const WORLD_PACKAGE_OVERRIDE_STORAGE_KEY = "frontier-flow:world-package-overrides";

let cachedBundleMap: ReadonlyMap<PackageReferenceBundle["targetId"], PackageReferenceBundle> | null = null;
let cachedLocalEnvironmentSnapshot: string | null | undefined;

type RemoteDeploymentTargetId = MaintainedRemoteTargetId;

interface PublishedWorldPackageMetadata {
  readonly worldPackageId: string;
  readonly originalWorldPackageId?: string;
  readonly toolchainVersion?: string;
}

/**
 * Maintained Stillness and Utopia package references used for deployment validation.
 */
export const PACKAGE_REFERENCE_BUNDLES: readonly PackageReferenceBundle[] = [
  {
    targetId: "local",
    environmentLabel: getLocalDeploymentEnvironmentLabel(),
    worldPackageId: DEFAULT_LOCAL_WORLD_PACKAGE_ID,
    originalWorldPackageId: DEFAULT_LOCAL_WORLD_PACKAGE_ID,
    objectRegistryId: "0xc344526dd6e14297453e53195f4b9c46c0d31200ed8805195e183f796d349a63",
    serverAddressRegistryId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    sourceVersionTag: toWorldPackageVersionTag(DEFAULT_LOCAL_WORLD_PACKAGE_VERSION),
    toolchainVersion: "1.67.1",
    source: DEFAULT_LOCAL_GRAPHQL_URL,
    lastVerifiedOn: "2026-07-26",
  },
  ...MAINTAINED_WORLD_PACKAGE_REFERENCES,
];

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function getGitHubContentsApiUrl(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  if (url.hostname !== RAW_GITHUB_HOSTNAME) {
    return null;
  }

  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 4) {
    return null;
  }

  const [owner, repo, revision, ...rest] = segments;
  if (rest.length === 0) {
    return null;
  }

  const apiUrl = new URL(`https://api.github.com/repos/${owner}/${repo}/contents/${rest.join("/")}`);
  apiUrl.searchParams.set("ref", revision);
  return apiUrl.toString();
}

async function fetchGitHubManifest(
  fetchFn: typeof fetch,
  rawUrl: string,
): Promise<Response> {
  const githubAccessToken = getMoveBuilderGitHubAccessToken();
  if (githubAccessToken === null) {
    return fetchFn(rawUrl);
  }

  const apiUrl = getGitHubContentsApiUrl(rawUrl);
  if (apiUrl === null) {
    return fetchFn(rawUrl);
  }

  return fetchFn(apiUrl, {
    headers: {
      Accept: "application/vnd.github.raw",
      Authorization: `Bearer ${githubAccessToken}`,
      "User-Agent": "frontier-flow",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });
}

/**
 * Resolve all package reference bundles.
 *
 * Remote bundles are authoritative from checked-in data — stored version-2/version-3
 * browser overrides are NOT applied. This prevents partial upstream metadata from
 * creating a mixed-lineage active bundle.
 *
 * The local bundle may be overridden by user-configured local environment settings.
 */
function getResolvedPackageReferenceBundles(storage = getBrowserStorage()): readonly PackageReferenceBundle[] {
  const localEnvironment = loadLocalEnvironmentConfig(storage);

  return PACKAGE_REFERENCE_BUNDLES.map((bundle) => {
    if (bundle.targetId === "local") {
      return {
        ...bundle,
        environmentLabel: getLocalDeploymentEnvironmentLabel(localEnvironment),
        worldPackageId: localEnvironment.worldPackageId,
        originalWorldPackageId: localEnvironment.worldPackageId,
        sourceVersionTag: toWorldPackageVersionTag(localEnvironment.worldPackageVersion),
        source: localEnvironment.graphQlUrl,
        lastVerifiedOn: localEnvironment.updatedAt.slice(0, 10),
      } satisfies PackageReferenceBundle;
    }

    // Remote bundles are always checked-in. Legacy stored overrides are ignored.
    return bundle;
  });
}

function createPackageReferenceBundleMap(storage = getBrowserStorage()): ReadonlyMap<PackageReferenceBundle["targetId"], PackageReferenceBundle> {
  const localEnvironmentSnapshot = getLocalEnvironmentConfigSnapshot(storage);

  if (
    cachedBundleMap !== null
    && cachedLocalEnvironmentSnapshot === localEnvironmentSnapshot
  ) {
    return cachedBundleMap;
  }

  cachedLocalEnvironmentSnapshot = localEnvironmentSnapshot;
  cachedBundleMap = new Map(getResolvedPackageReferenceBundles(storage).map((bundle) => [bundle.targetId, bundle]));

  return cachedBundleMap;
}

/**
 * Whether a daily manifest refresh is recommended.
 *
 * Since stored version-2/version-3 overrides are no longer applied to active
 * bundles, this always returns true to allow observation-based drift detection.
 * The actual refresh is bounded by caller-level rate limiting.
 */
export function shouldRefreshPublishedWorldPackageManifest(_storage = getBrowserStorage()): boolean {
  return true;
}

// ---- Freshness outcomes for runtime manifest observation ----

/**
 * Outcome of comparing a runtime manifest observation against a checked-in bundle.
 */
export type ManifestFreshnessOutcome =
  | ManifestFreshnessMatch
  | ManifestFreshnessStale
  | ManifestFreshnessUnavailable
  | ManifestFreshnessMalformed;

export interface ManifestFreshnessMatch {
  readonly status: "matched";
  readonly targetId: RemoteDeploymentTargetId;
}

export interface ManifestFreshnessStale {
  readonly status: "stale";
  readonly targetId: RemoteDeploymentTargetId;
  readonly driftedFields: readonly ManifestFreshnessFieldDrift[];
}

export interface ManifestFreshnessFieldDrift {
  readonly field: string;
  readonly expected: string;
  readonly actual: string;
}

export interface ManifestFreshnessUnavailable {
  readonly status: "unavailable";
  readonly targetId: RemoteDeploymentTargetId;
  readonly reason: string;
}

export interface ManifestFreshnessMalformed {
  readonly status: "malformed";
  readonly targetId: RemoteDeploymentTargetId;
  readonly reason: string;
}

/**
 * Compare a runtime manifest observation against a checked-in bundle and
 * produce a freshness outcome without modifying the active bundle.
 */
export function computeManifestFreshness(
  targetId: RemoteDeploymentTargetId,
  observation: PublishedWorldPackageMetadata | undefined,
): ManifestFreshnessOutcome {
  const bundle = createPackageReferenceBundleMap().get(targetId);
  if (bundle === undefined) {
    return { status: "unavailable", targetId, reason: `Unknown target: ${targetId}` };
  }

  if (observation === undefined) {
    return { status: "unavailable", targetId, reason: "Target not found in manifest observation" };
  }

  const driftedFields: ManifestFreshnessFieldDrift[] = [];

  if (observation.worldPackageId !== bundle.worldPackageId) {
    driftedFields.push({ field: "published-at", expected: bundle.worldPackageId, actual: observation.worldPackageId });
  }

  const observedOriginalId = observation.originalWorldPackageId ?? observation.worldPackageId;
  if (observedOriginalId !== bundle.originalWorldPackageId) {
    driftedFields.push({ field: "original-id", expected: bundle.originalWorldPackageId, actual: observedOriginalId });
  }

  if (observation.toolchainVersion !== undefined && observation.toolchainVersion !== bundle.toolchainVersion) {
    driftedFields.push({ field: "toolchain-version", expected: bundle.toolchainVersion, actual: observation.toolchainVersion });
  }

  if (driftedFields.length > 0) {
    return { status: "stale", targetId, driftedFields };
  }

  return { status: "matched", targetId };
}

// ---- Module-level freshness observation store ----

let latestFreshnessObservations: ReadonlyMap<RemoteDeploymentTargetId, ManifestFreshnessOutcome> = new Map();

/**
 * Store a freshness observation for a maintained remote target.
 * Called by the runtime observation layer (e.g. WalletStatus) after each
 * manifest refresh.
 */
export function setManifestFreshnessOutcome(
  targetId: RemoteDeploymentTargetId,
  outcome: ManifestFreshnessOutcome,
): void {
  latestFreshnessObservations = new Map(latestFreshnessObservations).set(targetId, outcome);
}

/**
 * Read the latest stored freshness outcome for a remote target.
 * Returns "unavailable" when no observation has been recorded yet.
 */
export function getManifestFreshnessOutcome(
  targetId: RemoteDeploymentTargetId,
): ManifestFreshnessOutcome {
  const cached = latestFreshnessObservations.get(targetId);
  return cached ?? { status: "unavailable", targetId, reason: "No observation recorded" };
}

/**
 * Parse Published.toml world package metadata for the supported EVE Frontier targets.
 */
export class PublishedWorldPackageManifestError extends Error {
  public constructor(
    readonly kind: "malformed",
    message: string,
  ) {
    super(message);
    this.name = "PublishedWorldPackageManifestError";
  }
}

export function parsePublishedWorldPackageManifest(manifest: string): Record<RemoteDeploymentTargetId, PublishedWorldPackageMetadata> {
  const parsed = parsePublishedManifestStrict(manifest);
  if (!parsed.ok) {
    throw new PublishedWorldPackageManifestError(
      "malformed",
      parsed.errors.map((error) => `${error.target}${error.field === undefined ? "" : `.${error.field}`}: ${error.message}`).join("; "),
    );
  }

  return Object.fromEntries(
    MAINTAINED_REMOTE_TARGET_IDS.map((targetId) => {
      const target = parsed.targets.get(targetId);
      if (target === undefined) {
        throw new PublishedWorldPackageManifestError("malformed", `Missing maintained target ${targetId}`);
      }
      return [targetId, {
        worldPackageId: target.worldPackageId,
        originalWorldPackageId: target.originalWorldPackageId,
        toolchainVersion: target.toolchainVersion,
      }];
    }),
  ) as Record<RemoteDeploymentTargetId, PublishedWorldPackageMetadata>;
}

/**
 * Fetch and parse the maintained Published.toml manifest as an observation.
 *
 * The returned metadata is observational only and is NOT applied to any active
 * package-reference bundle. Callers use this to detect upstream drift.
 *
 * Legacy version-2/version-3 stored overrides are no longer written.
 */
export async function refreshPublishedWorldPackageManifest(input: {
  readonly fetchFn?: typeof fetch;
  readonly storage?: Storage;
} = {}): Promise<Record<RemoteDeploymentTargetId, PublishedWorldPackageMetadata>> {
  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const response = await fetchGitHubManifest(fetchFn, PUBLISHED_WORLD_PACKAGE_MANIFEST_URL);

  if (!response.ok) {
    throw new Error(`Failed to load published world package manifest: ${String(response.status)} ${response.statusText}`.trim());
  }

  const manifest = await response.text();
  return parsePublishedWorldPackageManifest(manifest);
}

/**
 * Return all maintained package reference bundles keyed by target id.
 */
export function getPackageReferenceBundleMap(): ReadonlyMap<PackageReferenceBundle["targetId"], PackageReferenceBundle> {
  return createPackageReferenceBundleMap();
}

/**
 * Resolve the published package reference bundle for a deployment target.
 */
export function getPackageReferenceBundle(targetId: PackageReferenceBundle["targetId"]): PackageReferenceBundle {
  const bundle = createPackageReferenceBundleMap().get(targetId);

  if (bundle === undefined) {
    throw new Error(`Missing package reference bundle for ${targetId}`);
  }

  return bundle;
}

function hasRpcLookupError(value: unknown): boolean {
  return typeof value === "object"
    && value !== null
    && "error" in value
    && (value as { readonly error?: unknown }).error != null;
}

export async function verifyPublishedWorldPackageExists(
  targetId: PackageReferenceBundle["targetId"],
  client: { getObject?: (args: { id: string; signal?: AbortSignal }) => Promise<unknown> },
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const bundle = getPackageReferenceBundle(targetId);
    if (typeof client.getObject !== "function") {
      // If the provided client does not implement getObject, assume existence.
      return true;
    }

    const result = await client.getObject({ id: bundle.worldPackageId, signal });
    return !hasRpcLookupError(result);
  } catch {
    return false;
  }
}

/**
 * Validate that a maintained bundle preserves the published-target metadata shape.
 */
export function hasValidPackageReferenceBundleShape(bundle: PackageReferenceBundle): boolean {
  return bundle.environmentLabel.length > 0
    && bundle.source.length > 0
    && bundle.lastVerifiedOn.length > 0
    && bundle.sourceVersionTag.length > 0
    && bundle.toolchainVersion.length > 0
    && bundle.worldPackageId.startsWith("0x")
    && bundle.originalWorldPackageId.startsWith("0x")
    && bundle.objectRegistryId.startsWith("0x")
    && bundle.serverAddressRegistryId.startsWith("0x");
}