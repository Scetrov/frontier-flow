import type { DeploymentStage, DeploymentTargetId, PackageReferenceBundle } from "../compiler/types";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { getPackageReferenceBundle } from "../data/packageReferences";

export type DeploymentBlockerCode =
  | "stale-artifact"
  | "missing-bytecode"
  | "artifact-graph-mismatch"
  | "wallet-required"
  | "invalid-package-references"
  | "local-target-unavailable";

export interface DeploymentBlocker {
  readonly code: DeploymentBlockerCode;
  readonly stage: DeploymentStage;
  readonly message: string;
  readonly remediation: string;
}

export interface DeploymentValidationResult {
  readonly blockers: readonly DeploymentBlocker[];
  readonly requiredInputs: readonly string[];
  readonly resolvedInputs: readonly string[];
}

export interface DeploymentEnvironmentFlags {
  readonly mockWallet: "connected" | "disconnected" | "none" | null;
  readonly invalidatePackageReferences: boolean;
  readonly localTargetReady: boolean;
  readonly failSubmission: boolean;
  readonly rejectApproval: boolean;
  readonly unresolvedConfirmation: boolean;
  readonly deployStageDelayMs: number;
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

function parseMockWallet(params: URLSearchParams | null): DeploymentEnvironmentFlags["mockWallet"] {
  const mockWallet = params?.get("ff_mock_wallet");

  return mockWallet === "connected" || mockWallet === "disconnected" || mockWallet === "none"
    ? mockWallet
    : null;
}

function parseStageDelay(params: URLSearchParams | null): number {
  const stageDelayValue = Number(params?.get("ff_mock_deploy_stage_delay_ms") ?? "160");
  return Number.isFinite(stageDelayValue) && stageDelayValue >= 0 ? stageDelayValue : 160;
}

export function getDeploymentEnvironmentFlags(search?: string): DeploymentEnvironmentFlags {
  const params = getSearchParams(search);

  return {
    mockWallet: parseMockWallet(params),
    invalidatePackageReferences: params?.get("ff_mock_invalid_package_refs") === "1",
    localTargetReady: params?.get("ff_local_deploy_ready") !== "0",
    failSubmission: params?.get("ff_mock_deploy_fail") === "1",
    rejectApproval: params?.get("ff_mock_deploy_reject") === "1",
    unresolvedConfirmation: params?.get("ff_mock_deploy_unresolved") === "1",
    deployStageDelayMs: parseStageDelay(params),
  };
}

export function isPublishedPackageReferenceId(value: string): boolean {
  return /^0x[a-f0-9]+$/i.test(value);
}

export function validatePackageReferenceBundle(
  targetId: Exclude<DeploymentTargetId, "local">,
  bundle: PackageReferenceBundle | null,
  search?: string,
): DeploymentBlocker | null {
  const flags = getDeploymentEnvironmentFlags(search);
  const target = getDeploymentTarget(targetId);

  if (flags.invalidatePackageReferences) {
    return {
      code: "invalid-package-references",
      stage: "validating",
      message: `Published package references for ${target.label} are invalid or unavailable.`,
      remediation: "Refresh the maintained Stillness/Utopia resource data before retrying deployment.",
    };
  }

  if (
    bundle === null
    || !isPublishedPackageReferenceId(bundle.worldPackageId)
    || !isPublishedPackageReferenceId(bundle.objectRegistryId)
    || !isPublishedPackageReferenceId(bundle.serverAddressRegistryId)
  ) {
    return {
      code: "invalid-package-references",
      stage: "validating",
      message: `Published package references for ${target.label} are invalid or unavailable.`,
      remediation: "Refresh the maintained Stillness/Utopia resource data before retrying deployment.",
    };
  }

  return null;
}

export function resolvePackageReferenceBundle(
  targetId: Exclude<DeploymentTargetId, "local">,
): PackageReferenceBundle | null {
  try {
    return getPackageReferenceBundle(targetId);
  } catch {
    return null;
  }
}

function createArtifactBlockers(input: {
  readonly artifactReady: boolean;
  readonly artifactHasBytecode: boolean;
  readonly artifactGraphMatchesCurrentRevision: boolean;
}): readonly DeploymentBlocker[] {
  if (!input.artifactReady) {
    return [{
      code: "stale-artifact",
      stage: "validating",
      message: "Rebuild the current graph before deployment. The active artifact is stale or unresolved.",
      remediation: "Run Build again after the current graph settles, then retry deployment.",
    }];
  }

  if (!input.artifactHasBytecode) {
    return [{
      code: "missing-bytecode",
      stage: "validating",
      message: "A compiled bytecode artifact is required before deployment can continue.",
      remediation: "Compile the generated package successfully so deployable bytecode is available.",
    }];
  }

  if (!input.artifactGraphMatchesCurrentRevision) {
    return [{
      code: "artifact-graph-mismatch",
      stage: "validating",
      message: "The compiled artifact no longer matches the current graph revision.",
      remediation: "Rebuild the current graph so deployment stays bound to the artifact you intend to publish.",
    }];
  }

  return [];
}

function createWalletBlockers(input: {
  readonly hasAvailableWallets: boolean;
  readonly hasConnectedWallet: boolean;
  readonly targetLabel: string;
  readonly targetSupportsWalletSigning: boolean;
}): readonly DeploymentBlocker[] {
  if (!input.targetSupportsWalletSigning || input.hasConnectedWallet) {
    return [];
  }

  return [{
    code: "wallet-required",
    stage: "validating",
    message: input.hasAvailableWallets
      ? `Connect a Sui-compatible wallet before deploying to ${input.targetLabel}.`
      : `No compatible Sui wallet was detected before deploying to ${input.targetLabel}.`,
    remediation: input.hasAvailableWallets
      ? "Connect and approve the target wallet, then retry deployment."
      : "Unlock or refresh a wallet that supports the Sui Wallet Standard, then connect it and retry deployment.",
  }];
}

function createPackageReferenceBlockers(input: {
  readonly search?: string;
  readonly targetId: DeploymentTargetId;
  readonly targetRequiresPublishedPackageRefs: boolean;
}): readonly DeploymentBlocker[] {
  if (!input.targetRequiresPublishedPackageRefs) {
    return [];
  }

  const publishedTargetId = input.targetId as Exclude<DeploymentTargetId, "local">;
  const bundle = resolvePackageReferenceBundle(publishedTargetId);
  const packageReferenceBlocker = validatePackageReferenceBundle(publishedTargetId, bundle, input.search);

  return packageReferenceBlocker === null ? [] : [packageReferenceBlocker];
}

function createLocalTargetBlockers(input: {
  readonly localTargetReady: boolean;
  readonly targetId: DeploymentTargetId;
}): readonly DeploymentBlocker[] {
  if (input.targetId !== "local" || input.localTargetReady) {
    return [];
  }

  return [{
    code: "local-target-unavailable",
    stage: "validating",
    message: "Local deployment is unavailable.",
    remediation: "Start or configure the local deployment target before retrying.",
  }];
}

function getRequiredInputs(targetId: DeploymentTargetId, targetSupportsWalletSigning: boolean, targetRequiresPublishedPackageRefs: boolean): string[] {
  const requiredInputs = ["compiled bytecode artifact"];

  if (targetSupportsWalletSigning) {
    requiredInputs.push("connected wallet");
  }

  if (targetRequiresPublishedPackageRefs) {
    requiredInputs.push("published package references");
  }

  if (targetId === "local") {
    requiredInputs.push("local deployment target");
  }

  return requiredInputs;
}

function getResolvedInputs(input: {
  readonly artifactReady: boolean;
  readonly hasConnectedWallet: boolean;
  readonly localTargetReady: boolean;
  readonly targetId: DeploymentTargetId;
  readonly targetRequiresPublishedPackageRefs: boolean;
  readonly targetSupportsWalletSigning: boolean;
}, blockers: readonly DeploymentBlocker[]): string[] {
  const blockerCodes = new Set(blockers.map((blocker) => blocker.code));
  const resolvedInputs: Array<{ readonly input: string; readonly resolved: boolean }> = [
    {
      input: "compiled bytecode artifact",
      resolved: input.artifactReady && !blockerCodes.has("missing-bytecode"),
    },
    {
      input: "connected wallet",
      resolved: input.targetSupportsWalletSigning && input.hasConnectedWallet && !blockerCodes.has("wallet-required"),
    },
    {
      input: "published package references",
      resolved: input.targetRequiresPublishedPackageRefs && !blockerCodes.has("invalid-package-references"),
    },
    {
      input: "local deployment target",
      resolved: input.targetId === "local" && input.localTargetReady && !blockerCodes.has("local-target-unavailable"),
    },
  ];

  return resolvedInputs.filter((entry) => entry.resolved).map((entry) => entry.input);
}

function collectDeploymentBlockers(input: {
  readonly artifactHasBytecode: boolean;
  readonly artifactReady: boolean;
  readonly artifactGraphMatchesCurrentRevision: boolean;
  readonly hasAvailableWallets: boolean;
  readonly hasConnectedWallet: boolean;
  readonly localTargetReady: boolean;
  readonly search?: string;
  readonly targetId: DeploymentTargetId;
  readonly targetLabel: string;
  readonly targetRequiresPublishedPackageRefs: boolean;
  readonly targetSupportsWalletSigning: boolean;
}): readonly DeploymentBlocker[] {
  return [
    ...createArtifactBlockers(input),
    ...createWalletBlockers({
      hasAvailableWallets: input.hasAvailableWallets,
      hasConnectedWallet: input.hasConnectedWallet,
      targetLabel: input.targetLabel,
      targetSupportsWalletSigning: input.targetSupportsWalletSigning,
    }),
    ...createPackageReferenceBlockers({
      search: input.search,
      targetId: input.targetId,
      targetRequiresPublishedPackageRefs: input.targetRequiresPublishedPackageRefs,
    }),
    ...createLocalTargetBlockers({
      localTargetReady: input.localTargetReady,
      targetId: input.targetId,
    }),
  ];
}

export function createDeploymentValidationResult(input: {
  readonly artifactReady: boolean;
  readonly artifactHasBytecode: boolean;
  readonly artifactGraphMatchesCurrentRevision?: boolean;
  readonly hasConnectedWallet: boolean;
  readonly hasAvailableWallets: boolean;
  readonly search?: string;
  readonly targetId: DeploymentTargetId;
}): DeploymentValidationResult {
  const target = getDeploymentTarget(input.targetId);
  const flags = getDeploymentEnvironmentFlags(input.search);
  const blockers = collectDeploymentBlockers({
    artifactHasBytecode: input.artifactHasBytecode,
    artifactReady: input.artifactReady,
    artifactGraphMatchesCurrentRevision: input.artifactGraphMatchesCurrentRevision ?? true,
    hasAvailableWallets: input.hasAvailableWallets,
    hasConnectedWallet: input.hasConnectedWallet,
    localTargetReady: flags.localTargetReady,
    search: input.search,
    targetId: input.targetId,
    targetLabel: target.label,
    targetRequiresPublishedPackageRefs: target.requiresPublishedPackageRefs,
    targetSupportsWalletSigning: target.supportsWalletSigning,
  });
  const requiredInputs = getRequiredInputs(input.targetId, target.supportsWalletSigning, target.requiresPublishedPackageRefs);
  const resolvedInputs = getResolvedInputs({
    artifactReady: input.artifactReady,
    hasConnectedWallet: input.hasConnectedWallet,
    localTargetReady: flags.localTargetReady,
    targetId: input.targetId,
    targetRequiresPublishedPackageRefs: target.requiresPublishedPackageRefs,
    targetSupportsWalletSigning: target.supportsWalletSigning,
  }, blockers);

  return {
    blockers,
    requiredInputs,
    resolvedInputs,
  };
}