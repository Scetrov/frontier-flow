import type {
  DeploymentAttemptOutcome,
  DeployGradeCompileResult,
  DeploymentStage,
  DeploymentTarget,
  FetchWorldSourceResult,
  GeneratedContractArtifact,
  PackageReferenceBundle,
} from "../compiler/types";
import { compileForDeployment } from "../compiler/deployGradeCompiler";
import { fetchWorldSource } from "./worldSourceFetcher";
import { confirmPublishedPackage, type DeploymentConfirmationRequest, type DeploymentConfirmationResult } from "./confirmation";
import { publishToLocalValidator, type LocalPublishResult } from "./publishLocal";
import { publishToRemoteTarget, type RemotePublishExecutionRequest, type RemotePublishResult } from "./publishRemote";

export interface DeploymentExecutionRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly ownerAddress?: string;
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
  readonly sourceVersionTag?: string;
  readonly builderToolchainVersion?: string;
  readonly message: string;
  readonly errorCode?: string;
}

export interface DeploymentExecutorDependencies {
  readonly compileForDeployment: (request: {
    readonly artifact: GeneratedContractArtifact;
    readonly references: PackageReferenceBundle;
    readonly worldSource: FetchWorldSourceResult;
    readonly signal?: AbortSignal;
    readonly onProgress?: (message: string, stage: DeploymentStage) => void;
  }) => Promise<DeployGradeCompileResult>;
  readonly confirm: (request: DeploymentConfirmationRequest) => Promise<DeploymentConfirmationResult>;
  readonly fetchWorldSource: (request: {
    readonly references: PackageReferenceBundle;
    readonly signal?: AbortSignal;
  }) => ReturnType<typeof fetchWorldSource>;
  readonly publishLocal: (request: {
    readonly artifact: GeneratedContractArtifact;
    readonly target: DeploymentTarget;
    readonly references: PackageReferenceBundle | null;
    readonly signal?: AbortSignal;
  }) => Promise<LocalPublishResult>;
  readonly publishRemote: (request: {
    readonly artifact?: GeneratedContractArtifact;
    readonly compileResult?: DeployGradeCompileResult;
    readonly ownerAddress: string;
    readonly onSubmitting?: () => void;
    readonly target: DeploymentTarget;
    readonly references: PackageReferenceBundle;
    readonly execute: (transaction: import("@mysten/sui/transactions").Transaction, request?: RemotePublishExecutionRequest) => Promise<{ digest: string }>;
    readonly signal?: AbortSignal;
  }) => Promise<RemotePublishResult>;
}

const DEFAULT_EXECUTOR_DEPENDENCIES: DeploymentExecutorDependencies = {
  compileForDeployment: ({ artifact, references, worldSource, signal, onProgress }) => compileForDeployment({
    artifact,
    worldSource,
    target: references,
    signal,
    onProgress: (event) => {
      switch (event.phase) {
        case "fetching-source":
          onProgress?.("Fetching the upstream world package source.", "preparing");
          break;
        case "resolving-dependencies":
          onProgress?.(
            event.total > 0
              ? `Resolving live world dependencies (${String(event.current)}/${String(event.total)}).`
              : "Resolving live world dependencies.",
            "preparing",
          );
          break;
        case "compiling":
          onProgress?.("Compiling against the live world dependency graph.", "preparing");
          break;
        case "complete":
          onProgress?.("Deploy-grade compilation completed.", "preparing");
          break;
      }
    },
  }),
  confirm: (request) => confirmPublishedPackage(request, () => Promise.resolve(null)),
  fetchWorldSource: ({ references, signal }) => fetchWorldSource({
    repositoryUrl: "https://github.com/evefrontier/world-contracts",
    versionTag: references.sourceVersionTag,
    subdirectory: "contracts/world",
    signal,
  }),
  publishLocal: publishToLocalValidator,
  publishRemote: publishToRemoteTarget,
};

function sanitizeExecutionMessage(message: string): string {
  const sanitized = message
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]")
    .replace(/(authorization\s*:\s*)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:mnemonic|seed phrase|private key|secret key|api key|password)\s*[:=]\s*)([^,;\n]+)/gi, "$1[REDACTED]")
    .replace(/suiprivkey[a-zA-Z0-9]+/g, "[REDACTED_SUI_PRIVATE_KEY]")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.length > 0 ? sanitized : "Deployment failed unexpectedly.";
}

function classifyExecutionError(error: unknown, fallbackStage: DeploymentStage): DeploymentExecutionResult {
  const rawMessage = error instanceof Error ? error.message : "Deployment failed unexpectedly.";
  const message = sanitizeExecutionMessage(rawMessage);
  const normalizedMessage = rawMessage.toLowerCase();

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
    errorCode: fallbackStage === "confirming"
      ? "confirmation-failed"
      : fallbackStage === "resolve-dependencies"
        ? "resolution-failed"
        : fallbackStage === "deploy-grade-compile"
          ? "compile-failed"
          : "deployment-executor-error",
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
    let currentStage: DeploymentStage = "validating";

    try {
      onProgress?.({ message: "Validating deployment prerequisites.", stage: "validating" });
      currentStage = request.target.supportsWalletSigning ? "fetch-world-source" : "preparing";
      onProgress?.({
        message: request.target.supportsWalletSigning
          ? "Fetching the upstream world package source."
          : "Preparing deployment payload.",
        stage: currentStage,
      });

      const publishResult = await (async (): Promise<LocalPublishResult | RemotePublishResult | DeploymentExecutionResult> => {
        try {
          if (request.target.supportsWalletSigning) {
            const worldSource = await resolvedDependencies.fetchWorldSource({
              references: request.references as PackageReferenceBundle,
              signal: request.signal,
            });

            const compileResult = await resolvedDependencies.compileForDeployment({
              artifact: request.artifact,
              references: request.references as PackageReferenceBundle,
              worldSource,
              signal: request.signal,
              onProgress: (message, stage) => {
                currentStage = stage;
                onProgress?.({ message, stage });
              },
            });
            currentStage = "signing";
            onProgress?.({ message: "Waiting for wallet signing approval.", stage: "signing" });
            return await resolvedDependencies.publishRemote({
              compileResult: {
                ...compileResult,
                sourceVersionTag: worldSource.sourceVersionTag,
              },
              ownerAddress: request.ownerAddress ?? "",
              onSubmitting: () => {
                currentStage = "submitting";
                onProgress?.({ message: "Submitting deployment transaction.", stage: "submitting" });
              },
              target: request.target,
              references: request.references as PackageReferenceBundle,
              execute: () => Promise.reject(new Error("Remote publish execution dependency was not provided.")),
              signal: request.signal,
            });
          }

          currentStage = "submitting";
          onProgress?.({ message: "Submitting deployment transaction.", stage: "submitting" });
          return await resolvedDependencies.publishLocal({
            artifact: request.artifact,
            target: request.target,
            references: request.references,
            signal: request.signal,
          });
        } catch (error: unknown) {
          return classifyExecutionError(error, currentStage === "signing" ? "signing" : "submitting");
        }
      })();

      if ("outcome" in publishResult) {
        return publishResult;
      }

      const publishMetadata = {
        sourceVersionTag: "sourceVersionTag" in publishResult ? publishResult.sourceVersionTag : undefined,
        builderToolchainVersion: "builderToolchainVersion" in publishResult ? publishResult.builderToolchainVersion : undefined,
      };

      currentStage = "confirming";
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
          ...publishMetadata,
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
        ...publishMetadata,
        message: `Deployment completed for ${request.target.label}.`,
      };
    } catch (error: unknown) {
      return classifyExecutionError(error, currentStage);
    }
  };
}