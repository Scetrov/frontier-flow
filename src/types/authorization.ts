import type { DeploymentTargetId } from "../compiler/types";

export const AUTHORIZATION_CONFIRMATION_TIMEOUT_MS = 30_000;

export interface StoredDeploymentState {
  readonly version: 1;
  readonly packageId: string;
  readonly moduleName: string;
  readonly targetId: DeploymentTargetId;
  readonly transactionDigest: string;
  readonly deployedAt: string;
  readonly contractName: string;
  readonly sourceVersionTag?: string;
  readonly builderToolchainVersion?: string;
}

export interface AuthorizationBatchSummary {
  readonly confirmed: number;
  readonly failed: number;
  readonly pending: number;
  readonly warnings: number;
  readonly total: number;
}

export interface AuthorizationBatchResult {
  readonly turretObjectId: string;
  readonly status: AuthorizationTurretStatus;
  readonly transactionDigest: string | null;
  readonly errorMessage: string | null;
}

export interface TurretExtensionInfo {
  readonly packageId: string;
  readonly moduleName: string;
  readonly typeName: string;
  readonly isCurrentDeployment: boolean;
}

export interface TurretInfo {
  readonly objectId: string;
  readonly displayName: string | null;
  readonly currentExtension: TurretExtensionInfo | null;
}

export type AuthorizationTurretStatus = "pending" | "submitting" | "confirming" | "confirmed" | "failed" | "warning";
export type AuthorizationConfirmationPhase = "transaction" | "event";

export interface AuthorizationTarget {
  readonly turretObjectId: string;
  readonly ownerCapId: string;
  readonly status: AuthorizationTurretStatus;
  readonly confirmationPhase: AuthorizationConfirmationPhase | null;
  readonly transactionDigest: string | null;
  readonly errorMessage: string | null;
}

export interface AuthorizationProgressState {
  readonly targetId: DeploymentTargetId;
  readonly targets: readonly AuthorizationTarget[];
  readonly activeTurretObjectId: string | null;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly dismissedByUser: boolean;
  readonly walletDisconnected: boolean;
}

export type { DeploymentTargetId } from "../compiler/types";