import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { useCurrentAccount, useCurrentWallet, useWallets } from "@mysten/dapp-kit";

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
import {
  createDeploymentValidationResult,
  getDeploymentEnvironmentFlags,
  type DeploymentValidationResult,
} from "../utils/deploymentValidation";

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
    targetId: attempt.targetId,
    packageId: attempt.packageId,
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
    headline: statusMessage.headline,
    targetId: attempt.targetId,
    severity: statusMessage.severity,
    stage: attempt.currentStage,
    packageId: attempt.packageId,
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
  return {
    attemptId: input.attemptId,
    targetId: input.targetId,
    stage: input.stage,
    stageIndex: input.stageIndex,
    stageCount: input.stageCount,
    completedStages: input.completedStages,
    activeMessage: input.activeMessage,
    dismissedByUser: current?.dismissedByUser ?? false,
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

interface DeploymentStateSetters {
  readonly setDeploymentStatus: Dispatch<SetStateAction<DeploymentStatus | null>>;
  readonly setIsDeploying: Dispatch<SetStateAction<boolean>>;
  readonly setLatestAttempt: Dispatch<SetStateAction<DeploymentAttempt | null>>;
  readonly setProgress: Dispatch<SetStateAction<DeploymentProgress | null>>;
  readonly setReviewHistory: ReviewHistorySetter;
  readonly setStatusMessage: Dispatch<SetStateAction<DeploymentStatusMessage | null>>;
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

function getIsProgressModalOpen(progress: DeploymentProgress | null, latestAttempt: DeploymentAttempt | null): boolean {
  return progress !== null
    && !progress.dismissedByUser
    && !(
      latestAttempt !== null
      && latestAttempt.attemptId === progress.attemptId
      && latestAttempt.outcome === "blocked"
    );
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
  readonly latestAttempt: DeploymentAttempt | null;
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
    isProgressModalOpen: getIsProgressModalOpen(input.progress, input.latestAttempt),
    validation,
  };
}

function updateReviewHistory(
  input: {
    readonly attempt: DeploymentAttempt;
    readonly setDeploymentStatus: Dispatch<SetStateAction<DeploymentStatus | null>>;
    readonly setReviewHistory: ReviewHistorySetter;
    readonly statusMessage: DeploymentStatusMessage;
    readonly validation: DeploymentValidationResult;
  },
): void {
  input.setReviewHistory((current) => {
    const nextHistory = [createReviewEntry(input.attempt, input.statusMessage, input.validation), ...current].slice(0, 5);
    input.setDeploymentStatus(toDeploymentStatus(input.attempt, input.statusMessage, input.validation, nextHistory));
    return nextHistory;
  });
}

function applyDeploymentOutcome(
  setters: DeploymentStateSetters,
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
    errorCode: "wallet-required",
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
    message,
  };
  const statusMessage: DeploymentStatusMessage = {
    attemptId: input.attemptId,
    targetId: input.targetId,
    severity: "success",
    headline: "Deployment deployed",
    details: message,
    stage: "confirming",
    packageId: input.packageId,
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

function resetDeploymentState(setters: Pick<DeploymentStateSetters, "setDeploymentStatus" | "setLatestAttempt" | "setStatusMessage">): void {
  setters.setLatestAttempt(null);
  setters.setDeploymentStatus(null);
  setters.setStatusMessage(null);
}

function scheduleRejectedSigningDeployment(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly selectedTarget: DeploymentTargetId;
  readonly stageDelayMs: number;
  readonly stateSetters: DeploymentStateSetters;
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

function scheduleSuccessfulDeployment(input: {
  readonly artifactId: string;
  readonly attemptId: string;
  readonly packageId: string;
  readonly selectedTarget: DeploymentTargetId;
  readonly stageDelayMs: number;
  readonly stateSetters: DeploymentStateSetters;
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
  readonly stateSetters: DeploymentStateSetters;
  readonly timerIdsRef: TimerIdsRef;
  readonly validation: DeploymentValidationResult;
}): void {
  const attemptId = createAttemptId();

  if (input.artifact?.artifactId === undefined || input.validation.blockers.length > 0) {
    const primaryBlocker = input.validation.blockers[0] ?? {
      code: "stale-artifact",
      stage: "validating",
      message: "Rebuild the current graph before deployment. The active artifact is stale or unresolved.",
      remediation: "Run Build again after the current graph settles, then retry deployment.",
    };

    applyDeploymentOutcome(input.stateSetters, createBlockedOutcome({
      artifactId: input.artifact?.artifactId ?? "unknown-artifact",
      attemptId,
      blockerCode: primaryBlocker.code,
      blockerMessage: primaryBlocker.message,
      blockerRemediation: primaryBlocker.remediation,
      targetId: input.selectedTarget,
    }), input.validation);
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

  if (target.supportsWalletSigning && flags.rejectApproval) {
    scheduleRejectedSigningDeployment({
      artifactId,
      attemptId,
      selectedTarget: input.selectedTarget,
      stageDelayMs: flags.deployStageDelayMs,
      stateSetters: input.stateSetters,
      targetLabel: target.label,
      timerIdsRef: input.timerIdsRef,
      validation: input.validation,
    });
    return;
  }

  scheduleSuccessfulDeployment({
    artifactId,
    attemptId,
    packageId: createPackageId(input.artifact.artifactId, input.selectedTarget),
    selectedTarget: input.selectedTarget,
    stageDelayMs: flags.deployStageDelayMs,
    stateSetters: input.stateSetters,
    targetLabel: target.label,
    timerIdsRef: input.timerIdsRef,
    validation: input.validation,
  });
}

/**
 * Manage deployment target selection and session-scoped deployment state.
 */
export function useDeployment({ initialTarget = DEFAULT_DEPLOYMENT_TARGET, status }: UseDeploymentOptions): DeploymentState {
  const walletReadiness = useWalletReadiness();
  const {
    deploymentStatus,
    isDeploying,
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
    latestAttempt,
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

  const startDeployment = useCallback((): Promise<void> => {
    if (isDeploying) {
      return Promise.resolve();
    }

    clearStageTimers();
    startDeploymentAttempt({
      artifact: getArtifactFromStatus(status),
      selectedTarget,
      setIsDeploying,
      stateSetters,
      timerIdsRef,
      validation: derivedState.validation,
    });

    return Promise.resolve();
  }, [clearStageTimers, derivedState.validation, isDeploying, selectedTarget, setIsDeploying, stateSetters, status, timerIdsRef]);

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