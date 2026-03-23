import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCurrentAccount, useCurrentWallet, useSuiClient, useWallets } from "@mysten/dapp-kit";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { signTransaction } from "@mysten/wallet-standard";

import type {
  CompilationStatus,
  DeploymentAttempt,
  DeploymentProgress,
  DeploymentReviewEntry,
  DeploymentStage,
  DeploymentState,
  DeploymentStatus,
  DeploymentStatusMessage,
  DeploymentTargetId,
  GeneratedContractArtifact,
} from "../compiler/types";
import { DEFAULT_DEPLOYMENT_TARGET, getDeploymentTarget } from "../data/deploymentTargets";
import { resolvePackageReferenceBundle } from "../utils/deploymentValidation";
import { confirmPublishedPackageWithClient } from "../deployment/confirmation";
import { createDeploymentExecutor, type DeploymentExecutionResult } from "../deployment/executor";
import { publishToRemoteTarget } from "../deployment/publishRemote";
import {
  createDeploymentValidationResult,
  getDeploymentEnvironmentFlags,
  type DeploymentValidationResult,
} from "../utils/deploymentValidation";
import { clearDeploymentState, loadActiveContractName, saveDeploymentState } from "../utils/deploymentStateStorage";
import type { StoredDeploymentState } from "../types/authorization";

interface UseDeploymentOptions {
  readonly initialTarget?: DeploymentTargetId;
  readonly status: CompilationStatus;
}

const DEPLOYMENT_STAGE_SEQUENCE: readonly DeploymentStage[] = [
  "validating",
  "preparing",
  "signing",
  "submitting",
  "confirming",
];

const ACTIVE_STAGE_MESSAGE: Record<DeploymentStage, string> = {
  validating: "Validating deployment prerequisites.",
  preparing: "Preparing deployment payload.",
  signing: "Waiting for wallet signing approval.",
  submitting: "Submitting deployment transaction.",
  confirming: "Confirming deployment transaction.",
};

function getArtifactFromStatus(status: CompilationStatus): GeneratedContractArtifact | null {
  return status.state === "compiled" || status.state === "error"
    ? status.artifact ?? null
    : null;
}

function createAttemptId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `attempt-${Date.now().toString(36)}`;
}

function createPackageId(artifactId: string, targetId: DeploymentTargetId): string {
  const encoded = new TextEncoder().encode(`${targetId}:${artifactId}`);
  const hex = Array.from(encoded, (value) => value.toString(16).padStart(2, "0")).join("");
  return `0x${hex.slice(0, 64).padEnd(64, "0")}`;
}

function createConfirmationReference(artifactId: string, targetId: DeploymentTargetId): string {
  const encoded = new TextEncoder().encode(`confirmation:${targetId}:${artifactId}`);
  const hex = Array.from(encoded, (value) => value.toString(16).padStart(2, "0")).join("");
  return `0x${hex.slice(0, 64).padEnd(64, "0")}`;
}

function useWalletReadiness(): {
  readonly hasAvailableWallets: boolean;
  readonly hasConnectedWallet: boolean;
} {
  const account = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const wallets = useWallets();
  const flags = getDeploymentEnvironmentFlags();

  if (flags.mockWallet === "none") {
    return { hasAvailableWallets: false, hasConnectedWallet: false };
  }

  if (flags.mockWallet === "disconnected") {
    return { hasAvailableWallets: true, hasConnectedWallet: false };
  }

  if (flags.mockWallet === "connected") {
    return { hasAvailableWallets: true, hasConnectedWallet: true };
  }

  return {
    hasAvailableWallets: wallets.length > 0,
    hasConnectedWallet: account !== null && currentWallet.isConnected,
  };
}

function shouldUseMockDeployment(flags: ReturnType<typeof getDeploymentEnvironmentFlags>): boolean {
  return flags.mockWallet !== null
    || flags.invalidatePackageReferences
    || !flags.localTargetReady
    || flags.failSubmission
    || flags.rejectApproval
    || flags.unresolvedConfirmation
    || flags.deployStageDelayMs !== 160;
}

function toDeploymentStatus(
  attempt: DeploymentAttempt,
  statusMessage: DeploymentStatusMessage,
  validation: DeploymentValidationResult,
  reviewHistory: readonly DeploymentReviewEntry[],
): DeploymentStatus {
  const statusValue = attempt.outcome === "succeeded" ? "deployed" : "blocked";

  return {
    artifactId: attempt.artifactId,
    status: statusValue,
    outcome: attempt.outcome,
    targetId: attempt.targetId,
    packageId: attempt.packageId,
    confirmationReference: attempt.confirmationReference,
    stage: attempt.currentStage,
    severity: statusMessage.severity,
    headline: statusMessage.headline,
    targetMode: "existing-turret",
    requiredInputs: validation.requiredInputs,
    resolvedInputs: statusValue === "deployed"
      ? [...validation.requiredInputs, "deployment package id"]
      : validation.resolvedInputs,
    blockedReasons: statusValue === "blocked"
      ? validation.blockers.map((blocker) => blocker.message).concat(attempt.outcome === "cancelled" ? [attempt.message] : [])
      : [],
    nextActionSummary: statusMessage.details,
    reviewHistory,
  };
}

function createReviewEntry(
  attempt: DeploymentAttempt,
  statusMessage: DeploymentStatusMessage,
  validation: DeploymentValidationResult,
): DeploymentReviewEntry {
  return {
    attemptId: attempt.attemptId,
    artifactId: attempt.artifactId,
    headline: statusMessage.headline,
    targetId: attempt.targetId,
    outcome: attempt.outcome,
    severity: statusMessage.severity,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt,
    stage: attempt.currentStage,
    packageId: attempt.packageId,
    confirmationReference: attempt.confirmationReference,
    details: statusMessage.details,
    blockedReasons: validation.blockers.length > 0
      ? validation.blockers.map((blocker) => blocker.message).concat(attempt.outcome === "cancelled" ? [attempt.message] : [])
      : attempt.outcome === "cancelled"
        ? [attempt.message]
        : [],
  };
}

function createProgressSnapshot(
  current: DeploymentProgress | null,
  input: {
    readonly activeMessage: string;
    readonly attemptId: string;
    readonly completedStages: readonly DeploymentStage[];
    readonly stage: DeploymentStage;
    readonly stageCount: number;
    readonly stageIndex: number;
    readonly targetId: DeploymentTargetId;
  },
): DeploymentProgress {
  const dismissedByUser = current?.attemptId === input.attemptId
    ? current.dismissedByUser
    : false;

  return {
    attemptId: input.attemptId,
    targetId: input.targetId,
    stage: input.stage,
    stageIndex: input.stageIndex,
    stageCount: input.stageCount,
    completedStages: input.completedStages,
    activeMessage: input.activeMessage,
    dismissedByUser,
  };
}

function getStageMessage(stage: DeploymentStage, targetLabel: string): string {
  switch (stage) {
    case "validating":
      return `${ACTIVE_STAGE_MESSAGE.validating} Target: ${targetLabel}.`;
    case "preparing":
      return `${ACTIVE_STAGE_MESSAGE.preparing} Target: ${targetLabel}.`;
    case "signing":
      return `${ACTIVE_STAGE_MESSAGE.signing} Target: ${targetLabel}.`;
    case "submitting":
      return `${ACTIVE_STAGE_MESSAGE.submitting} Target: ${targetLabel}.`;
    case "confirming":
      return `${ACTIVE_STAGE_MESSAGE.confirming} Target: ${targetLabel}.`;
  }
}

type ReviewHistorySetter = Dispatch<SetStateAction<readonly DeploymentReviewEntry[]>>;
type TimerIdsRef = RefObject<number[]>;
type LocalChainIdRef = RefObject<string | null>;

const LOCAL_HISTORY_RESET_REASON = "Local validator state changed after this attempt. Re-verify this evidence before relying on it.";

interface DeploymentStateSetters {
  readonly setDeploymentStatus: Dispatch<SetStateAction<DeploymentStatus | null>>;
  readonly setIsDeploying: Dispatch<SetStateAction<boolean>>;
  readonly setLatestAttempt: Dispatch<SetStateAction<DeploymentAttempt | null>>;
  readonly setProgress: Dispatch<SetStateAction<DeploymentProgress | null>>;
  readonly setReviewHistory: ReviewHistorySetter;
  readonly setStatusMessage: Dispatch<SetStateAction<DeploymentStatusMessage | null>>;
}

interface DeploymentOutcomeSetters extends DeploymentStateSetters {
  readonly localChainIdRef: LocalChainIdRef;
}

interface DeploymentOutcome {
  readonly attempt: DeploymentAttempt;
  readonly progress: DeploymentProgress;
  readonly statusMessage: DeploymentStatusMessage;
}

interface DeploymentProgressUpdate {
  readonly attemptId: string;
  readonly stage: DeploymentStage;
  readonly stageIndex: number;
  readonly targetId: DeploymentTargetId;
  readonly targetLabel: string;
}

interface DeploymentDerivedState {
  readonly blockerReasons: readonly string[];
  readonly canDeploy: boolean;
  readonly isProgressModalOpen: boolean;
  readonly validation: DeploymentValidationResult;
}

interface DeploymentStore {
  readonly deploymentStatus: DeploymentStatus | null;
  readonly isDeploying: boolean;
  readonly localChainIdRef: LocalChainIdRef;
  readonly latestAttempt: DeploymentAttempt | null;
  readonly progress: DeploymentProgress | null;
  readonly selectedTarget: DeploymentTargetId;
  readonly setDeploymentStatus: Dispatch<SetStateAction<DeploymentStatus | null>>;
  readonly setIsDeploying: Dispatch<SetStateAction<boolean>>;
  readonly setLatestAttempt: Dispatch<SetStateAction<DeploymentAttempt | null>>;
  readonly setProgress: Dispatch<SetStateAction<DeploymentProgress | null>>;
  readonly setReviewHistory: ReviewHistorySetter;
  readonly setSelectedTarget: Dispatch<SetStateAction<DeploymentTargetId>>;
  readonly setStatusMessage: Dispatch<SetStateAction<DeploymentStatusMessage | null>>;
  readonly stateSetters: DeploymentStateSetters;
  readonly statusMessage: DeploymentStatusMessage | null;
  readonly timerIdsRef: TimerIdsRef;
}

function getIsProgressModalOpen(progress: DeploymentProgress | null): boolean {
  return progress !== null
    && !progress.dismissedByUser;
}

function getDeploymentValidation(
  status: CompilationStatus,
  walletReadiness: ReturnType<typeof useWalletReadiness>,
  selectedTarget: DeploymentTargetId,
): DeploymentValidationResult {
  const artifact = getArtifactFromStatus(status);

  return createDeploymentValidationResult({
    artifactReady: status.state === "compiled" && artifact !== null,
    artifactHasBytecode: (artifact?.bytecodeModules.length ?? 0) > 0,
    artifactGraphMatchesCurrentRevision: true,
    hasAvailableWallets: walletReadiness.hasAvailableWallets,
    hasConnectedWallet: walletReadiness.hasConnectedWallet,
    targetId: selectedTarget,
  });
}

function useDeploymentStore(initialTarget: DeploymentTargetId): DeploymentStore {
  const [selectedTarget, setSelectedTarget] = useState<DeploymentTargetId>(initialTarget);
  const [latestAttempt, setLatestAttempt] = useState<DeploymentAttempt | null>(null);
  const [, setReviewHistory] = useState<readonly DeploymentReviewEntry[]>([]);
  const [progress, setProgress] = useState<DeploymentProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<DeploymentStatusMessage | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const timerIdsRef = useRef<number[]>([]);
  const localChainIdRef = useRef<string | null>(null);
  const stateSetters = useMemo<DeploymentStateSetters>(() => ({
    setDeploymentStatus,
    setIsDeploying,
    setLatestAttempt,
    setProgress,
    setReviewHistory,
    setStatusMessage,
  }), []);

  return {
    deploymentStatus,
    isDeploying,
    localChainIdRef,
    latestAttempt,
    progress,
    selectedTarget,
    setDeploymentStatus,
    setIsDeploying,
    setLatestAttempt,
    setProgress,
    setReviewHistory,
    setSelectedTarget,
    setStatusMessage,
    stateSetters,
    statusMessage,
    timerIdsRef,
  };
}

function useDeploymentDerivedState(input: {
  readonly progress: DeploymentProgress | null;
  readonly selectedTarget: DeploymentTargetId;
  readonly status: CompilationStatus;
  readonly walletReadiness: ReturnType<typeof useWalletReadiness>;
}): DeploymentDerivedState {
  const validation = useMemo(
    () => getDeploymentValidation(input.status, input.walletReadiness, input.selectedTarget),
    [input.selectedTarget, input.status, input.walletReadiness],
  );
  const blockerReasons = useMemo(() => validation.blockers.map((blocker) => blocker.message), [validation.blockers]);

  return {
    blockerReasons,
    canDeploy: blockerReasons.length === 0,
    isProgressModalOpen: getIsProgressModalOpen(input.progress),
    validation,
  };
}

function updateReviewHistory(
  input: {
    readonly attempt: DeploymentAttempt;
    readonly localChainIdRef: LocalChainIdRef;
    readonly setDeploymentStatus: Dispatch<SetStateAction<DeploymentStatus | null>>;
    readonly setReviewHistory: ReviewHistorySetter;
    readonly statusMessage: DeploymentStatusMessage;
    readonly validation: DeploymentValidationResult;
  },
): void {
  input.setReviewHistory((current) => {
    const flags = getDeploymentEnvironmentFlags();
    const currentLocalChainId = input.attempt.targetId === "local"
      ? flags.localChainId
      : input.localChainIdRef.current;
    const localResetDetected = input.attempt.targetId === "local"
      && input.localChainIdRef.current !== null
      && input.localChainIdRef.current !== currentLocalChainId;
    const nextBaseHistory = localResetDetected
      ? current.map((entry) => entry.targetId === "local" && !entry.historicalOnly
        ? {
            ...entry,
            historicalOnly: true,
            historicalReason: LOCAL_HISTORY_RESET_REASON,
          }
        : entry)
      : current;
    const nextHistory = [createReviewEntry(input.attempt, input.statusMessage, input.validation), ...nextBaseHistory].slice(0, 5);

    if (input.attempt.targetId === "local") {
      input.localChainIdRef.current = currentLocalChainId;
    }

    input.setDeploymentStatus(toDeploymentStatus(input.attempt, input.statusMessage, input.validation, nextHistory));
    return nextHistory;
  });
}
function applyDeploymentOutcome(
  setters: DeploymentOutcomeSetters,
  outcome: DeploymentOutcome,
  validation: DeploymentValidationResult,
): void {
  setters.setLatestAttempt(outcome.attempt);
  setters.setProgress((current) => ({
    ...outcome.progress,
    dismissedByUser: current?.dismissedByUser ?? outcome.progress.dismissedByUser,
  }));
  setters.setStatusMessage(outcome.statusMessage);
  updateReviewHistory({
    attempt: outcome.attempt,
    localChainIdRef: setters.localChainIdRef,
    setDeploymentStatus: setters.setDeploymentStatus,
    setReviewHistory: setters.setReviewHistory,
    statusMessage: outcome.statusMessage,
    validation,
  });
  setters.setIsDeploying(false);
}

function scheduleStageUpdate(timerIdsRef: TimerIdsRef, delayMs: number, callback: () => void): void {
  const timerId = window.setTimeout(() => {
    timerIdsRef.current = timerIdsRef.current.filter((candidate) => candidate !== timerId);
    callback();
  }, delayMs);

  timerIdsRef.current.push(timerId);
}

function updateDeploymentProgress(
  setProgress: Dispatch<SetStateAction<DeploymentProgress | null>>,
  input: DeploymentProgressUpdate,
): void {
  setProgress((current) => createProgressSnapshot(current, {
    attemptId: input.attemptId,
    targetId: input.targetId,
    stage: input.stage,
    stageIndex: input.stageIndex,
    stageCount: DEPLOYMENT_STAGE_SEQUENCE.length,
    completedStages: DEPLOYMENT_STAGE_SEQUENCE.slice(0, input.stageIndex),
    activeMessage: getStageMessage(input.stage, input.targetLabel),
  }));
}

function createBlockedOutcome(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly blockerCode: string;
  readonly blockerMessage: string;
  readonly blockerRemediation: string;
  readonly targetId: DeploymentTargetId;
}): DeploymentOutcome {
  const attempt: DeploymentAttempt = {
    attemptId: input.attemptId,
    artifactId: input.artifactId,
    targetId: input.targetId,
    startedAt: Date.now(),
    endedAt: Date.now(),
    outcome: "blocked",
    currentStage: "validating",
    message: input.blockerMessage,
    errorCode: input.blockerCode,
  };
  const statusMessage: DeploymentStatusMessage = {
    attemptId: input.attemptId,
    targetId: input.targetId,
    severity: "error",
    headline: "Deployment blocked",
    details: input.blockerRemediation,
    stage: "validating",
    visibleInFooter: true,
    visibleInMovePanel: true,
  };

  return {
    attempt,
    progress: {
      attemptId: input.attemptId,
      targetId: input.targetId,
      stage: "validating",
      stageIndex: 0,
      stageCount: DEPLOYMENT_STAGE_SEQUENCE.length,
      completedStages: [],
      activeMessage: input.blockerMessage,
      dismissedByUser: false,
    },
    statusMessage,
  };
}

function createCancelledOutcome(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly targetId: DeploymentTargetId;
  readonly targetLabel: string;
}): DeploymentOutcome {
  const message = `Deployment was cancelled because wallet approval was rejected for ${input.targetLabel}.`;
  const attempt: DeploymentAttempt = {
    attemptId: input.attemptId,
    artifactId: input.artifactId,
    targetId: input.targetId,
    startedAt: Date.now(),
    endedAt: Date.now(),
    outcome: "cancelled",
    currentStage: "signing",
    message,
    errorCode: "wallet-approval-rejected",
  };
  const statusMessage: DeploymentStatusMessage = {
    attemptId: input.attemptId,
    targetId: input.targetId,
    severity: "warning",
    headline: "Deployment cancelled",
    details: "Approve the wallet signing request to continue deployment.",
    stage: "signing",
    visibleInFooter: true,
    visibleInMovePanel: true,
  };

  return {
    attempt,
    progress: {
      attemptId: input.attemptId,
      targetId: input.targetId,
      stage: "signing",
      stageIndex: 2,
      stageCount: DEPLOYMENT_STAGE_SEQUENCE.length,
      completedStages: ["validating", "preparing"],
      activeMessage: message,
      dismissedByUser: false,
    },
    statusMessage,
  };
}

function createSuccessOutcome(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly confirmationReference?: string;
  readonly packageId: string;
  readonly targetId: DeploymentTargetId;
  readonly targetLabel: string;
}): DeploymentOutcome {
  const message = `Deployment completed for ${input.targetLabel}. Package ID: ${input.packageId}.`;
  const attempt: DeploymentAttempt = {
    attemptId: input.attemptId,
    artifactId: input.artifactId,
    targetId: input.targetId,
    startedAt: Date.now(),
    endedAt: Date.now(),
    outcome: "succeeded",
    currentStage: "confirming",
    packageId: input.packageId,
    confirmationReference: input.confirmationReference,
    message,
  };
  const statusMessage: DeploymentStatusMessage = {
    attemptId: input.attemptId,
    targetId: input.targetId,
    severity: "success",
    headline: "Deployed",
    details: message,
    stage: "confirming",
    packageId: input.packageId,
    confirmationReference: input.confirmationReference,
    visibleInFooter: true,
    visibleInMovePanel: true,
  };

  return {
    attempt,
    progress: {
      attemptId: input.attemptId,
      targetId: input.targetId,
      stage: "confirming",
      stageIndex: DEPLOYMENT_STAGE_SEQUENCE.length - 1,
      stageCount: DEPLOYMENT_STAGE_SEQUENCE.length,
      completedStages: DEPLOYMENT_STAGE_SEQUENCE.slice(0, DEPLOYMENT_STAGE_SEQUENCE.length - 1),
      activeMessage: message,
      dismissedByUser: false,
    },
    statusMessage,
  };
}

function getExecutionOutcomeHeadline(outcome: DeploymentExecutionResult["outcome"]): string {
  switch (outcome) {
    case "succeeded":
      return "Deployed";
    case "cancelled":
      return "Deployment cancelled";
    case "unresolved":
      return "Deployment unresolved";
    case "failed":
      return "Deployment failed";
    case "blocked":
      return "Deployment blocked";
  }
}

function getExecutionOutcomeSeverity(outcome: DeploymentExecutionResult["outcome"]): DeploymentStatusMessage["severity"] {
  switch (outcome) {
    case "succeeded":
      return "success";
    case "cancelled":
      return "warning";
    default:
      return "error";
  }
}

function getExecutionOutcomeNextAction(result: DeploymentExecutionResult): string {
  switch (result.outcome) {
    case "cancelled":
      return "Approve the wallet signing request to continue deployment.";
    case "failed":
      return "Review the wallet and RPC error details, then retry deployment once the target is healthy.";
    case "unresolved":
      return "Retry confirmation or redeploy after checking the target network and transaction digest.";
    case "blocked":
      return "Resolve the reported blocker before retrying deployment.";
    case "succeeded":
      return result.message;
  }
}

function getStageIndex(stage: DeploymentStage): number {
  const stageIndex = DEPLOYMENT_STAGE_SEQUENCE.indexOf(stage);
  return stageIndex === -1 ? DEPLOYMENT_STAGE_SEQUENCE.length - 1 : stageIndex;
}

function createExecutionOutcome(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly result: DeploymentExecutionResult;
  readonly startedAt: number;
  readonly targetId: DeploymentTargetId;
}): DeploymentOutcome {
  const headline = getExecutionOutcomeHeadline(input.result.outcome);
  const severity = getExecutionOutcomeSeverity(input.result.outcome);
  const nextActionMessage = getExecutionOutcomeNextAction(input.result);
  const stageIndex = getStageIndex(input.result.stage);

  return {
    attempt: {
      attemptId: input.attemptId,
      artifactId: input.artifactId,
      targetId: input.targetId,
      startedAt: input.startedAt,
      endedAt: Date.now(),
      outcome: input.result.outcome,
      currentStage: input.result.stage,
      packageId: input.result.packageId,
      confirmationReference: input.result.confirmationReference,
      message: input.result.message,
      errorCode: input.result.errorCode,
    },
    progress: {
      attemptId: input.attemptId,
      targetId: input.targetId,
      stage: input.result.stage,
      stageIndex,
      stageCount: DEPLOYMENT_STAGE_SEQUENCE.length,
      completedStages: stageIndex <= 0 ? [] : DEPLOYMENT_STAGE_SEQUENCE.slice(0, stageIndex),
      activeMessage: input.result.message,
      dismissedByUser: false,
    },
    statusMessage: {
      attemptId: input.attemptId,
      targetId: input.targetId,
      severity,
      headline,
      details: nextActionMessage,
      stage: input.result.stage,
      packageId: input.result.packageId,
      confirmationReference: input.result.confirmationReference,
      visibleInFooter: true,
      visibleInMovePanel: true,
    },
  };
}

function resetDeploymentState(setters: Pick<DeploymentStateSetters, "setDeploymentStatus" | "setLatestAttempt" | "setStatusMessage">): void {
  setters.setLatestAttempt(null);
  setters.setDeploymentStatus(null);
  setters.setStatusMessage(null);
}

function getPrimaryBlocker(validation: DeploymentValidationResult) {
  return validation.blockers[0] ?? {
    code: "stale-artifact",
    stage: "validating",
    message: "Rebuild the current graph before deployment. The active artifact is stale or unresolved.",
    remediation: "Run Build again after the current graph settles, then retry deployment.",
  };
}

function applyBlockedDeploymentOutcome(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly selectedTarget: DeploymentTargetId;
  readonly stateSetters: DeploymentOutcomeSetters;
  readonly validation: DeploymentValidationResult;
}): void {
  const primaryBlocker = getPrimaryBlocker(input.validation);

  applyDeploymentOutcome(input.stateSetters, createBlockedOutcome({
    artifactId: input.artifactId,
    attemptId: input.attemptId,
    blockerCode: primaryBlocker.code,
    blockerMessage: primaryBlocker.message,
    blockerRemediation: primaryBlocker.remediation,
    targetId: input.selectedTarget,
  }), input.validation);
}

function scheduleMockDeploymentScenario(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly flags: ReturnType<typeof getDeploymentEnvironmentFlags>;
  readonly selectedTarget: DeploymentTargetId;
  readonly stateSetters: DeploymentOutcomeSetters;
  readonly targetLabel: string;
  readonly timerIdsRef: TimerIdsRef;
  readonly validation: DeploymentValidationResult;
}): void {
  if (getDeploymentTarget(input.selectedTarget).supportsWalletSigning && input.flags.rejectApproval) {
    scheduleRejectedSigningDeployment({
      artifactId: input.artifactId,
      attemptId: input.attemptId,
      selectedTarget: input.selectedTarget,
      stageDelayMs: input.flags.deployStageDelayMs,
      stateSetters: input.stateSetters,
      targetLabel: input.targetLabel,
      timerIdsRef: input.timerIdsRef,
      validation: input.validation,
    });
    return;
  }

  if (input.flags.failSubmission) {
    scheduleFailedSubmissionDeployment({
      artifactId: input.artifactId,
      attemptId: input.attemptId,
      selectedTarget: input.selectedTarget,
      stageDelayMs: input.flags.deployStageDelayMs,
      stateSetters: input.stateSetters,
      targetLabel: input.targetLabel,
      timerIdsRef: input.timerIdsRef,
      validation: input.validation,
    });
    return;
  }

  const confirmationReference = createConfirmationReference(input.artifactId, input.selectedTarget);
  const packageId = createPackageId(input.artifactId, input.selectedTarget);

  if (input.flags.unresolvedConfirmation) {
    scheduleUnresolvedConfirmationDeployment({
      artifactId: input.artifactId,
      attemptId: input.attemptId,
      confirmationReference,
      packageId,
      selectedTarget: input.selectedTarget,
      stageDelayMs: input.flags.deployStageDelayMs,
      stateSetters: input.stateSetters,
      targetLabel: input.targetLabel,
      timerIdsRef: input.timerIdsRef,
      validation: input.validation,
    });
    return;
  }

  scheduleSuccessfulDeployment({
    artifactId: input.artifactId,
    attemptId: input.attemptId,
    confirmationReference,
    packageId,
    selectedTarget: input.selectedTarget,
    stageDelayMs: input.flags.deployStageDelayMs,
    stateSetters: input.stateSetters,
    targetLabel: input.targetLabel,
    timerIdsRef: input.timerIdsRef,
    validation: input.validation,
  });
}

function scheduleRejectedSigningDeployment(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly selectedTarget: DeploymentTargetId;
  readonly stageDelayMs: number;
  readonly stateSetters: DeploymentOutcomeSetters;
  readonly targetLabel: string;
  readonly timerIdsRef: TimerIdsRef;
  readonly validation: DeploymentValidationResult;
}): void {
  scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs, () => {
    updateDeploymentProgress(input.stateSetters.setProgress, {
      attemptId: input.attemptId,
      targetId: input.selectedTarget,
      stage: "preparing",
      stageIndex: 1,
      targetLabel: input.targetLabel,
    });
  });

  scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs * 2, () => {
    applyDeploymentOutcome(input.stateSetters, createCancelledOutcome({
      artifactId: input.artifactId,
      attemptId: input.attemptId,
      targetId: input.selectedTarget,
      targetLabel: input.targetLabel,
    }), input.validation);
  });
}

function scheduleFailedSubmissionDeployment(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly selectedTarget: DeploymentTargetId;
  readonly stageDelayMs: number;
  readonly stateSetters: DeploymentOutcomeSetters;
  readonly targetLabel: string;
  readonly timerIdsRef: TimerIdsRef;
  readonly validation: DeploymentValidationResult;
}): void {
  const scheduledStages: Array<{ readonly delayMultiplier: number; readonly stage: DeploymentStage; readonly stageIndex: number }> = [
    { delayMultiplier: 1, stage: "preparing", stageIndex: 1 },
    { delayMultiplier: 2, stage: "signing", stageIndex: 2 },
    { delayMultiplier: 3, stage: "submitting", stageIndex: 3 },
  ];

  for (const scheduledStage of scheduledStages) {
    scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs * scheduledStage.delayMultiplier, () => {
      updateDeploymentProgress(input.stateSetters.setProgress, {
        attemptId: input.attemptId,
        targetId: input.selectedTarget,
        stage: scheduledStage.stage,
        stageIndex: scheduledStage.stageIndex,
        targetLabel: input.targetLabel,
      });
    });
  }

  scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs * 4, () => {
    applyDeploymentOutcome(input.stateSetters, createExecutionOutcome({
      artifactId: input.artifactId,
      attemptId: input.attemptId,
      result: {
        outcome: "failed",
        stage: "submitting",
        message: `Deployment submission to ${input.targetLabel} failed before confirmation completed. Retry after reviewing the RPC response and wallet status.`,
        errorCode: "submission-failed",
      },
      startedAt: Date.now(),
      targetId: input.selectedTarget,
    }), input.validation);
  });
}

function scheduleUnresolvedConfirmationDeployment(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly confirmationReference: string;
  readonly packageId: string;
  readonly selectedTarget: DeploymentTargetId;
  readonly stageDelayMs: number;
  readonly stateSetters: DeploymentOutcomeSetters;
  readonly targetLabel: string;
  readonly timerIdsRef: TimerIdsRef;
  readonly validation: DeploymentValidationResult;
}): void {
  const scheduledStages: Array<{ readonly delayMultiplier: number; readonly stage: DeploymentStage; readonly stageIndex: number }> = [
    { delayMultiplier: 1, stage: "preparing", stageIndex: 1 },
    { delayMultiplier: 2, stage: "signing", stageIndex: 2 },
    { delayMultiplier: 3, stage: "submitting", stageIndex: 3 },
  ];

  for (const scheduledStage of scheduledStages) {
    scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs * scheduledStage.delayMultiplier, () => {
      updateDeploymentProgress(input.stateSetters.setProgress, {
        attemptId: input.attemptId,
        targetId: input.selectedTarget,
        stage: scheduledStage.stage,
        stageIndex: scheduledStage.stageIndex,
        targetLabel: input.targetLabel,
      });
    });
  }

  scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs * 4, () => {
    applyDeploymentOutcome(input.stateSetters, createExecutionOutcome({
      artifactId: input.artifactId,
      attemptId: input.attemptId,
      result: {
        outcome: "unresolved",
        stage: "confirming",
        packageId: input.packageId,
        confirmationReference: input.confirmationReference,
        message: `Deployment submission for ${input.targetLabel} could not be confirmed within the verification window. Retry confirmation or redeploy after checking target health.`,
        errorCode: "confirmation-timeout",
      },
      startedAt: Date.now(),
      targetId: input.selectedTarget,
    }), input.validation);
  });
}

function scheduleSuccessfulDeployment(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly confirmationReference: string;
  readonly packageId: string;
  readonly selectedTarget: DeploymentTargetId;
  readonly stageDelayMs: number;
  readonly stateSetters: DeploymentOutcomeSetters;
  readonly targetLabel: string;
  readonly timerIdsRef: TimerIdsRef;
  readonly validation: DeploymentValidationResult;
}): void {
  const scheduledStages: Array<{ readonly delayMultiplier: number; readonly stage: DeploymentStage; readonly stageIndex: number }> = [
    { delayMultiplier: 1, stage: "preparing", stageIndex: 1 },
    { delayMultiplier: 2, stage: "signing", stageIndex: 2 },
    { delayMultiplier: 3, stage: "submitting", stageIndex: 3 },
  ];

  for (const scheduledStage of scheduledStages) {
    scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs * scheduledStage.delayMultiplier, () => {
      updateDeploymentProgress(input.stateSetters.setProgress, {
        attemptId: input.attemptId,
        targetId: input.selectedTarget,
        stage: scheduledStage.stage,
        stageIndex: scheduledStage.stageIndex,
        targetLabel: input.targetLabel,
      });
    });
  }

  scheduleStageUpdate(input.timerIdsRef, input.stageDelayMs * 4, () => {
    applyDeploymentOutcome(input.stateSetters, createSuccessOutcome({
      artifactId: input.artifactId,
      attemptId: input.attemptId,
      confirmationReference: input.confirmationReference,
      packageId: input.packageId,
      targetId: input.selectedTarget,
      targetLabel: input.targetLabel,
    }), input.validation);
  });
}

function startDeploymentAttempt(input: {
  readonly artifact: GeneratedContractArtifact | null;
  readonly selectedTarget: DeploymentTargetId;
  readonly setIsDeploying: Dispatch<SetStateAction<boolean>>;
  readonly stateSetters: DeploymentOutcomeSetters;
  readonly timerIdsRef: TimerIdsRef;
  readonly validation: DeploymentValidationResult;
}): void {
  const attemptId = createAttemptId();

  if (input.artifact?.artifactId === undefined || input.validation.blockers.length > 0) {
    applyBlockedDeploymentOutcome({
      artifactId: input.artifact?.artifactId ?? "unknown-artifact",
      attemptId,
      selectedTarget: input.selectedTarget,
      stateSetters: input.stateSetters,
      validation: input.validation,
    });
    return;
  }

  const target = getDeploymentTarget(input.selectedTarget);
  const flags = getDeploymentEnvironmentFlags();
  const artifactId = input.artifact.artifactId ?? "unknown-artifact";

  resetDeploymentState(input.stateSetters);
  input.setIsDeploying(true);
  updateDeploymentProgress(input.stateSetters.setProgress, {
    attemptId,
    targetId: input.selectedTarget,
    stage: "validating",
    stageIndex: 0,
    targetLabel: target.label,
  });

  scheduleMockDeploymentScenario({
    artifactId,
    attemptId,
    flags,
    selectedTarget: input.selectedTarget,
    stateSetters: input.stateSetters,
    targetLabel: target.label,
    timerIdsRef: input.timerIdsRef,
    validation: input.validation,
  });
}

function createRemotePublishHandler(input: {
  readonly account: ReturnType<typeof useCurrentAccount>;
  readonly currentWallet: ReturnType<typeof useCurrentWallet>;
  readonly suiClient: ReturnType<typeof useSuiClient>;
}) {
  return ({ artifact, ownerAddress, onSubmitting, target, references, signal }: Parameters<typeof publishToRemoteTarget>[0]) => publishToRemoteTarget({
    artifact,
    ownerAddress,
    onSubmitting,
    target,
    references,
    signal,
    execute: async (transaction, executeRequest) => {
      if (input.currentWallet.currentWallet == null || input.account == null) {
        throw new Error(`A connected wallet address is required before deploying to ${target.label}.`);
      }

      transaction.setSenderIfNotSet(input.account.address);

      const { bytes, signature } = await signTransaction(input.currentWallet.currentWallet, {
        transaction: {
          async toJSON() {
            return transaction.toJSON({
              client: input.suiClient,
              supportedIntents: [...input.currentWallet.supportedIntents],
            });
          },
        },
        account: input.account,
        chain: target.networkFamily === "local" ? "sui:localnet" : "sui:testnet",
      });

      executeRequest?.onSubmitting?.();

      const result = await input.suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
        },
      });

      return { digest: result.digest };
    },
  });
}

function startRealDeployment(input: {
  readonly account: ReturnType<typeof useCurrentAccount>;
  readonly currentWallet: ReturnType<typeof useCurrentWallet>;
  readonly derivedValidation: DeploymentValidationResult;
  readonly localChainIdRef: LocalChainIdRef;
  readonly selectedTarget: DeploymentTargetId;
  readonly setIsDeploying: Dispatch<SetStateAction<boolean>>;
  readonly stateSetters: DeploymentStateSetters;
  readonly status: CompilationStatus;
  readonly suiClient: ReturnType<typeof useSuiClient>;
}): void {
  const artifact = getArtifactFromStatus(input.status);
  const attemptId = createAttemptId();

  if (artifact?.artifactId === undefined || input.derivedValidation.blockers.length > 0) {
    applyBlockedDeploymentOutcome({
      artifactId: artifact?.artifactId ?? "unknown-artifact",
      attemptId,
      selectedTarget: input.selectedTarget,
      stateSetters: { ...input.stateSetters, localChainIdRef: input.localChainIdRef },
      validation: input.derivedValidation,
    });
    return;
  }

  const target = getDeploymentTarget(input.selectedTarget);
  const attemptStartedAt = Date.now();
  resetDeploymentState(input.stateSetters);
  input.setIsDeploying(true);

  const executor = createDeploymentExecutor({
    confirm: (request) => confirmPublishedPackageWithClient(
      request,
      request.target.id === "local"
        ? new SuiJsonRpcClient({ url: request.target.rpcUrl, network: "localnet" })
        : input.suiClient,
    ),
    publishRemote: createRemotePublishHandler({
      account: input.account,
      currentWallet: input.currentWallet,
      suiClient: input.suiClient,
    }),
  });

  void executor({
    artifact,
    ownerAddress: input.account?.address,
    references: input.selectedTarget === "local" ? null : resolvePackageReferenceBundle(input.selectedTarget),
    target,
  }, (progressUpdate) => {
    updateDeploymentProgress(input.stateSetters.setProgress, {
      attemptId,
      targetId: input.selectedTarget,
      stage: progressUpdate.stage,
      stageIndex: getStageIndex(progressUpdate.stage),
      targetLabel: target.label,
    });
  }).then((result) => {
    applyDeploymentOutcome(
      { ...input.stateSetters, localChainIdRef: input.localChainIdRef },
      createExecutionOutcome({
        artifactId: artifact.artifactId ?? "unknown-artifact",
        attemptId,
        result,
        startedAt: attemptStartedAt,
        targetId: input.selectedTarget,
      }),
      input.derivedValidation,
    );
  }).catch((error: unknown) => {
    const details = error instanceof Error ? error.message : "Deployment failed unexpectedly.";
    const normalizedDetails = details.toLowerCase();
    const isUserCancelled = normalizedDetails.includes("rejected") || normalizedDetails.includes("denied") || normalizedDetails.includes("cancelled");
    applyDeploymentOutcome(
      { ...input.stateSetters, localChainIdRef: input.localChainIdRef },
      createExecutionOutcome({
        artifactId: artifact.artifactId ?? "unknown-artifact",
        attemptId,
        result: {
          outcome: isUserCancelled ? "cancelled" : "failed",
          stage: isUserCancelled ? "signing" : "submitting",
          message: details,
          errorCode: isUserCancelled ? "wallet-approval-rejected" : "deployment-executor-error",
        },
        startedAt: attemptStartedAt,
        targetId: input.selectedTarget,
      }),
      input.derivedValidation,
    );
  });
}

function usePersistedDeploymentSnapshot(
  deploymentStatus: DeploymentState["deploymentStatus"],
  latestAttempt: DeploymentState["latestAttempt"],
  status: UseDeploymentOptions["status"],
) {
  useEffect(() => {
    const snapshot = getPersistedDeploymentSnapshot(deploymentStatus, latestAttempt, status);
    if (snapshot === null || typeof window === "undefined") {
      return;
    }

    saveDeploymentState(window.localStorage, snapshot);
  }, [deploymentStatus, latestAttempt, status]);
}

function getPersistedDeploymentSnapshot(
  deploymentStatus: DeploymentState["deploymentStatus"],
  latestAttempt: DeploymentState["latestAttempt"],
  status: UseDeploymentOptions["status"],
): StoredDeploymentState | null {
  if (deploymentStatus?.status !== "deployed" || latestAttempt?.outcome !== "succeeded" || latestAttempt.packageId === undefined) {
    return null;
  }

  const artifact = getArtifactFromStatus(status);
  if (artifact === null) {
    return null;
  }

  return {
    version: 1,
    packageId: latestAttempt.packageId,
    moduleName: artifact.moduleName,
    targetId: latestAttempt.targetId,
    transactionDigest: latestAttempt.confirmationReference ?? latestAttempt.packageId,
    deployedAt: new Date(latestAttempt.endedAt ?? latestAttempt.startedAt).toISOString(),
    contractName: loadActiveContractName(window.localStorage) ?? artifact.moduleName,
  };
}

function beginDeploymentAttempt(input: {
  readonly account: ReturnType<typeof useCurrentAccount>;
  readonly clearStageTimers: () => void;
  readonly currentWallet: ReturnType<typeof useCurrentWallet>;
  readonly derivedValidation: ReturnType<typeof useDeploymentDerivedState>["validation"];
  readonly isDeploying: boolean;
  readonly localChainIdRef: ReturnType<typeof useDeploymentStore>["localChainIdRef"];
  readonly selectedTarget: DeploymentTargetId;
  readonly setIsDeploying: ReturnType<typeof useDeploymentStore>["setIsDeploying"];
  readonly stateSetters: ReturnType<typeof useDeploymentStore>["stateSetters"];
  readonly status: UseDeploymentOptions["status"];
  readonly suiClient: ReturnType<typeof useSuiClient>;
  readonly timerIdsRef: ReturnType<typeof useDeploymentStore>["timerIdsRef"];
}): Promise<void> {
  if (input.isDeploying) {
    return Promise.resolve();
  }

  resetDeploymentAttemptState(input.clearStageTimers);

  if (shouldUseMockDeployment(getDeploymentEnvironmentFlags())) {
    startMockDeployment(input);
    return Promise.resolve();
  }

  startRealDeployment({
    account: input.account,
    currentWallet: input.currentWallet,
    derivedValidation: input.derivedValidation,
    localChainIdRef: input.localChainIdRef,
    selectedTarget: input.selectedTarget,
    setIsDeploying: input.setIsDeploying,
    stateSetters: input.stateSetters,
    status: input.status,
    suiClient: input.suiClient,
  });

  return Promise.resolve();
}

function resetDeploymentAttemptState(clearStageTimers: () => void) {
  if (typeof window !== "undefined") {
    clearDeploymentState(window.localStorage);
  }

  clearStageTimers();
}

function startMockDeployment(input: {
  readonly derivedValidation: ReturnType<typeof useDeploymentDerivedState>["validation"];
  readonly localChainIdRef: ReturnType<typeof useDeploymentStore>["localChainIdRef"];
  readonly selectedTarget: DeploymentTargetId;
  readonly setIsDeploying: ReturnType<typeof useDeploymentStore>["setIsDeploying"];
  readonly stateSetters: ReturnType<typeof useDeploymentStore>["stateSetters"];
  readonly status: UseDeploymentOptions["status"];
  readonly timerIdsRef: ReturnType<typeof useDeploymentStore>["timerIdsRef"];
}) {
  startDeploymentAttempt({
    artifact: getArtifactFromStatus(input.status),
    selectedTarget: input.selectedTarget,
    setIsDeploying: input.setIsDeploying,
    stateSetters: { ...input.stateSetters, localChainIdRef: input.localChainIdRef },
    timerIdsRef: input.timerIdsRef,
    validation: input.derivedValidation,
  });
}

/**
 * Manage deployment target selection and session-scoped deployment state.
 */
export function useDeployment({ initialTarget = DEFAULT_DEPLOYMENT_TARGET, status }: UseDeploymentOptions): DeploymentState {
  const account = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const suiClient = useSuiClient();
  const walletReadiness = useWalletReadiness();
  const {
    deploymentStatus,
    isDeploying,
    localChainIdRef,
    latestAttempt,
    progress,
    selectedTarget,
    setIsDeploying,
    setProgress,
    setSelectedTarget,
    stateSetters,
    statusMessage,
    timerIdsRef,
  } = useDeploymentStore(initialTarget);
  const derivedState = useDeploymentDerivedState({
    progress,
    selectedTarget,
    status,
    walletReadiness,
  });

  const clearStageTimers = useCallback(() => {
    for (const timerId of timerIdsRef.current) {
      window.clearTimeout(timerId);
    }

    timerIdsRef.current = [];
  }, [timerIdsRef]);

  useEffect(() => clearStageTimers, [clearStageTimers]);
  usePersistedDeploymentSnapshot(deploymentStatus, latestAttempt, status);

  const startDeployment = useCallback((): Promise<void> => {
    return beginDeploymentAttempt({
      account,
      clearStageTimers,
      currentWallet,
      derivedValidation: derivedState.validation,
      isDeploying,
      localChainIdRef,
      selectedTarget,
      setIsDeploying,
      stateSetters,
      status,
      suiClient,
      timerIdsRef,
    });
  }, [account, clearStageTimers, currentWallet, derivedState.validation, isDeploying, localChainIdRef, selectedTarget, setIsDeploying, stateSetters, status, suiClient, timerIdsRef]);

  const dismissProgress = useCallback(() => {
    setProgress((currentProgress) => currentProgress === null
      ? null
      : {
          ...currentProgress,
          dismissedByUser: true,
        });
  }, [setProgress]);

  return {
    selectedTarget,
    canDeploy: derivedState.canDeploy,
    isDeploying,
    isProgressModalOpen: derivedState.isProgressModalOpen,
    blockerReasons: derivedState.blockerReasons,
    deploymentStatus,
    latestAttempt,
    progress,
    statusMessage,
    setSelectedTarget,
    startDeployment,
    dismissProgress,
  };
}