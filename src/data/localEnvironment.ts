export const LOCAL_ENVIRONMENT_STORAGE_KEY = "frontier-flow:local-environment";
export const LOCAL_ENVIRONMENT_CHANGED_EVENT = "frontier-flow:local-environment-changed";

export const DEFAULT_LOCAL_RPC_URL = "http://localhost:9000";
export const DEFAULT_LOCAL_GRAPHQL_URL = "http://localhost:9125/graphql";
export const DEFAULT_LOCAL_WORLD_PACKAGE_ID = "0xcf6b5da20b0c6540895b79b91580ec0734fcfa4298848f0e8382ef217965bfd5";
export const DEFAULT_LOCAL_WORLD_PACKAGE_VERSION = "0.0.18";
export const DEFAULT_USE_EPHEMERAL_KEYPAIR = true;

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const PACKAGE_ID_PATTERN = /^0x[a-f0-9]+$/i;

export interface LocalEnvironmentConfig {
  readonly version: 1;
  readonly rpcUrl: string;
  readonly graphQlUrl: string;
  readonly worldPackageId: string;
  readonly worldPackageVersion: string;
  readonly useEphemeralKeypair: boolean;
  readonly updatedAt: string;
}

export interface LocalEnvironmentDraft {
  readonly rpcUrl: string;
  readonly graphQlUrl: string;
  readonly worldPackageId: string;
  readonly worldPackageVersion: string;
  readonly useEphemeralKeypair: boolean;
}

export interface WorldPackageGraphQlValidationResult {
  readonly isValid: boolean;
  readonly message?: string;
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

function getLocalWorldPackageLabelFragment(worldPackageId: string): string {
  const normalized = worldPackageId.trim();
  return normalized.length <= 6 ? normalized : `${normalized.slice(0, 6)}...`;
}

function createDefaultLocalEnvironmentConfig(): LocalEnvironmentConfig {
  return {
    version: 1,
    rpcUrl: DEFAULT_LOCAL_RPC_URL,
    graphQlUrl: DEFAULT_LOCAL_GRAPHQL_URL,
    worldPackageId: DEFAULT_LOCAL_WORLD_PACKAGE_ID,
    worldPackageVersion: DEFAULT_LOCAL_WORLD_PACKAGE_VERSION,
    useEphemeralKeypair: DEFAULT_USE_EPHEMERAL_KEYPAIR,
    updatedAt: getCurrentIsoTimestamp(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJsonValue(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function getValidValue<T extends string>(value: T | null, isValid: (input: T) => boolean, fallback: T): T {
  return value !== null && isValid(value) ? value : fallback;
}

function readStoredLocalEnvironment(storage: Storage | undefined): Record<string, unknown> | null {
  const rawValue = storage?.getItem(LOCAL_ENVIRONMENT_STORAGE_KEY);

  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  try {
    const parsedValue = parseJsonValue(rawValue);
    return isRecord(parsedValue) && parsedValue.version === 1 ? parsedValue : null;
  } catch {
    return null;
  }
}

function getValidationRequestBody(worldPackageId: string): string {
  return JSON.stringify({
    query: `query ValidateWorldPackage($address: SuiAddress!) {
  object(address: $address) {
    address
    asMovePackage {
      address
    }
  }
}`,
    variables: {
      address: worldPackageId,
    },
  });
}

function getGraphQlFailureMessage(response: Response): string {
  return `GraphQL validation failed: ${String(response.status)} ${response.statusText}`.trim();
}

function getGraphQlPayloadErrors(payload: Record<string, unknown>): unknown[] {
  return Array.isArray(payload.errors) ? payload.errors : [];
}

function getGraphQlErrorResult(payload: Record<string, unknown>): WorldPackageGraphQlValidationResult | null {
  const errors = getGraphQlPayloadErrors(payload);

  if (errors.length === 0) {
    return null;
  }

  const firstError = errors[0];
  const errorMessage = isRecord(firstError) && typeof firstError.message === "string"
    ? firstError.message
    : "GraphQL validation failed for the provided world package id.";

  return {
    isValid: false,
    message: errorMessage,
  };
}

function hasMovePackage(payload: Record<string, unknown>): boolean {
  const data = isRecord(payload.data) ? payload.data : null;
  const object = data !== null && isRecord(data.object) ? data.object : null;
  return object !== null && isRecord(object.asMovePackage);
}

export function trimLocalEnvironmentDraft(draft: LocalEnvironmentDraft): LocalEnvironmentDraft {
  return {
    rpcUrl: draft.rpcUrl.trim(),
    graphQlUrl: draft.graphQlUrl.trim(),
    worldPackageId: draft.worldPackageId.trim(),
    worldPackageVersion: draft.worldPackageVersion.trim(),
    useEphemeralKeypair: draft.useEphemeralKeypair,
  };
}

export function isValidEnvironmentUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidWorldPackageId(value: string): boolean {
  return PACKAGE_ID_PATTERN.test(value);
}

export function isValidWorldPackageVersion(value: string): boolean {
  return SEMVER_PATTERN.test(value);
}

export function getLocalEnvironmentConfigSnapshot(storage = getBrowserStorage()): string | null {
  return storage?.getItem(LOCAL_ENVIRONMENT_STORAGE_KEY) ?? null;
}

export function subscribeToLocalEnvironmentChanges(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    listener();
  };

  window.addEventListener(LOCAL_ENVIRONMENT_CHANGED_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(LOCAL_ENVIRONMENT_CHANGED_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function toWorldPackageVersionTag(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

export function getLocalDeploymentTargetLabel(config = loadLocalEnvironmentConfig()): string {
  return `localnet:${getLocalWorldPackageLabelFragment(config.worldPackageId)}`;
}

export function getLocalDeploymentEnvironmentLabel(config = loadLocalEnvironmentConfig()): string {
  return `Localnet ${getLocalWorldPackageLabelFragment(config.worldPackageId)}`;
}

export function loadLocalEnvironmentConfig(storage = getBrowserStorage()): LocalEnvironmentConfig {
  const defaults = createDefaultLocalEnvironmentConfig();
  const storedConfig = readStoredLocalEnvironment(storage);

  if (storedConfig === null) {
    return defaults;
  }

  const rpcUrl = asTrimmedString(storedConfig.rpcUrl);
  const graphQlUrl = asTrimmedString(storedConfig.graphQlUrl);
  const worldPackageId = asTrimmedString(storedConfig.worldPackageId);
  const worldPackageVersion = asTrimmedString(storedConfig.worldPackageVersion);
  const useEphemeralKeypair = asBoolean(storedConfig.useEphemeralKeypair);
  const updatedAt = asTrimmedString(storedConfig.updatedAt);

  return {
    version: 1,
    rpcUrl: getValidValue(rpcUrl, isValidEnvironmentUrl, defaults.rpcUrl),
    graphQlUrl: getValidValue(graphQlUrl, isValidEnvironmentUrl, defaults.graphQlUrl),
    worldPackageId: getValidValue(worldPackageId, isValidWorldPackageId, defaults.worldPackageId),
    worldPackageVersion: getValidValue(worldPackageVersion, isValidWorldPackageVersion, defaults.worldPackageVersion),
    useEphemeralKeypair: useEphemeralKeypair ?? defaults.useEphemeralKeypair,
    updatedAt: updatedAt ?? defaults.updatedAt,
  };
}

export function saveLocalEnvironmentConfig(
  storage: Storage | undefined,
  draft: LocalEnvironmentDraft,
): LocalEnvironmentConfig {
  const trimmedDraft = trimLocalEnvironmentDraft(draft);
  const nextConfig: LocalEnvironmentConfig = {
    version: 1,
    rpcUrl: trimmedDraft.rpcUrl,
    graphQlUrl: trimmedDraft.graphQlUrl,
    worldPackageId: trimmedDraft.worldPackageId,
    worldPackageVersion: trimmedDraft.worldPackageVersion,
    useEphemeralKeypair: trimmedDraft.useEphemeralKeypair,
    updatedAt: getCurrentIsoTimestamp(),
  };

  storage?.setItem(LOCAL_ENVIRONMENT_STORAGE_KEY, JSON.stringify(nextConfig));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LOCAL_ENVIRONMENT_CHANGED_EVENT));
  }

  return nextConfig;
}

export async function validateWorldPackageViaGraphQl(input: {
  readonly fetchFn?: typeof fetch;
  readonly graphQlUrl: string;
  readonly worldPackageId: string;
}): Promise<WorldPackageGraphQlValidationResult> {
  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

  try {
    const response = await fetchFn(input.graphQlUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: getValidationRequestBody(input.worldPackageId),
    });

    if (!response.ok) {
      return {
        isValid: false,
        message: getGraphQlFailureMessage(response),
      };
    }

    const payload = parseJsonValue(await response.text());
    if (!isRecord(payload)) {
      return {
        isValid: false,
        message: "GraphQL validation failed: endpoint returned an invalid response.",
      };
    }

    const errorResult = getGraphQlErrorResult(payload);
    if (errorResult !== null) {
      return errorResult;
    }

    if (!hasMovePackage(payload)) {
      return {
        isValid: false,
        message: "The provided world package id was not found as a Move package on the configured GraphQL endpoint.",
      };
    }

    return { isValid: true };
  } catch (error: unknown) {
    return {
      isValid: false,
      message: error instanceof Error
        ? error.message
        : "GraphQL validation failed for the provided world package id.",
    };
  }
}