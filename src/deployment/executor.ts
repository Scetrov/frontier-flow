import type {
  CachedDependencyResolution,
  DeploymentAttemptOutcome,
  DeployGradeCompileResult,
  DeploymentStage,
  DeploymentTarget,
  FetchWorldSourceResult,
  GeneratedContractArtifact,
  PackageReferenceBundle,
} from "../compiler/types";
import { compileForDeployment } from "../compiler/deployGradeCompiler";
import { usesDeployGradeCompilation, usesWalletSignedPublish } from "../data/deploymentTargets";
import { createWorldSourceFromCachedResolution, getProjectCachedDependencyResolution } from "./dependencySnapshotLoader";
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
    readonly cachedResolution?: CachedDependencyResolution;
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
  readonly loadCachedResolution: (request: {
    readonly references: PackageReferenceBundle;
  }) => Promise<CachedDependencyResolution | null>;
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

interface PublishStepContext {
  readonly request: DeploymentExecutionRequest;
  readonly dependencies: DeploymentExecutorDependencies;
  readonly setStage: (stage: DeploymentStage) => void;
  readonly getStage: () => DeploymentStage;
  readonly onProgress?: (progress: DeploymentExecutionProgress) => void;
}

const DEFAULT_EXECUTOR_DEPENDENCIES: DeploymentExecutorDependencies = {
  compileForDeployment: ({ artifact, cachedResolution, references, worldSource, signal, onProgress }) => compileForDeployment({
    artifact,
    cachedResolution,
    worldSource,
    target: references,
    signal,
    onProgress: (event) => {
      switch (event.phase) {
        case "fetching-source":
          onProgress?.("Fetching the upstream world package source.", "fetch-world-source");
          break;
        case "resolving-dependencies":
          onProgress?.(
            event.total > 0
              ? `Resolving live world dependencies (${String(event.current)}/${String(event.total)}).`
              : "Resolving live world dependencies.",
            "resolve-dependencies",
          );
          break;
        case "compiling":
          onProgress?.("Compiling against the live world dependency graph.", "deploy-grade-compile");
          break;
        case "complete":
          onProgress?.("Deploy-grade compilation completed.", "deploy-grade-compile");
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
  loadCachedResolution: ({ references }) => getProjectCachedDependencyResolution(references),
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

function reportProgress(
  onProgress: ((progress: DeploymentExecutionProgress) => void) | undefined,
  stage: DeploymentStage,
  message: string,
): void {
  onProgress?.({ message, stage });
}

function reportInitialProgress(
  request: DeploymentExecutionRequest,
  onProgress: ((progress: DeploymentExecutionProgress) => void) | undefined,
): DeploymentStage {
  reportProgress(onProgress, "validating", "Validating deployment prerequisites.");
  const nextStage = usesDeployGradeCompilation(request.target) ? "fetch-world-source" : "preparing";
  reportProgress(
    onProgress,
    nextStage,
    usesDeployGradeCompilation(request.target)
      ? "Fetching the upstream world package source."
      : "Preparing deployment payload.",
  );
  return nextStage;
}

async function compileDeployGradeArtifact(
  request: DeploymentExecutionRequest,
  dependencies: DeploymentExecutorDependencies,
  setStage: (stage: DeploymentStage) => void,
  onProgress?: (progress: DeploymentExecutionProgress) => void,
): Promise<{ readonly compileResult: DeployGradeCompileResult; readonly worldSource: FetchWorldSourceResult }> {
  const references = request.references as PackageReferenceBundle;
  const cachedResolution = await dependencies.loadCachedResolution({ references });
  const worldSource = cachedResolution === null
    ? await dependencies.fetchWorldSource({ references, signal: request.signal })
    : createWorldSourceFromCachedResolution(cachedResolution);

  const compileResult = await dependencies.compileForDeployment({
    artifact: request.artifact,
    cachedResolution: cachedResolution ?? undefined,
    references,
    worldSource,
    signal: request.signal,
    onProgress: (message, stage) => {
      setStage(stage);
      reportProgress(onProgress, stage, message);
    },
  });

  return { compileResult, worldSource };
}

function createDeployGradeLocalArtifact(
  artifact: GeneratedContractArtifact,
  compileResult: DeployGradeCompileResult,
): GeneratedContractArtifact {
  const sourceFiles = artifact.sourceFiles?.filter((file) => !file.path.startsWith("deps/world/"));

  return {
    ...artifact,
    sourceFiles,
    bytecodeModules: [...compileResult.modules],
    dependencies: [...compileResult.dependencies],
  };
}

function createPublishMetadata(publishResult: LocalPublishResult | RemotePublishResult) {
  return {
    sourceVersionTag: "sourceVersionTag" in publishResult ? publishResult.sourceVersionTag : undefined,
    builderToolchainVersion: "builderToolchainVersion" in publishResult ? publishResult.builderToolchainVersion : undefined,
  };
}

async function executeRemotePublish(
  request: DeploymentExecutionRequest,
  dependencies: DeploymentExecutorDependencies,
  setStage: (stage: DeploymentStage) => void,
  onProgress?: (progress: DeploymentExecutionProgress) => void,
): Promise<RemotePublishResult> {
  const references = request.references as PackageReferenceBundle;
  const { compileResult, worldSource } = await compileDeployGradeArtifact(request, dependencies, setStage, onProgress);

  setStage("signing");
  reportProgress(onProgress, "signing", "Waiting for wallet signing approval.");
  return dependencies.publishRemote({
    compileResult: {
      ...compileResult,
      sourceVersionTag: worldSource.sourceVersionTag,
    },
    ownerAddress: request.ownerAddress ?? "",
    onSubmitting: () => {
      setStage("submitting");
      reportProgress(onProgress, "submitting", "Submitting deployment transaction.");
    },
    target: request.target,
    references,
    execute: () => Promise.reject(new Error("Remote publish execution dependency was not provided.")),
    signal: request.signal,
  });
}

async function executeDeployGradeLocalPublish(
  request: DeploymentExecutionRequest,
  dependencies: DeploymentExecutorDependencies,
  setStage: (stage: DeploymentStage) => void,
  onProgress?: (progress: DeploymentExecutionProgress) => void,
): Promise<LocalPublishResult> {
  const { compileResult } = await compileDeployGradeArtifact(request, dependencies, setStage, onProgress);

  setStage("submitting");
  reportProgress(onProgress, "submitting", "Submitting deployment transaction.");
  return dependencies.publishLocal({
    artifact: createDeployGradeLocalArtifact(request.artifact, compileResult),
    target: request.target,
    references: request.references,
    signal: request.signal,
  });
}

async function executeLocalPublish(
  request: DeploymentExecutionRequest,
  dependencies: DeploymentExecutorDependencies,
  setStage: (stage: DeploymentStage) => void,
  onProgress?: (progress: DeploymentExecutionProgress) => void,
): Promise<LocalPublishResult> {
  setStage("submitting");
  reportProgress(onProgress, "submitting", "Submitting deployment transaction.");
  return dependencies.publishLocal({
    artifact: request.artifact,
    target: request.target,
    references: request.references,
    signal: request.signal,
  });
}

async function executePublishStep(
  context: PublishStepContext,
): Promise<LocalPublishResult | RemotePublishResult | DeploymentExecutionResult> {
  const { request, dependencies, setStage, getStage, onProgress } = context;
  try {
    if (usesDeployGradeCompilation(request.target)) {
      if (usesWalletSignedPublish(request.target)) {
        return await executeRemotePublish(request, dependencies, setStage, onProgress);
      }

      return await executeDeployGradeLocalPublish(request, dependencies, setStage, onProgress);
    }

    return await executeLocalPublish(request, dependencies, setStage, onProgress);
  } catch (error: unknown) {
    return classifyExecutionError(error, getStage());
  }
}

async function executeConfirmationStep(
  request: DeploymentExecutionRequest,
  publishResult: LocalPublishResult | RemotePublishResult,
  dependencies: DeploymentExecutorDependencies,
): Promise<DeploymentConfirmationResult | DeploymentExecutionResult> {
  try {
    return await dependencies.confirm({
      artifact: request.artifact,
      packageId: publishResult.packageId,
      target: request.target,
      transactionDigest: publishResult.transactionDigest,
      signal: request.signal,
    });
  } catch (error: unknown) {
    return classifyExecutionError(error, "confirming");
  }
}

function toConfirmationFailure(
  request: DeploymentExecutionRequest,
  confirmation: DeploymentConfirmationResult,
): DeploymentExecutionResult {
  return {
    outcome: "unresolved",
    packageId: confirmation.packageId,
    confirmationReference: confirmation.confirmationReference,
    stage: confirmation.finalStage,
    message: `Deployment submission for ${request.target.label} could not be confirmed within the verification window.`,
    errorCode: "confirmation-timeout",
  };
}

function toSuccessResult(
  request: DeploymentExecutionRequest,
  confirmation: DeploymentConfirmationResult,
  publishMetadata: { readonly sourceVersionTag?: string; readonly builderToolchainVersion?: string },
): DeploymentExecutionResult {
  return {
    outcome: "succeeded",
    packageId: confirmation.packageId,
    confirmationReference: confirmation.confirmationReference,
    stage: confirmation.finalStage,
    ...publishMetadata,
    message: `Deployment completed for ${request.target.label}.`,
  };
}

async function executeDeployment(
  request: DeploymentExecutionRequest,
  resolvedDependencies: DeploymentExecutorDependencies,
  onProgress?: (progress: DeploymentExecutionProgress) => void,
): Promise<DeploymentExecutionResult> {
  let currentStage: DeploymentStage = "validating";
  const setStage = (stage: DeploymentStage) => {
    currentStage = stage;
  };

  try {
    setStage(reportInitialProgress(request, onProgress));

    const publishResult = await executePublishStep({
      request,
      dependencies: resolvedDependencies,
      setStage,
      getStage: () => currentStage,
      onProgress,
    });
    if ("outcome" in publishResult) {
      return publishResult;
    }

    const publishMetadata = createPublishMetadata(publishResult);
    setStage("confirming");
    reportProgress(onProgress, "confirming", "Confirming deployment transaction.");

    const confirmation = await executeConfirmationStep(request, publishResult, resolvedDependencies);
    if ("outcome" in confirmation) {
      return {
        ...confirmation,
        packageId: publishResult.packageId,
        confirmationReference: publishResult.transactionDigest,
        ...publishMetadata,
      };
    }

    if (!confirmation.confirmed) {
      return toConfirmationFailure(request, confirmation);
    }

    return toSuccessResult(request, confirmation, publishMetadata);
  } catch (error: unknown) {
    return classifyExecutionError(error, currentStage);
  }
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

  return async (request, onProgress) => executeDeployment(request, resolvedDependencies, onProgress);
}