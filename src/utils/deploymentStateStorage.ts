import { CONTRACT_LIBRARY_STORAGE_KEY, sanitizeContractName } from "./contractStorage";
import type { DeploymentTargetId } from "../compiler/types";
import type { StoredDeploymentState } from "../types/authorization";

export const DEPLOYMENT_STATE_STORAGE_KEY = "frontier-flow:deployment";

interface DeploymentStateValidationContext {
  readonly contractName: string | null;
  readonly targetId: DeploymentTargetId;
  readonly moduleName?: string;
}

interface StoredDeploymentStateFields {
  readonly packageId: string;
  readonly moduleName: string;
  readonly targetId: DeploymentTargetId;
  readonly transactionDigest: string;
  readonly deployedAt: string;
  readonly contractName: string;
  readonly sourceVersionTag?: unknown;
  readonly builderToolchainVersion?: unknown;
}

/**
 * Loads the persisted deployment state when storage contains a valid version 1 snapshot.
 */
export function loadDeploymentState(storage: Storage | undefined): StoredDeploymentState | null {
  const rawValue = storage?.getItem(DEPLOYMENT_STATE_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  try {
    return parseStoredDeploymentState(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

/**
 * Persists the latest successful deployment snapshot to local storage.
 */
export function saveDeploymentState(storage: Storage | undefined, state: StoredDeploymentState): void {
  storage?.setItem(DEPLOYMENT_STATE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Removes the current persisted deployment snapshot.
 */
export function clearDeploymentState(storage: Storage | undefined): void {
  storage?.removeItem(DEPLOYMENT_STATE_STORAGE_KEY);
}

/**
 * Validates a stored deployment snapshot against the active contract and selected target.
 */
export function validateDeploymentState(
  state: StoredDeploymentState,
  context: DeploymentStateValidationContext,
): boolean {
  if (state.targetId !== context.targetId) {
    return false;
  }

  if (context.contractName !== null && sanitizeContractName(state.contractName) !== sanitizeContractName(context.contractName)) {
    return false;
  }

  if (context.moduleName !== undefined && state.moduleName !== context.moduleName) {
    return false;
  }

  return true;
}

/**
 * Reads the active contract name directly from the persisted contract library when available.
 */
export function loadActiveContractName(storage: Storage | undefined): string | null {
  const rawValue = storage?.getItem(CONTRACT_LIBRARY_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isRecord(parsedValue) || typeof parsedValue.activeContractName !== "string") {
      return null;
    }

    return sanitizeContractName(parsedValue.activeContractName);
  } catch {
    return null;
  }
}

function hasRequiredStoredDeploymentStateFields(value: Record<string, unknown>): value is Record<string, unknown> & StoredDeploymentStateFields {
  return typeof value.packageId === "string"
    && typeof value.moduleName === "string"
    && isDeploymentTargetId(value.targetId)
    && typeof value.transactionDigest === "string"
    && typeof value.deployedAt === "string"
    && typeof value.contractName === "string";
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseStoredDeploymentState(value: unknown): StoredDeploymentState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== 1) {
    return null;
  }

  if (!hasRequiredStoredDeploymentStateFields(value)) {
    return null;
  }

  return {
    version: 1,
    packageId: value.packageId,
    moduleName: value.moduleName,
    targetId: value.targetId,
    transactionDigest: value.transactionDigest,
    deployedAt: value.deployedAt,
    contractName: sanitizeContractName(value.contractName),
    sourceVersionTag: optionalString(value.sourceVersionTag),
    builderToolchainVersion: optionalString(value.builderToolchainVersion),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDeploymentTargetId(value: unknown): value is DeploymentTargetId {
  return value === "local" || value === "testnet:stillness" || value === "testnet:utopia";
}