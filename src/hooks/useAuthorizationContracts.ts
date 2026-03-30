import { useEffect, useMemo, useState } from "react";

import type { StoredDeploymentState } from "../types/authorization";

const AUTHORIZATION_ENTRYPOINT_NAME = "get_target_priority_list";
const AUTHORIZATION_WITNESS_NAME = "TurretAuth";
const MAX_OWNED_OBJECT_PAGES = 20;
const UNKNOWN_DEPLOYED_AT = new Date(0).toISOString();
const UPGRADE_CAP_TYPE = "0x2::package::UpgradeCap";

interface AuthorizationContractDiscoveryClient {
  readonly getObject?: (input: {
    readonly id: string;
    readonly options?: {
      readonly showContent?: boolean;
    };
  }) => Promise<unknown>;
  readonly getOwnedObjects?: (input: {
    readonly owner: string;
    readonly cursor?: string | null;
    readonly filter?: {
      readonly StructType: string;
    };
    readonly options?: {
      readonly showContent?: boolean;
    };
  }) => Promise<unknown>;
}

interface LoadAuthorizationContractsInput {
  readonly fallbackDeploymentState: StoredDeploymentState | null;
  readonly suiClient: AuthorizationContractDiscoveryClient;
  readonly targetId: StoredDeploymentState["targetId"] | null;
  readonly walletAddress: string | null;
}

interface UseAuthorizationContractsResult {
  readonly contracts: readonly StoredDeploymentState[];
  readonly errorMessage: string | null;
  readonly isLoading: boolean;
}

interface AuthorizationContractDiscoveryState {
  readonly contracts: readonly StoredDeploymentState[];
  readonly errorMessage: string | null;
  readonly requestKey: string | null;
}

/**
 * Discover authorization-capable package/module pairs from wallet-owned UpgradeCaps.
 */
export async function loadAuthorizationContractsFromUpgradeCaps(
  input: LoadAuthorizationContractsInput,
): Promise<readonly StoredDeploymentState[]> {
  const targetId = input.targetId;
  const fallbackContracts = mergeAuthorizationContracts([], input.fallbackDeploymentState);

  if (
    targetId === null
    || targetId === "local"
    || input.walletAddress === null
    || typeof input.suiClient.getOwnedObjects !== "function"
    || typeof input.suiClient.getObject !== "function"
  ) {
    return fallbackContracts;
  }

  const packageIds = await loadUpgradeCapPackageIds({
    getOwnedObjects: input.suiClient.getOwnedObjects,
    walletAddress: input.walletAddress,
  });
  const discoveredContracts = await Promise.all(packageIds.map(async (packageId) => {
    const moduleName = await resolveAuthorizationModuleName({
      getObject: input.suiClient.getObject as NonNullable<AuthorizationContractDiscoveryClient["getObject"]>,
      packageId,
    });

    if (moduleName === null) {
      return null;
    }

    const fallbackMatch = input.fallbackDeploymentState !== null
      && input.fallbackDeploymentState.packageId === packageId
      && input.fallbackDeploymentState.moduleName === moduleName
      ? input.fallbackDeploymentState
      : null;

    return fallbackMatch ?? createDiscoveredDeploymentState({
      moduleName,
      packageId,
      targetId,
    });
  }));

  return mergeAuthorizationContracts(
    discoveredContracts.filter((deploymentState): deploymentState is StoredDeploymentState => deploymentState !== null),
    input.fallbackDeploymentState,
  );
}

/**
 * Provide the selectable authorization contracts for the current wallet and deployment target.
 */
export function useAuthorizationContracts(input: LoadAuthorizationContractsInput): UseAuthorizationContractsResult {
  const getObject = useMemo(
    () => typeof input.suiClient.getObject === "function"
      ? input.suiClient.getObject.bind(input.suiClient)
      : undefined,
    [input.suiClient],
  );
  const getOwnedObjects = useMemo(
    () => typeof input.suiClient.getOwnedObjects === "function"
      ? input.suiClient.getOwnedObjects.bind(input.suiClient)
      : undefined,
    [input.suiClient],
  );
  const fallbackContracts = useMemo(
    () => mergeAuthorizationContracts([], input.fallbackDeploymentState),
    [input.fallbackDeploymentState],
  );
  const requestKey = useMemo(() => {
    if (
      input.targetId === null
      || input.targetId === "local"
      || input.walletAddress === null
      || typeof getOwnedObjects !== "function"
      || typeof getObject !== "function"
    ) {
      return null;
    }

    return `${input.targetId}:${input.walletAddress}`;
  }, [getObject, getOwnedObjects, input.targetId, input.walletAddress]);
  const [state, setState] = useState<AuthorizationContractDiscoveryState>({
    contracts: fallbackContracts,
    errorMessage: null,
    requestKey: null,
  });

  useEffect(() => {
    let isActive = true;

    if (requestKey === null) {
      return () => {
        isActive = false;
      };
    }

    void loadAuthorizationContractsFromUpgradeCaps({
      fallbackDeploymentState: input.fallbackDeploymentState,
      suiClient: {
        getObject,
        getOwnedObjects,
      },
      targetId: input.targetId,
      walletAddress: input.walletAddress,
    }).then((contracts) => {
      if (!isActive) {
        return;
      }

      setState({
        contracts,
        errorMessage: null,
        requestKey,
      });
    }).catch((error: unknown) => {
      if (!isActive) {
        return;
      }

      setState({
        contracts: fallbackContracts,
        errorMessage: error instanceof Error ? error.message : "Could not load contracts from wallet UpgradeCaps.",
        requestKey,
      });
    });

    return () => {
      isActive = false;
    };
  }, [fallbackContracts, getObject, getOwnedObjects, input.fallbackDeploymentState, input.targetId, input.walletAddress, requestKey]);

  if (requestKey === null) {
    return {
      contracts: fallbackContracts,
      errorMessage: null,
      isLoading: false,
    };
  }

  if (state.requestKey !== requestKey) {
    return {
      contracts: fallbackContracts,
      errorMessage: null,
      isLoading: true,
    };
  }

  return {
    contracts: state.contracts,
    errorMessage: state.errorMessage,
    isLoading: false,
  };
}

function createDiscoveredDeploymentState(input: {
  readonly moduleName: string;
  readonly packageId: string;
  readonly targetId: StoredDeploymentState["targetId"];
}): StoredDeploymentState {
  return {
    version: 1,
    packageId: input.packageId,
    moduleName: input.moduleName,
    targetId: input.targetId,
    transactionDigest: input.packageId,
    deployedAt: UNKNOWN_DEPLOYED_AT,
    contractName: humanizeModuleName(input.moduleName),
  };
}

function mergeAuthorizationContracts(
  discoveredContracts: readonly StoredDeploymentState[],
  fallbackDeploymentState: StoredDeploymentState | null,
): readonly StoredDeploymentState[] {
  const mergedContracts = new Map<string, StoredDeploymentState>();

  if (fallbackDeploymentState !== null) {
    mergedContracts.set(getAuthorizationContractKey(fallbackDeploymentState), fallbackDeploymentState);
  }

  for (const contract of discoveredContracts) {
    const key = getAuthorizationContractKey(contract);

    if (!mergedContracts.has(key)) {
      mergedContracts.set(key, contract);
    }
  }

  return [...mergedContracts.values()].sort((left, right) => {
    if (fallbackDeploymentState !== null) {
      const fallbackKey = getAuthorizationContractKey(fallbackDeploymentState);

      if (getAuthorizationContractKey(left) === fallbackKey) {
        return -1;
      }

      if (getAuthorizationContractKey(right) === fallbackKey) {
        return 1;
      }
    }

    const contractNameComparison = left.contractName.localeCompare(right.contractName);

    if (contractNameComparison !== 0) {
      return contractNameComparison;
    }

    const moduleNameComparison = left.moduleName.localeCompare(right.moduleName);

    if (moduleNameComparison !== 0) {
      return moduleNameComparison;
    }

    return left.packageId.localeCompare(right.packageId);
  });
}

function getAuthorizationContractKey(contract: Pick<StoredDeploymentState, "moduleName" | "packageId" | "targetId">): string {
  return `${contract.targetId}:${contract.packageId}:${contract.moduleName}`;
}

function humanizeModuleName(moduleName: string): string {
  return moduleName
    .split(/[_\-\s]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function loadUpgradeCapPackageIds(input: {
  readonly getOwnedObjects: NonNullable<AuthorizationContractDiscoveryClient["getOwnedObjects"]>;
  readonly walletAddress: string;
}): Promise<readonly string[]> {
  const packageIds = new Set<string>();
  let cursor: string | null = null;

  for (let pageIndex = 0; pageIndex < MAX_OWNED_OBJECT_PAGES; pageIndex += 1) {
    const response = await input.getOwnedObjects({
      cursor,
      filter: { StructType: UPGRADE_CAP_TYPE },
      options: { showContent: true },
      owner: input.walletAddress,
    });

    for (const entry of getOwnedObjectEntries(response)) {
      const packageId = extractUpgradeCapPackageId(entry);

      if (packageId !== null) {
        packageIds.add(packageId);
      }
    }

    if (!hasNextOwnedObjectPage(response)) {
      break;
    }

    const nextCursor = getNextOwnedObjectCursor(response);

    if (nextCursor === null) {
      break;
    }

    cursor = nextCursor;
  }

  return [...packageIds].sort((left, right) => left.localeCompare(right));
}

function getOwnedObjectEntries(response: unknown): readonly unknown[] {
  if (!isRecord(response) || !Array.isArray(response.data)) {
    return [];
  }

  return response.data;
}

function hasNextOwnedObjectPage(response: unknown): boolean {
  return isRecord(response) && response.hasNextPage === true;
}

function getNextOwnedObjectCursor(response: unknown): string | null {
  return isRecord(response) && typeof response.nextCursor === "string"
    ? response.nextCursor
    : null;
}

function extractUpgradeCapPackageId(entry: unknown): string | null {
  const packageValue = getNestedValue(entry, ["data", "content", "fields", "package"]);

  return typeof packageValue === "string" && packageValue.length > 0 ? packageValue : null;
}

async function resolveAuthorizationModuleName(input: {
  readonly getObject: NonNullable<AuthorizationContractDiscoveryClient["getObject"]>;
  readonly packageId: string;
}): Promise<string | null> {
  const response = await input.getObject({
    id: input.packageId,
    options: { showContent: true },
  });
  const modules = extractPackageModules(response);

  if (modules === null) {
    return null;
  }

  return selectAuthorizationModuleName(modules);
}

function extractPackageModules(response: unknown): Readonly<Record<string, string>> | null {
  const disassembled = getNestedValue(response, ["data", "content", "disassembled"]);

  if (!isRecord(disassembled)) {
    return null;
  }

  const modules: Record<string, string> = {};

  for (const [moduleName, source] of Object.entries(disassembled)) {
    if (typeof source === "string" && source.length > 0) {
      modules[moduleName] = source;
    }
  }

  return Object.keys(modules).length > 0 ? modules : null;
}

function selectAuthorizationModuleName(modules: Readonly<Record<string, string>>): string | null {
  const moduleEntries = Object.entries(modules).sort(([left], [right]) => left.localeCompare(right));
  const exactMatch = moduleEntries.find(([, source]) => source.includes(AUTHORIZATION_ENTRYPOINT_NAME) && source.includes(AUTHORIZATION_WITNESS_NAME));

  if (exactMatch !== undefined) {
    return exactMatch[0];
  }

  const witnessOnlyMatch = moduleEntries.find(([, source]) => source.includes(AUTHORIZATION_WITNESS_NAME));
  return witnessOnlyMatch?.[0] ?? null;
}

function getNestedValue(value: unknown, path: readonly string[]): unknown {
  let currentValue: unknown = value;

  for (const key of path) {
    if (!isRecord(currentValue) || !(key in currentValue)) {
      return null;
    }

    currentValue = currentValue[key];
  }

  return currentValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}