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

export interface AuthorizationTarget {
  readonly turretObjectId: string;
  readonly ownerCapId: string;
  readonly status: AuthorizationTurretStatus;
  readonly transactionDigest: string | null;
  readonly errorMessage: string | null;
}

export type { DeploymentTargetId } from "../compiler/types";