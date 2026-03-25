import type { StoredDeploymentState, TurretInfo } from "../types/authorization";

const MOCK_AUTHORIZATION_STORAGE_KEY = "frontier-flow:mock-authorizations";

interface MockAuthorizationSnapshot {
  readonly deployments?: Record<string, readonly string[]>;
}

export interface AuthorizationMockEnvironment {
  readonly delayMs: number;
  readonly enabled: boolean;
  readonly failIndex: number | null;
}

export function getAuthorizationMockEnvironment(search?: string): AuthorizationMockEnvironment {
  const params = getSearchParams(search);
  const delayMs = Math.max(0, Number(params?.get("ff_mock_authorize_delay_ms") ?? "0") || 0);

  return {
    delayMs,
    enabled: hasMockAuthorizationFlags(params),
    failIndex: parseMockFailIndex(params?.get("ff_mock_authorize_fail") ?? null),
  };
}

function hasMockAuthorizationFlags(params: URLSearchParams | null): boolean {
  return params?.has("ff_mock_authorize_delay_ms") === true || params?.has("ff_mock_authorize_fail") === true;
}

function parseMockFailIndex(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsedFailIndex = Number.parseInt(value, 10);
  return Number.isInteger(parsedFailIndex) && parsedFailIndex >= 0 ? parsedFailIndex : null;
}

export function overlayMockAuthorizedTurrets(
  turrets: readonly TurretInfo[],
  deploymentState: StoredDeploymentState,
  storage: Storage | undefined = getBrowserStorage(),
): readonly TurretInfo[] {
  const authorizedTurretIds = loadMockAuthorizedTurretIds(deploymentState, storage);

  if (authorizedTurretIds.size === 0) {
    return turrets;
  }

  return turrets.map((turret) => authorizedTurretIds.has(turret.objectId)
    ? {
        ...turret,
        currentExtension: {
          packageId: deploymentState.packageId,
          moduleName: deploymentState.moduleName,
          typeName: `${deploymentState.packageId}::${deploymentState.moduleName}::TurretAuth`,
          isCurrentDeployment: true,
        },
      }
    : turret);
}

export function recordMockAuthorizedTurrets(
  deploymentState: StoredDeploymentState,
  turretObjectIds: readonly string[],
  storage: Storage | undefined = getBrowserStorage(),
): void {
  if (storage === undefined || turretObjectIds.length === 0) {
    return;
  }

  const snapshot = readSnapshot(storage);
  const deploymentKey = getDeploymentKey(deploymentState);
  const currentTurretIds = new Set(snapshot.deployments?.[deploymentKey] ?? []);

  for (const turretObjectId of turretObjectIds) {
    currentTurretIds.add(turretObjectId);
  }

  storage.setItem(MOCK_AUTHORIZATION_STORAGE_KEY, JSON.stringify({
    deployments: {
      ...(snapshot.deployments ?? {}),
      [deploymentKey]: Array.from(currentTurretIds),
    },
  } satisfies MockAuthorizationSnapshot));
}

function loadMockAuthorizedTurretIds(
  deploymentState: StoredDeploymentState,
  storage: Storage | undefined,
): ReadonlySet<string> {
  if (storage === undefined) {
    return new Set<string>();
  }

  const snapshot = readSnapshot(storage);
  return new Set(snapshot.deployments?.[getDeploymentKey(deploymentState)] ?? []);
}

function readSnapshot(storage: Storage): MockAuthorizationSnapshot {
  const rawValue = storage.getItem(MOCK_AUTHORIZATION_STORAGE_KEY);

  if (rawValue === null) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    return parsed !== null && typeof parsed === "object" ? parsed as MockAuthorizationSnapshot : {};
  } catch {
    return {};
  }
}

function getDeploymentKey(deploymentState: StoredDeploymentState): string {
  return `${deploymentState.targetId}:${deploymentState.packageId}:${deploymentState.moduleName}`;
}

function getBrowserStorage(): Storage | undefined {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return undefined;
  }

  return globalThis.localStorage;
}

function getSearchParams(search?: string): URLSearchParams | null {
  if (search !== undefined) {
    return new URLSearchParams(search);
  }

  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search);
}