import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { useCurrentAccount as useCurrentAccountHook, useCurrentWallet as useCurrentWalletHook, useSuiClient as useSuiClientHook } from "@mysten/dapp-kit";
import type { signTransaction as signTransactionFunction } from "@mysten/wallet-standard";
import { signTransaction } from "@mysten/wallet-standard";

import {
  AUTHORIZATION_CONFIRMATION_TIMEOUT_MS,
  type AuthorizationBatchResult,
  type AuthorizationBatchSummary,
  type AuthorizationProgressState,
  type AuthorizationTarget,
  type StoredDeploymentState,
} from "../types/authorization";
import {
  buildAuthorizeTurretTransaction,
  fetchAuthorizationCharacterId,
  fetchAuthorizationTarget,
  fetchOwnerCap,
  type AuthorizationTargetLookup,
  type BuildAuthorizeTurretTransactionInput,
  type FetchOwnerCapInput,
} from "../utils/authorizationTransaction";
import { getAuthorizationMockEnvironment, recordMockAuthorizedTurrets } from "../utils/authorizationMocking";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;

interface QueryAuthorizationEventInput {
  readonly deploymentState: StoredDeploymentState;
  readonly digest: string;
  readonly suiClient: SuiClient;
  readonly turretObjectId: string;
}

interface EnsureAuthorizationWitnessAvailableInput {
  readonly deploymentState: StoredDeploymentState;
  readonly pollIntervalMs: number;
  readonly suiClient: SuiClient;
  readonly timeoutMs: number;
}

interface UseAuthorizationOptions {
  readonly deploymentState: StoredDeploymentState | null;
  readonly walletAccount: CurrentAccount | null;
  readonly currentWallet: CurrentWallet;
  readonly suiClient: SuiClient;
  readonly buildTransactionFn?: (input: BuildAuthorizeTurretTransactionInput) => ReturnType<typeof buildAuthorizeTurretTransaction>;
  readonly confirmationTimeoutMs?: number;
  readonly ensureWitnessTypeAvailableFn?: (input: EnsureAuthorizationWitnessAvailableInput) => Promise<void>;
  readonly eventPollingIntervalMs?: number;
  readonly fetchCharacterIdFn?: typeof fetchAuthorizationCharacterId;
  readonly fetchOwnerCapFn?: (input: FetchOwnerCapInput) => Promise<string>;
  readonly resolveAuthorizationTargetFn?: (input: FetchOwnerCapInput) => Promise<AuthorizationTargetLookup>;
  readonly queryAuthorizationEventFn?: (input: QueryAuthorizationEventInput) => Promise<boolean>;
  readonly signTransactionFn?: typeof signTransactionFunction;
}

export interface UseAuthorizationResult {
  readonly abortAuthorization: () => void;
  readonly cancelAuthorization: () => void;
  readonly dismissProgress: () => void;
  readonly isAuthorizing: boolean;
  readonly progress: AuthorizationProgressState | null;
  readonly results: readonly AuthorizationBatchResult[];
  readonly retryEventConfirmation: (turretObjectId: string) => Promise<void>;
  readonly startAuthorization: (turretObjectIds: readonly string[]) => Promise<void>;
  readonly summary: AuthorizationBatchSummary;
}

const AUTHORIZATION_EVENT_POLL_INTERVAL_MS = 1_000;

interface AuthorizationRefs {
  readonly accountRef: { current: CurrentAccount | null };
  readonly activeOperationIdRef: { current: number };
  readonly clientRef: { current: SuiClient };
  readonly waitForReconnectRef: { current: (() => void) | null };
  readonly walletRef: { current: CurrentWallet };
}

interface AuthorizationDependencies {
  readonly buildTransactionFn: (input: BuildAuthorizeTurretTransactionInput) => ReturnType<typeof buildAuthorizeTurretTransaction>;
  readonly confirmationTimeoutMs: number;
  readonly deploymentState: StoredDeploymentState | null;
  readonly ensureWitnessTypeAvailableFn: (input: EnsureAuthorizationWitnessAvailableInput) => Promise<void>;
  readonly eventPollingIntervalMs: number;
  readonly isAuthorizing: boolean;
  readonly progress: AuthorizationProgressState | null;
  readonly queryAuthorizationEventFn: (input: QueryAuthorizationEventInput) => Promise<boolean>;
  readonly resolveAuthorizationTargetFn: (input: FetchOwnerCapInput) => Promise<AuthorizationTargetLookup>;
  readonly setIsAuthorizing: Dispatch<SetStateAction<boolean>>;
  readonly setProgress: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly signTransactionFn: typeof signTransactionFunction;
  readonly walletReady: boolean;
}

interface AuthorizationOperation {
  readonly operationId: number;
  readonly progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly turretObjectIds: readonly string[];
}

/**
 * Execute turret authorization transactions sequentially while tracking per-turret progress.
 */
export function useAuthorization({
  deploymentState,
  walletAccount,
  currentWallet,
  suiClient,
  buildTransactionFn = buildAuthorizeTurretTransaction,
  confirmationTimeoutMs = AUTHORIZATION_CONFIRMATION_TIMEOUT_MS,
  eventPollingIntervalMs = AUTHORIZATION_EVENT_POLL_INTERVAL_MS,
  ensureWitnessTypeAvailableFn = ensureAuthorizationWitnessAvailable,
  fetchCharacterIdFn = fetchAuthorizationCharacterId,
  fetchOwnerCapFn = fetchOwnerCap,
  resolveAuthorizationTargetFn,
  queryAuthorizationEventFn = queryAuthorizationEvent,
  signTransactionFn = signTransaction,
}: UseAuthorizationOptions): UseAuthorizationResult {
  const [progress, setProgress] = useState<AuthorizationProgressState | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const waitForReconnectRef = useRef<(() => void) | null>(null);
  const activeOperationIdRef = useRef(0);
  const deploymentKeyRef = useRef<string | null>(null);
  const accountRef = useRef<CurrentAccount | null>(walletAccount);
  const walletRef = useRef<CurrentWallet>(currentWallet);
  const clientRef = useRef<SuiClient>(suiClient);

  const walletReady = useMemo(() => isWalletReady(walletAccount, currentWallet), [currentWallet, walletAccount]);
  const deploymentKey = deploymentState === null
    ? null
    : `${deploymentState.targetId}:${deploymentState.packageId}:${deploymentState.moduleName}`;
  const effectiveResolveAuthorizationTargetFn = resolveAuthorizationTargetFn
    ?? (fetchCharacterIdFn !== fetchAuthorizationCharacterId || fetchOwnerCapFn !== fetchOwnerCap
      ? async (input: FetchOwnerCapInput): Promise<AuthorizationTargetLookup> => {
          const characterId = await resolveAuthorizationCharacterId(input.deploymentState, fetchCharacterIdFn, input.walletAddress);
          const ownerCapId = await fetchOwnerCapFn(input);

          return {
            characterId,
            ownerCapId,
          };
        }
      : fetchAuthorizationTarget);

  const cancelAuthorization = () => {
    activeOperationIdRef.current += 1;
    waitForReconnectRef.current = null;
    setIsAuthorizing(false);
    setProgress(null);
  };

  useEffect(() => {
    accountRef.current = walletAccount;
    walletRef.current = currentWallet;
    clientRef.current = suiClient;
  }, [currentWallet, suiClient, walletAccount]);

  useReconnectProgressEffect({ setProgress, waitForReconnectRef, walletReady });
  useDeploymentChangeCancellationEffect({ cancelAuthorization, deploymentKey, deploymentKeyRef });

  const dismissProgress = () => {
    setProgress((currentProgress) => currentProgress === null
      ? null
      : { ...currentProgress, dismissedByUser: true });
  };

  const dependencies: AuthorizationDependencies = {
    buildTransactionFn,
    confirmationTimeoutMs,
    deploymentState,
    ensureWitnessTypeAvailableFn,
    eventPollingIntervalMs,
    isAuthorizing,
    progress,
    queryAuthorizationEventFn,
    resolveAuthorizationTargetFn: effectiveResolveAuthorizationTargetFn,
    setIsAuthorizing,
    setProgress,
    signTransactionFn,
    walletReady,
  };
  const refs: AuthorizationRefs = {
    accountRef,
    activeOperationIdRef,
    clientRef,
    waitForReconnectRef,
    walletRef,
  };

  return {
    abortAuthorization: cancelAuthorization,
    cancelAuthorization,
    dismissProgress,
    isAuthorizing,
    progress,
    results: getAuthorizationBatchResults(progress),
    retryEventConfirmation: async (turretObjectId) => {
      await retryAuthorizationEventConfirmation(turretObjectId, dependencies, refs);
    },
    startAuthorization: async (turretObjectIds) => {
      await startAuthorizationBatch(turretObjectIds, dependencies, refs);
    },
    summary: getAuthorizationBatchSummary(progress),
  };
}

function getAuthorizationBatchSummary(progress: AuthorizationProgressState | null): AuthorizationBatchSummary {
  if (progress === null) {
    return {
      confirmed: 0,
      failed: 0,
      pending: 0,
      warnings: 0,
      total: 0,
    };
  }

  return progress.targets.reduce<AuthorizationBatchSummary>((summary, target) => ({
    confirmed: summary.confirmed + (target.status === "confirmed" ? 1 : 0),
    failed: summary.failed + (target.status === "failed" ? 1 : 0),
    pending: summary.pending + (target.status === "pending" || target.status === "submitting" || target.status === "confirming" ? 1 : 0),
    warnings: summary.warnings + (target.status === "warning" ? 1 : 0),
    total: summary.total + 1,
  }), {
    confirmed: 0,
    failed: 0,
    pending: 0,
    warnings: 0,
    total: 0,
  });
}

function getAuthorizationBatchResults(progress: AuthorizationProgressState | null): readonly AuthorizationBatchResult[] {
  if (progress === null || progress.completedAt === null) {
    return [];
  }

  return progress.targets.map((target) => ({
    turretObjectId: target.turretObjectId,
    status: target.status,
    transactionDigest: target.transactionDigest,
    errorMessage: target.errorMessage,
  }));
}

function useReconnectProgressEffect(input: {
  readonly setProgress: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly waitForReconnectRef: { current: (() => void) | null };
  readonly walletReady: boolean;
}): void {
  const { setProgress, waitForReconnectRef, walletReady } = input;

  useEffect(() => {
    if (!walletReady) {
      return;
    }

    setProgress((currentProgress) => currentProgress === null
      ? null
      : { ...currentProgress, walletDisconnected: false });
    waitForReconnectRef.current?.();
    waitForReconnectRef.current = null;
  }, [setProgress, waitForReconnectRef, walletReady]);
}

function useDeploymentChangeCancellationEffect(input: {
  readonly cancelAuthorization: () => void;
  readonly deploymentKey: string | null;
  readonly deploymentKeyRef: { current: string | null };
}): void {
  const { cancelAuthorization, deploymentKey, deploymentKeyRef } = input;

  useEffect(() => {
    if (deploymentKeyRef.current === null) {
      deploymentKeyRef.current = deploymentKey;
      return;
    }

    if (deploymentKeyRef.current !== deploymentKey) {
      deploymentKeyRef.current = deploymentKey;
      cancelAuthorization();
      return;
    }

    deploymentKeyRef.current = deploymentKey;
  }, [cancelAuthorization, deploymentKey, deploymentKeyRef]);
}

async function retryAuthorizationEventConfirmation(
  turretObjectId: string,
  dependencies: AuthorizationDependencies,
  refs: AuthorizationRefs,
): Promise<void> {
  const deploymentState = dependencies.deploymentState;
  const retryTarget = getRetryableTarget(turretObjectId, dependencies.deploymentState, dependencies.isAuthorizing, dependencies.progress);

  if (retryTarget === null || deploymentState === null) {
    return;
  }

  const digest = retryTarget.transactionDigest;

  if (digest === null) {
    return;
  }

  const operationId = refs.activeOperationIdRef.current + 1;
  refs.activeOperationIdRef.current = operationId;
  const scopedSetProgress = createScopedProgressSetter(operationId, refs.activeOperationIdRef, dependencies.setProgress);

  dependencies.setIsAuthorizing(true);
  updateTurretProgress(scopedSetProgress, turretObjectId, {
    activeTurretObjectId: turretObjectId,
    completedAt: null,
    confirmationPhase: "event",
    errorMessage: null,
    status: "confirming",
  });

  try {
    await waitForAuthorizationEvent({
      deploymentState,
      digest,
      pollIntervalMs: dependencies.eventPollingIntervalMs,
      progressSetter: scopedSetProgress,
      queryAuthorizationEventFn: dependencies.queryAuthorizationEventFn,
      timeoutMs: dependencies.confirmationTimeoutMs,
      suiClient: refs.clientRef.current,
      turretObjectId,
    });
  } finally {
    finalizeAuthorizationOperation(operationId, refs.activeOperationIdRef, dependencies.setIsAuthorizing, scopedSetProgress);
  }
}

async function startAuthorizationBatch(
  turretObjectIds: readonly string[],
  dependencies: AuthorizationDependencies,
  refs: AuthorizationRefs,
): Promise<void> {
  if (shouldSkipAuthorizationStart(dependencies.deploymentState, turretObjectIds, dependencies.isAuthorizing)) {
    return;
  }

  const operation = beginAuthorizationOperation({
    activeOperationIdRef: refs.activeOperationIdRef,
    deploymentState: dependencies.deploymentState,
    setIsAuthorizing: dependencies.setIsAuthorizing,
    setProgress: dependencies.setProgress,
    turretObjectIds,
    walletReady: dependencies.walletReady,
  });

  try {
    await executeAuthorizationBatch(operation, dependencies, refs);
  } catch (error: unknown) {
    handleAuthorizationBatchError(error, operation, refs.activeOperationIdRef);
  } finally {
    finalizeAuthorizationOperation(operation.operationId, refs.activeOperationIdRef, dependencies.setIsAuthorizing, operation.progressSetter);
  }
}

function shouldSkipAuthorizationStart(
  deploymentState: StoredDeploymentState | null,
  turretObjectIds: readonly string[],
  isAuthorizing: boolean,
): boolean {
  return deploymentState === null || turretObjectIds.length === 0 || isAuthorizing;
}

function beginAuthorizationOperation(input: {
  readonly activeOperationIdRef: { current: number };
  readonly deploymentState: StoredDeploymentState | null;
  readonly setIsAuthorizing: Dispatch<SetStateAction<boolean>>;
  readonly setProgress: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly turretObjectIds: readonly string[];
  readonly walletReady: boolean;
}): AuthorizationOperation {
  const turretObjectIds = Array.from(new Set(input.turretObjectIds));
  const operationId = input.activeOperationIdRef.current + 1;
  input.activeOperationIdRef.current = operationId;
  const progressSetter = createScopedProgressSetter(operationId, input.activeOperationIdRef, input.setProgress);

  input.setIsAuthorizing(true);
  progressSetter(createInitialProgressState(input.deploymentState as StoredDeploymentState, turretObjectIds, input.walletReady));

  return {
    operationId,
    progressSetter,
    turretObjectIds,
  };
}

function createInitialProgressState(
  deploymentState: StoredDeploymentState,
  turretObjectIds: readonly string[],
  walletReady: boolean,
): AuthorizationProgressState {
  return {
    targetId: deploymentState.targetId,
    targets: turretObjectIds.map<AuthorizationTarget>((turretObjectId) => ({
      turretObjectId,
      ownerCapId: "",
      status: "pending",
      confirmationPhase: null,
      transactionDigest: null,
      errorMessage: null,
    })),
    activeTurretObjectId: null,
    startedAt: Date.now(),
    completedAt: null,
    dismissedByUser: false,
    walletDisconnected: !walletReady,
  };
}

async function executeAuthorizationBatch(
  operation: AuthorizationOperation,
  dependencies: AuthorizationDependencies,
  refs: AuthorizationRefs,
): Promise<void> {
  const deploymentState = dependencies.deploymentState as StoredDeploymentState;
  const mockEnvironment = getAuthorizationMockEnvironment();

  if (mockEnvironment.enabled) {
    await runMockAuthorizationBatch({
      activeOperationIdRef: refs.activeOperationIdRef,
      delayMs: mockEnvironment.delayMs,
      deploymentState,
      failIndex: mockEnvironment.failIndex,
      operationId: operation.operationId,
      progressSetter: operation.progressSetter,
      turretObjectIds: operation.turretObjectIds,
    });
    return;
  }

  const waitForWalletConnection = createWalletConnectionWaiter(operation.operationId, operation.progressSetter, refs);

  for (const turretObjectId of operation.turretObjectIds) {
    await processTurret({
      buildTransactionFn: dependencies.buildTransactionFn,
      confirmationTimeoutMs: dependencies.confirmationTimeoutMs,
      deploymentState,
      ensureWitnessTypeAvailableFn: dependencies.ensureWitnessTypeAvailableFn,
      eventPollingIntervalMs: dependencies.eventPollingIntervalMs,
      progressSetter: operation.progressSetter,
      queryAuthorizationEventFn: dependencies.queryAuthorizationEventFn,
      resolveAuthorizationTargetFn: dependencies.resolveAuthorizationTargetFn,
      signTransactionFn: dependencies.signTransactionFn,
      suiClient: refs.clientRef.current,
      turretObjectId,
      waitForWalletConnection,
      walletAccountRef: refs.accountRef,
      walletRef: refs.walletRef,
    });
  }
}

async function resolveAuthorizationCharacterId(
  deploymentState: StoredDeploymentState,
  fetchCharacterIdFn: typeof fetchAuthorizationCharacterId,
  walletAddress: string,
): Promise<string> {
  if (deploymentState.targetId === "local") {
    throw new Error("Turret authorization is only available for published testnet deployments.");
  }

  const characterId = await fetchCharacterIdFn({
    targetId: deploymentState.targetId,
    walletAddress,
  });

  if (characterId === null) {
    throw new Error("Could not resolve the active character for the connected wallet.");
  }

  return characterId;
}

function createWalletConnectionWaiter(
  operationId: number,
  progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>,
  refs: AuthorizationRefs,
): () => Promise<void> {
  return async () => {
    ensureOperationIsActive(operationId, refs.activeOperationIdRef);

    if (isWalletReady(refs.accountRef.current, refs.walletRef.current)) {
      setWalletDisconnected(progressSetter, false);
      return;
    }

    setWalletDisconnected(progressSetter, true);
    await new Promise<void>((resolve) => {
      refs.waitForReconnectRef.current = resolve;
    });
  };
}

function setWalletDisconnected(
  progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>,
  walletDisconnected: boolean,
): void {
  progressSetter((currentProgress) => currentProgress === null
    ? null
    : { ...currentProgress, walletDisconnected });
}

function handleAuthorizationBatchError(
  error: unknown,
  operation: AuthorizationOperation,
  activeOperationIdRef: { readonly current: number },
): void {
  if (operation.operationId !== activeOperationIdRef.current || isCancellationError(error)) {
    return;
  }

  const message = error instanceof Error ? error.message : "Authorization failed before any turret transactions were submitted.";
  operation.progressSetter((currentProgress) => currentProgress === null
    ? null
    : {
        ...currentProgress,
        activeTurretObjectId: null,
        completedAt: Date.now(),
        targets: currentProgress.targets.map((target) => target.status === "pending"
          ? { ...target, status: "failed", errorMessage: message }
          : target),
      });
}

function finalizeAuthorizationOperation(
  operationId: number,
  activeOperationIdRef: { readonly current: number },
  setIsAuthorizing: Dispatch<SetStateAction<boolean>>,
  progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>,
): void {
  if (operationId !== activeOperationIdRef.current) {
    return;
  }

  setIsAuthorizing(false);
  progressSetter((currentProgress) => currentProgress === null || currentProgress.completedAt !== null
    ? currentProgress
    : { ...currentProgress, activeTurretObjectId: null, completedAt: Date.now() });
}

function getRetryableTarget(
  turretObjectId: string,
  deploymentState: StoredDeploymentState | null,
  isAuthorizing: boolean,
  progress: AuthorizationProgressState | null,
): AuthorizationTarget | null {
  if (deploymentState === null || isAuthorizing) {
    return null;
  }

  const retryTarget = progress?.targets.find((target) => target.turretObjectId === turretObjectId);
  return retryTarget == null || retryTarget.status !== "warning" || retryTarget.transactionDigest === null ? null : retryTarget;
}

function createScopedProgressSetter(
  operationId: number,
  activeOperationIdRef: { readonly current: number },
  setProgress: Dispatch<SetStateAction<AuthorizationProgressState | null>>,
): Dispatch<SetStateAction<AuthorizationProgressState | null>> {
  return (value) => {
    setProgress((currentProgress) => {
      if (operationId !== activeOperationIdRef.current) {
        return currentProgress;
      }

      return typeof value === "function"
        ? (value as (currentState: AuthorizationProgressState | null) => AuthorizationProgressState | null)(currentProgress)
        : value;
    });
  };
}

async function runMockAuthorizationBatch(input: {
  readonly activeOperationIdRef: { readonly current: number };
  readonly delayMs: number;
  readonly deploymentState: StoredDeploymentState;
  readonly failIndex: number | null;
  readonly operationId: number;
  readonly progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly turretObjectIds: readonly string[];
}): Promise<void> {
  for (const [index, turretObjectId] of input.turretObjectIds.entries()) {
    const transactionDigest = await advanceMockAuthorizationTarget(input, turretObjectId, index);

    if (input.failIndex === index) {
      updateTurretProgress(input.progressSetter, turretObjectId, {
        confirmationPhase: null,
        errorMessage: "Mock authorization failure for this turret.",
        status: "failed",
        transactionDigest,
      });
      continue;
    }

    await completeMockAuthorizationTarget(input, turretObjectId, transactionDigest);
  }
}

async function advanceMockAuthorizationTarget(
  input: {
    readonly activeOperationIdRef: { readonly current: number };
    readonly delayMs: number;
    readonly operationId: number;
    readonly progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  },
  turretObjectId: string,
  index: number,
): Promise<string> {
  ensureOperationIsActive(input.operationId, input.activeOperationIdRef);
  updateTurretProgress(input.progressSetter, turretObjectId, {
    activeTurretObjectId: turretObjectId,
    confirmationPhase: null,
    errorMessage: null,
    ownerCapId: `mock-owner-cap-${String(index + 1)}`,
    status: "submitting",
    transactionDigest: null,
  });

  await sleep(input.delayMs);
  ensureOperationIsActive(input.operationId, input.activeOperationIdRef);

  const transactionDigest = createMockDigest(turretObjectId, index);
  updateTurretProgress(input.progressSetter, turretObjectId, {
    confirmationPhase: "transaction",
    errorMessage: null,
    status: "confirming",
    transactionDigest,
  });

  await sleep(input.delayMs);
  ensureOperationIsActive(input.operationId, input.activeOperationIdRef);
  return transactionDigest;
}

async function completeMockAuthorizationTarget(
  input: {
    readonly activeOperationIdRef: { readonly current: number };
    readonly delayMs: number;
    readonly deploymentState: StoredDeploymentState;
    readonly operationId: number;
    readonly progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  },
  turretObjectId: string,
  transactionDigest: string,
): Promise<void> {
  updateTurretProgress(input.progressSetter, turretObjectId, {
    confirmationPhase: "event",
    errorMessage: null,
    status: "confirming",
    transactionDigest,
  });

  await sleep(input.delayMs);
  ensureOperationIsActive(input.operationId, input.activeOperationIdRef);

  updateTurretProgress(input.progressSetter, turretObjectId, {
    confirmationPhase: null,
    errorMessage: null,
    status: "confirmed",
    transactionDigest,
  });
  recordMockAuthorizedTurrets(input.deploymentState, [turretObjectId]);
}

function ensureOperationIsActive(operationId: number, activeOperationIdRef: { readonly current: number }): void {
  if (operationId !== activeOperationIdRef.current) {
    throw new Error("Authorization batch was cancelled.");
  }
}

function createMockDigest(turretObjectId: string, index: number): string {
  const suffix = `${turretObjectId.replace(/^0x/i, "").slice(-56)}${index.toString(16).padStart(8, "0")}`.slice(-64);
  return `0x${suffix}`;
}

async function processTurret(input: {
  readonly buildTransactionFn: (input: BuildAuthorizeTurretTransactionInput) => ReturnType<typeof buildAuthorizeTurretTransaction>;
  readonly confirmationTimeoutMs: number;
  readonly deploymentState: StoredDeploymentState;
  readonly ensureWitnessTypeAvailableFn: (input: EnsureAuthorizationWitnessAvailableInput) => Promise<void>;
  readonly eventPollingIntervalMs: number;
  readonly progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly queryAuthorizationEventFn: (input: QueryAuthorizationEventInput) => Promise<boolean>;
  readonly resolveAuthorizationTargetFn: (input: FetchOwnerCapInput) => Promise<AuthorizationTargetLookup>;
  readonly signTransactionFn: typeof signTransactionFunction;
  readonly suiClient: SuiClient;
  readonly turretObjectId: string;
  readonly waitForWalletConnection: () => Promise<void>;
  readonly walletAccountRef: { readonly current: CurrentAccount | null };
  readonly walletRef: { readonly current: CurrentWallet };
}): Promise<void> {
  for (;;) {
    await input.waitForWalletConnection();
    markTurretSubmitting(input.progressSetter, input.turretObjectId);

    try {
      const executionDigest = await submitAuthorizationTransaction(input);

      if (executionDigest === null) {
        continue;
      }
      const confirmationResult = await waitForConfirmation({
        digest: executionDigest,
        suiClient: input.suiClient,
        timeoutMs: input.confirmationTimeoutMs,
      });

      if (handleConfirmationResult(input.progressSetter, input.turretObjectId, executionDigest, confirmationResult)) {
        return;
      }

      await waitForAuthorizationEvent({
        deploymentState: input.deploymentState,
        digest: executionDigest,
        pollIntervalMs: input.eventPollingIntervalMs,
        progressSetter: input.progressSetter,
        queryAuthorizationEventFn: input.queryAuthorizationEventFn,
        timeoutMs: input.confirmationTimeoutMs,
        suiClient: input.suiClient,
        turretObjectId: input.turretObjectId,
      });
      return;
    } catch (error: unknown) {
      if (!isWalletReady(input.walletAccountRef.current, input.walletRef.current)) {
        continue;
      }

      updateTurretProgress(input.progressSetter, input.turretObjectId, {
        confirmationPhase: null,
        errorMessage: classifyAuthorizationError(error),
        status: "failed",
      });
      return;
    }
  }
}

function markTurretSubmitting(
  progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>,
  turretObjectId: string,
): void {
  updateTurretProgress(progressSetter, turretObjectId, {
    activeTurretObjectId: turretObjectId,
    confirmationPhase: null,
    errorMessage: null,
    status: "submitting",
    transactionDigest: null,
  });
}

async function submitAuthorizationTransaction(input: {
  readonly buildTransactionFn: (input: BuildAuthorizeTurretTransactionInput) => ReturnType<typeof buildAuthorizeTurretTransaction>;
  readonly confirmationTimeoutMs: number;
  readonly deploymentState: StoredDeploymentState;
  readonly ensureWitnessTypeAvailableFn: (input: EnsureAuthorizationWitnessAvailableInput) => Promise<void>;
  readonly eventPollingIntervalMs: number;
  readonly progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly resolveAuthorizationTargetFn: (input: FetchOwnerCapInput) => Promise<AuthorizationTargetLookup>;
  readonly signTransactionFn: typeof signTransactionFunction;
  readonly suiClient: SuiClient;
  readonly turretObjectId: string;
  readonly walletAccountRef: { readonly current: CurrentAccount | null };
  readonly walletRef: { readonly current: CurrentWallet };
}): Promise<string | null> {
  const { characterId, ownerCapId } = await input.resolveAuthorizationTargetFn({
    deploymentState: input.deploymentState,
    turretObjectId: input.turretObjectId,
    walletAddress: getConnectedAccountAddress(input.walletAccountRef.current),
  });
  updateTurretProgress(input.progressSetter, input.turretObjectId, { ownerCapId });

  const connectedWalletContext = getConnectedWalletContext(input.walletAccountRef.current, input.walletRef.current);

  if (connectedWalletContext === null) {
    return null;
  }

  await input.ensureWitnessTypeAvailableFn({
    deploymentState: input.deploymentState,
    pollIntervalMs: input.eventPollingIntervalMs,
    suiClient: input.suiClient,
    timeoutMs: input.confirmationTimeoutMs,
  });

  const transaction = input.buildTransactionFn({
    deploymentState: input.deploymentState,
    characterId,
    ownerCapId,
    turretObjectId: input.turretObjectId,
  });

  transaction.setSenderIfNotSet(connectedWalletContext.account.address);

  const { bytes, signature } = await input.signTransactionFn(connectedWalletContext.wallet, {
    transaction: {
      async toJSON() {
        return transaction.toJSON({
          client: input.suiClient,
          supportedIntents: [...connectedWalletContext.supportedIntents],
        });
      },
    },
    account: connectedWalletContext.account,
    chain: "sui:testnet",
  });

  const executionResult = await input.suiClient.executeTransactionBlock({
    transactionBlock: bytes,
    signature,
    options: {
      showEffects: true,
    },
  });

  updateTurretProgress(input.progressSetter, input.turretObjectId, {
    confirmationPhase: "transaction",
    status: "confirming",
    transactionDigest: executionResult.digest,
  });

  return executionResult.digest;
}

async function ensureAuthorizationWitnessAvailable(input: EnsureAuthorizationWitnessAvailableInput): Promise<void> {
  if (input.deploymentState.targetId === "local") {
    return;
  }

  const deadline = Date.now() + input.timeoutMs;
  let lastError: unknown = null;

  while (Date.now() <= deadline) {
    try {
      await input.suiClient.getNormalizedMoveStruct({
        package: input.deploymentState.packageId,
        module: input.deploymentState.moduleName,
        struct: "TurretAuth",
      });
      return;
    } catch (error: unknown) {
      lastError = error;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await sleep(Math.min(input.pollIntervalMs, remainingMs));
  }

  throw createAuthorizationWitnessUnavailableError(input.deploymentState, lastError);
}

function createAuthorizationWitnessUnavailableError(
  deploymentState: StoredDeploymentState,
  lastError: unknown,
): Error {
  const detail = lastError instanceof Error && lastError.message.trim().length > 0
    ? ` Last RPC error: ${lastError.message}`
    : "";

  return new Error(
    `The deployed extension package is not queryable yet for ${deploymentState.packageId}::${deploymentState.moduleName}::TurretAuth. Wait for testnet propagation and retry authorization, or redeploy if this package is stale.${detail}`,
  );
}

function getConnectedWalletContext(
  account: CurrentAccount | null,
  wallet: CurrentWallet,
): {
  readonly account: NonNullable<CurrentAccount>;
  readonly supportedIntents: readonly string[];
  readonly wallet: NonNullable<CurrentWallet["currentWallet"]>;
} | null {
  if (!isWalletReady(account, wallet)) {
    return null;
  }

  return {
    account: account as NonNullable<CurrentAccount>,
    supportedIntents: [...wallet.supportedIntents],
    wallet: wallet.currentWallet as NonNullable<CurrentWallet["currentWallet"]>,
  };
}

function handleConfirmationResult(
  progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>,
  turretObjectId: string,
  digest: string,
  confirmationResult: Awaited<ReturnType<SuiClient["waitForTransaction"]>> | "timeout",
): boolean {
  if (confirmationResult === "timeout") {
    updateTurretProgress(progressSetter, turretObjectId, {
      confirmationPhase: "transaction",
      errorMessage: "Transaction submitted but confirmation timed out. Check your wallet and the target network.",
      status: "warning",
      transactionDigest: digest,
    });
    return true;
  }

  if (confirmationResult.effects?.status.status !== "success") {
    updateTurretProgress(progressSetter, turretObjectId, {
      confirmationPhase: "transaction",
      errorMessage: "Authorization failed on-chain before confirmation completed.",
      status: "failed",
      transactionDigest: digest,
    });
    return true;
  }

  return false;
}

async function waitForConfirmation(input: {
  readonly digest: string;
  readonly suiClient: SuiClient;
  readonly timeoutMs: number;
}): Promise<Awaited<ReturnType<SuiClient["waitForTransaction"]>> | "timeout"> {
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    window.setTimeout(() => {
      resolve("timeout");
    }, input.timeoutMs);
  });

  return Promise.race([
    input.suiClient.waitForTransaction({
      digest: input.digest,
      options: {
        showEffects: true,
      },
      timeout: input.timeoutMs,
    }),
    timeoutPromise,
  ]);
}

async function waitForAuthorizationEvent(input: {
  readonly deploymentState: StoredDeploymentState;
  readonly digest: string;
  readonly pollIntervalMs: number;
  readonly progressSetter: Dispatch<SetStateAction<AuthorizationProgressState | null>>;
  readonly queryAuthorizationEventFn: (input: QueryAuthorizationEventInput) => Promise<boolean>;
  readonly timeoutMs: number;
  readonly suiClient: SuiClient;
  readonly turretObjectId: string;
}): Promise<void> {
  updateTurretProgress(input.progressSetter, input.turretObjectId, {
    confirmationPhase: "event",
    errorMessage: null,
    status: "confirming",
    transactionDigest: input.digest,
  });

  const deadline = Date.now() + input.timeoutMs;

  while (Date.now() <= deadline) {
    const observed = await input.queryAuthorizationEventFn({
      deploymentState: input.deploymentState,
      digest: input.digest,
      suiClient: input.suiClient,
      turretObjectId: input.turretObjectId,
    });

    if (observed) {
      updateTurretProgress(input.progressSetter, input.turretObjectId, {
        confirmationPhase: null,
        errorMessage: null,
        status: "confirmed",
        transactionDigest: input.digest,
      });
      return;
    }

    const remainingMs = deadline - Date.now();

    if (remainingMs <= 0) {
      break;
    }

    await sleep(Math.min(input.pollIntervalMs, remainingMs));
  }

  updateTurretProgress(input.progressSetter, input.turretObjectId, {
    confirmationPhase: "event",
    errorMessage: "Transaction confirmed, but the authorization event was not observed in time. Retry confirmation or check the target manually.",
    status: "warning",
    transactionDigest: input.digest,
  });
}

async function queryAuthorizationEvent(input: QueryAuthorizationEventInput): Promise<boolean> {
  const result = await input.suiClient.queryEvents({
    query: {
      Transaction: input.digest,
    },
    limit: 50,
    order: "descending",
  });

  return result.data.some((event) => isAuthorizationEvent(event, input));
}

function isAuthorizationEvent(
  event: Awaited<ReturnType<SuiClient["queryEvents"]>>["data"][number],
  input: Pick<QueryAuthorizationEventInput, "deploymentState" | "turretObjectId">,
): boolean {
  if (event.packageId === input.deploymentState.packageId || event.transactionModule === input.deploymentState.moduleName) {
    return true;
  }

  if (event.type.includes(`::${input.deploymentState.moduleName}::`)) {
    return true;
  }

  return hasStringValue(event.parsedJson, input.turretObjectId);
}

function updateTurretProgress(
  setProgress: Dispatch<SetStateAction<AuthorizationProgressState | null>>,
  turretObjectId: string,
  patch: Partial<AuthorizationTarget> & {
    readonly activeTurretObjectId?: string | null;
    readonly completedAt?: number | null;
  },
): void {
  setProgress((currentProgress) => currentProgress === null
    ? null
    : (() => {
        const {
          activeTurretObjectId,
          completedAt,
          ...targetPatch
        } = patch;

        return {
          ...currentProgress,
          activeTurretObjectId: activeTurretObjectId === undefined ? currentProgress.activeTurretObjectId : activeTurretObjectId,
          completedAt: completedAt === undefined ? currentProgress.completedAt : completedAt,
          targets: currentProgress.targets.map((target) => target.turretObjectId !== turretObjectId
            ? target
            : {
                ...target,
                ...targetPatch,
              }),
        };
      })());
}

async function sleep(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function hasStringValue(input: unknown, expectedValue: string): boolean {
  const queue: unknown[] = [input];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (typeof current === "string") {
      if (current.toLowerCase() === expectedValue.toLowerCase()) {
        return true;
      }

      continue;
    }

    if (current === null || typeof current !== "object") {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    for (const value of Object.values(current)) {
      queue.push(value);
    }
  }

  return false;
}

function getConnectedAccountAddress(account: CurrentAccount | null): string {
  if (account?.address == null || account.address.length === 0) {
    throw new Error("Connect a Sui wallet before authorizing turrets.");
  }

  return account.address;
}

function isWalletReady(account: CurrentAccount | null, wallet: CurrentWallet): boolean {
  return account !== null && wallet.currentWallet != null && wallet.isConnected;
}

function classifyAuthorizationError(error: unknown): string {
  if (error instanceof Error) {
    if (isCancellationError(error)) {
      return "Authorization batch was cancelled.";
    }

    if (/rejected|denied|cancelled/i.test(error.message)) {
      return "Transaction was rejected by your wallet.";
    }

    return error.message;
  }

  return "Authorization failed for this turret.";
}

function isCancellationError(error: unknown): boolean {
  return error instanceof Error && error.message === "Authorization batch was cancelled.";
}
