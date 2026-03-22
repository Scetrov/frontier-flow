import type {
  DeploymentAttemptOutcome,
  DeploymentStage,
  DeploymentTarget,
  GeneratedContractArtifact,
  PackageReferenceBundle,
} from "../compiler/types";
import { confirmPublishedPackage, type DeploymentConfirmationRequest, type DeploymentConfirmationResult } from "./confirmation";
import { publishToLocalValidator, type LocalPublishResult } from "./publishLocal";
import { publishToRemoteTarget, type RemotePublishResult } from "./publishRemote";

export interface DeploymentExecutionRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly references: PackageReferenceBundle | null;
  readonly target: DeploymentTarget;
  readonly signal?: AbortSignal;
}

export interface DeploymentExecutionProgress {
  readonly message: string;
  readonly stage: DeploymentStage;
}

export interface DeploymentExecutionResult {
  readonly outcome: DeploymentAttemptOutcome;
  readonly packageId?: string;
  readonly confirmationReference?: string;
  readonly stage: DeploymentStage;
  readonly message: string;
  readonly errorCode?: string;
}

export interface DeploymentExecutorDependencies {
  readonly confirm: (request: DeploymentConfirmationRequest) => Promise<DeploymentConfirmationResult>;
  readonly publishLocal: (request: {
    readonly artifact: GeneratedContractArtifact;
    readonly target: DeploymentTarget;
    readonly references: PackageReferenceBundle | null;
    readonly signal?: AbortSignal;
  }) => Promise<LocalPublishResult>;
  readonly publishRemote: (request: {
    readonly artifact: GeneratedContractArtifact;
    readonly target: DeploymentTarget;
    readonly references: PackageReferenceBundle;
    readonly execute: (transaction: import("@mysten/sui/transactions").Transaction, signal?: AbortSignal) => Promise<{ digest: string }>;
    readonly signal?: AbortSignal;
  }) => Promise<RemotePublishResult>;
}

const DEFAULT_EXECUTOR_DEPENDENCIES: DeploymentExecutorDependencies = {
  confirm: async (request) => confirmPublishedPackage(request, async () => null),
  publishLocal: publishToLocalValidator,
  publishRemote: publishToRemoteTarget,
};

function classifyExecutionError(error: unknown, fallbackStage: DeploymentStage): DeploymentExecutionResult {
  const message = error instanceof Error ? error.message : "Deployment failed unexpectedly.";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("rejected") || normalizedMessage.includes("denied") || normalizedMessage.includes("cancelled")) {
    return {
      outcome: "cancelled",
      stage: "signing",
      message,
      errorCode: "wallet-approval-rejected",
    };
  }

  if (normalizedMessage.includes("confirm") && normalizedMessage.includes("timeout")) {
    return {
      outcome: "unresolved",
      stage: "confirming",
      message,
      errorCode: "confirmation-timeout",
    };
  }

  return {
    outcome: "failed",
    stage: fallbackStage,
    message,
    errorCode: fallbackStage === "confirming" ? "confirmation-failed" : "deployment-executor-error",
  };
}

/**
 * Create a typed deployment executor that isolates publish and confirmation mechanics.
 */
export function createDeploymentExecutor(
  dependencies: Partial<DeploymentExecutorDependencies> = {},
): (request: DeploymentExecutionRequest, onProgress?: (progress: DeploymentExecutionProgress) => void) => Promise<DeploymentExecutionResult> {
  const resolvedDependencies: DeploymentExecutorDependencies = {
    ...DEFAULT_EXECUTOR_DEPENDENCIES,
    ...dependencies,
  };

  return async (request, onProgress) => {
    onProgress?.({ message: "Validating deployment prerequisites.", stage: "validating" });
    onProgress?.({ message: "Preparing deployment payload.", stage: "preparing" });

    const publishResult = await (async (): Promise<LocalPublishResult | RemotePublishResult | DeploymentExecutionResult> => {
      try {
        if (request.target.supportsWalletSigning) {
          onProgress?.({ message: "Waiting for wallet signing approval.", stage: "signing" });
          onProgress?.({ message: "Submitting deployment transaction.", stage: "submitting" });
          return await resolvedDependencies.publishRemote({
            artifact: request.artifact,
            target: request.target,
            references: request.references as PackageReferenceBundle,
            execute: async () => {
              throw new Error("Remote publish execution dependency was not provided.");
            },
            signal: request.signal,
          });
        }

        onProgress?.({ message: "Submitting deployment transaction.", stage: "submitting" });
        return await resolvedDependencies.publishLocal({
          artifact: request.artifact,
          target: request.target,
          references: request.references,
          signal: request.signal,
        });
      } catch (error: unknown) {
        return classifyExecutionError(error, "submitting");
      }
    })();

    if ("outcome" in publishResult) {
      return publishResult;
    }

    onProgress?.({ message: "Confirming deployment transaction.", stage: "confirming" });

    const confirmation = await (async (): Promise<DeploymentConfirmationResult | DeploymentExecutionResult> => {
      try {
        return await resolvedDependencies.confirm({
          artifact: request.artifact,
          packageId: publishResult.packageId,
          target: request.target,
          transactionDigest: publishResult.transactionDigest,
          signal: request.signal,
        });
      } catch (error: unknown) {
        return classifyExecutionError(error, "confirming");
      }
    })();

    if ("outcome" in confirmation) {
      return {
        ...confirmation,
        packageId: publishResult.packageId,
        confirmationReference: publishResult.transactionDigest,
      };
    }

    if (!confirmation.confirmed) {
      return {
        outcome: "unresolved",
        packageId: confirmation.packageId,
        confirmationReference: confirmation.confirmationReference,
        stage: confirmation.finalStage,
        message: `Deployment submission for ${request.target.label} could not be confirmed within the verification window.`,
        errorCode: "confirmation-timeout",
      };
    }

    return {
      outcome: "succeeded",
      packageId: confirmation.packageId,
      confirmationReference: confirmation.confirmationReference,
      stage: confirmation.finalStage,
      message: `Deployment completed for ${request.target.label}.`,
    };
  };
}