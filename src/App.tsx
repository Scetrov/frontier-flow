import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction } from "@mysten/dapp-kit";

import type { CompilationStatus, CompilerDiagnostic, DeploymentStatus, DeploymentTargetId } from "./compiler/types";
import AlphaBanner from "./components/AlphaBanner";
import DeploymentProgressModal from "./components/DeploymentProgressModal";
import Footer from "./components/Footer";
import Header from "./components/Header";
import PrivacyNoticeBanner from "./components/PrivacyNoticeBanner";
import type { PrimaryView } from "./components/Header";
import { seededExampleContracts } from "./data/exampleContracts";
import { subscribeToLocalEnvironmentChanges } from "./data/localEnvironment";
import { createDefaultContractFlow } from "./data/kitchenSinkFlow";
import { useDeployment } from "./hooks/useDeployment";
import { useTutorial } from "./hooks/useTutorial";
import type { GraphTransferWalletBridge } from "./hooks/useGraphTransfer";
import type { RemediationNotice } from "./types/nodes";
import type { StoredDeploymentState } from "./types/authorization";
import { createNamedFlowContract, loadContractLibrary } from "./utils/contractStorage";
import { createCompilationGraphKey } from "./utils/compilationGraphKey";
import { loadCompilationState, saveCompilationState, type PersistedCompilationState } from "./utils/compilationStateStorage";
import { loadActiveContractName, loadDeploymentState, validateDeploymentState } from "./utils/deploymentStateStorage";
import { mergeDeploymentStatus } from "./utils/mergeDeploymentStatus";
import { acknowledgePrivacyNotice, shouldShowPrivacyNotice } from "./utils/privacyNoticeStorage";
import { loadUiState, mergeUiState } from "./utils/uiStateStorage";

const defaultContractFlow = createDefaultContractFlow();
const defaultContractName = "Starter Contract";
const AuthorizeView = lazy(() => import("./components/AuthorizeView"));
const CanvasWorkspace = lazy(() => import("./components/CanvasWorkspace"));
const DeployWorkflowView = lazy(() => import("./components/DeployWorkflowView"));
const KitchenSinkPage = lazy(() => import("./components/KitchenSinkPage"));
const IconPreviewPage = lazy(() => import("./components/IconPreviewPage"));
const ColophonPage = lazy(() => import("./components/ColophonPage"));
const MoveSourcePanel = lazy(() => import("./components/MoveSourcePanel"));
const Sidebar = lazy(() => import("./components/Sidebar"));
const TutorialOverlay = lazy(() => import("./components/TutorialOverlay"));
const VisualDeploymentTargetSelector = lazy(() => import("./components/VisualDeploymentTargetSelector"));

interface InitialAppState {
  readonly activeView: PrimaryView;
  readonly compilationSnapshot: PersistedCompilationState | null;
  readonly selectedDeploymentTarget: DeploymentTargetId;
}

interface FocusedDiagnosticSelection {
  readonly nodeId: string;
  readonly requestKey: number;
}

interface AppMainContentProps {
  readonly activeView: PrimaryView;
  readonly authorizeDeploymentState: StoredDeploymentState | null;
  readonly deployment: ReturnType<typeof useDeployment>;
  readonly displayStatus: CompilationStatus;
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly graphTransferWalletBridge: GraphTransferWalletBridge;
  readonly moveSourceCode: string | null;
  readonly onMoveRebuild: () => Promise<void>;
  readonly onCompilationStateChange: (
    status: CompilationStatus,
    nextDiagnostics: readonly CompilerDiagnostic[],
    nextSourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => void;
  readonly onRegisterContractPanelVisibility: (setContractPanelOpen: (open: boolean) => void) => void;
  readonly onRegisterInsertDemoNode: (insertDemoNode: () => void) => void;
  readonly onRemediationNoticesChange: (notices: readonly RemediationNotice[]) => void;
  readonly onRegisterRemoveDemoNode: (removeDemoNode: () => void) => void;
  readonly onRegisterSidebarVisibility: (setSidebarOpen: (open: boolean) => void) => void;
  readonly onSelectedDeploymentTargetChange: (target: DeploymentTargetId) => void;
  readonly onViewChange: (view: PrimaryView) => void;
  readonly selectedDeploymentTarget: DeploymentTargetId;
}

interface VisualWorkspaceViewProps {
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly graphTransferWalletBridge: GraphTransferWalletBridge;
  readonly onCompilationStateChange: AppMainContentProps["onCompilationStateChange"];
  readonly onRegisterContractPanelVisibility: (setContractPanelOpen: (open: boolean) => void) => void;
  readonly onRegisterInsertDemoNode: (insertDemoNode: () => void) => void;
  readonly onRemediationNoticesChange: (notices: readonly RemediationNotice[]) => void;
  readonly onRegisterRemoveDemoNode: (removeDemoNode: () => void) => void;
  readonly onRegisterSidebarVisibility: (setSidebarOpen: (open: boolean) => void) => void;
  readonly onSelectedDeploymentTargetChange: (target: DeploymentTargetId) => void;
  readonly selectedDeploymentTarget: DeploymentTargetId;
}

interface StandardAppLayoutProps {
  readonly activeView: PrimaryView;
  readonly authorizeDeploymentState: StoredDeploymentState | null;
  readonly deployment: ReturnType<typeof useDeployment>;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly displayStatus: CompilationStatus;
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly graphTransferWalletBridge: GraphTransferWalletBridge;
  readonly isPrivacyNoticeVisible: boolean;
  readonly isCompiling: boolean;
  readonly isCompiledWorkflowReady: boolean;
  readonly isKitchenSinkRoute: boolean;
  readonly moveSourceCode: string | null;
  readonly onDismissPrivacyNotice: () => void;
  readonly onMoveRebuild: () => Promise<void>;
  readonly onCompilationStateChange: AppMainContentProps["onCompilationStateChange"];
  readonly onRegisterContractPanelVisibility: (setContractPanelOpen: (open: boolean) => void) => void;
  readonly onRegisterInsertDemoNode: (insertDemoNode: () => void) => void;
  readonly onRemediationNoticesChange: (notices: readonly RemediationNotice[]) => void;
  readonly onRegisterRemoveDemoNode: (removeDemoNode: () => void) => void;
  readonly onRegisterSidebarVisibility: (setSidebarOpen: (open: boolean) => void) => void;
  readonly onSelectDiagnostic: (nodeId: string) => void;
  readonly onStartTutorial: () => void;
  readonly onViewChange: (view: PrimaryView) => void;
  readonly remediationNotices: readonly RemediationNotice[];
  readonly selectedDeploymentTarget: DeploymentTargetId;
  readonly tutorialOverlay: React.ReactNode;
  readonly transientStatusMessage: {
    readonly tone: "error" | "info" | "success";
    readonly text: string;
  } | null;
}

interface TransientStatusMessage {
  readonly tone: "error" | "info" | "success";
  readonly text: string;
}

interface StandardAppController {
  readonly authorizeDeploymentState: StoredDeploymentState | null;
  readonly deployment: ReturnType<typeof useDeployment>;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly displayStatus: CompilationStatus;
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly isCompiling: boolean;
  readonly isCompiledWorkflowReady: boolean;
  readonly moveSourceCode: string | null;
  readonly onCompilationStateChange: AppMainContentProps["onCompilationStateChange"];
  readonly onMoveRebuild: () => Promise<void>;
  readonly onSelectDiagnostic: (nodeId: string) => void;
  readonly remediationNotices: readonly RemediationNotice[];
  readonly resolvedActiveView: PrimaryView;
  readonly selectedDeploymentTarget: DeploymentTargetId;
  readonly setActiveView: (view: PrimaryView) => void;
  readonly setRemediationNotices: (notices: readonly RemediationNotice[]) => void;
  readonly transientStatusMessage: TransientStatusMessage | null;
}

interface EffectiveCompilationState {
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly moveSourceCode: string | null;
  readonly status: CompilationStatus;
}

interface MoveRebuildStateSetters {
  readonly setCompilationStatus: (status: CompilationStatus) => void;
  readonly setDiagnostics: (diagnostics: readonly CompilerDiagnostic[]) => void;
  readonly setMoveSourceCode: (code: string | null) => void;
  readonly setTransientStatusMessage: (message: TransientStatusMessage) => void;
}

function MainContentFallback(props: { readonly ariaLabel: string }) {
  return <div aria-label={props.ariaLabel} className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]" />;
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function getCurrentContractGraphKey(storage = getBrowserStorage()): string {
  const fallbackContract = createNamedFlowContract(defaultContractName, defaultContractFlow.nodes, defaultContractFlow.edges);
  const contractLibrary = loadContractLibrary(storage, fallbackContract, seededExampleContracts);
  const activeContract = contractLibrary.contracts.find((contract) => contract.name === contractLibrary.activeContractName) ?? fallbackContract;

  return createCompilationGraphKey(activeContract.nodes, activeContract.edges, activeContract.name);
}

function getCurrentActiveContract(storage = getBrowserStorage()) {
  const fallbackContract = createNamedFlowContract(defaultContractName, defaultContractFlow.nodes, defaultContractFlow.edges);
  const contractLibrary = loadContractLibrary(storage, fallbackContract, seededExampleContracts);

  return contractLibrary.contracts.find((contract) => contract.name === contractLibrary.activeContractName) ?? fallbackContract;
}

function getCurrentDraftContractName(storage = getBrowserStorage()): string | null {
  return loadUiState(storage).currentDraftContractName;
}

function getInitialAppState(): InitialAppState {
  const storage = getBrowserStorage();
  const uiState = loadUiState(storage);
  const activeContractName = loadActiveContractName(storage);
  const currentGraphKey = getCurrentContractGraphKey(storage);
  const compilationSnapshot = loadCompilationState(storage);
  const deploymentState = loadDeploymentState(storage);
  const nextDeploymentState = deploymentState !== null && validateDeploymentState(deploymentState, {
    contractName: activeContractName,
    targetId: uiState.selectedDeploymentTarget,
  })
    ? deploymentState
    : null;
  const nextCompilationSnapshot = compilationSnapshot !== null && compilationSnapshot.graphKey === currentGraphKey
    ? compilationSnapshot
    : null;

  return {
    activeView: (uiState.activeView === "authorize" || uiState.activeView === "simulate") && nextDeploymentState === null ? "visual" : uiState.activeView,
    compilationSnapshot: nextCompilationSnapshot,
    selectedDeploymentTarget: uiState.selectedDeploymentTarget,
  };
}

function getValidatedDeploymentState(targetId: InitialAppState["selectedDeploymentTarget"]): StoredDeploymentState | null {
  const storage = getBrowserStorage();
  const deploymentState = loadDeploymentState(storage);

  if (deploymentState === null) {
    return null;
  }

  return validateDeploymentState(deploymentState, {
    contractName: loadActiveContractName(storage),
    targetId,
  })
    ? deploymentState
    : null;
}

function VisualWorkspaceView({
  focusedDiagnosticSelection,
  graphTransferWalletBridge,
  onCompilationStateChange,
  onRegisterContractPanelVisibility,
  onRegisterInsertDemoNode,
  onRemediationNoticesChange,
  onRegisterRemoveDemoNode,
  onRegisterSidebarVisibility,
  onSelectedDeploymentTargetChange,
  selectedDeploymentTarget,
}: VisualWorkspaceViewProps) {
  return (
    <Suspense fallback={<MainContentFallback ariaLabel="Visual workspace loading" />}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <section
          aria-label="Node editor canvas"
          className="relative flex-1 overflow-hidden border-y border-[var(--ui-border-dark)]"
        >
          <div className="ff-visual-target-selector__anchor">
            <VisualDeploymentTargetSelector
              onTargetChange={onSelectedDeploymentTargetChange}
              selectedTarget={selectedDeploymentTarget}
            />
          </div>
          <CanvasWorkspace
            focusedDiagnosticNodeId={focusedDiagnosticSelection?.nodeId ?? null}
            focusedDiagnosticRequestKey={focusedDiagnosticSelection?.requestKey ?? 0}
            graphTransferWalletBridge={graphTransferWalletBridge}
            initialContractName={defaultContractName}
            initialEdges={defaultContractFlow.edges}
            initialNodes={defaultContractFlow.nodes}
            onRegisterContractPanelVisibility={onRegisterContractPanelVisibility}
            onCompilationStateChange={onCompilationStateChange}
            onInsertDemoNode={onRegisterInsertDemoNode}
            onRemoveDemoNode={onRegisterRemoveDemoNode}
            onRemediationNoticesChange={onRemediationNoticesChange}
          />
        </section>
        <Sidebar onRegisterSidebarVisibility={onRegisterSidebarVisibility} />
      </div>
    </Suspense>
  );
}

function MoveSourceView({ displayStatus, moveSourceCode, onMoveRebuild }: Pick<AppMainContentProps, "displayStatus" | "moveSourceCode" | "onMoveRebuild">) {
  return (
    <Suspense fallback={<MainContentFallback ariaLabel="Move source loading" />}>
      <div className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]">
        <MoveSourcePanel onRebuild={onMoveRebuild} sourceCode={moveSourceCode} status={displayStatus} />
      </div>
    </Suspense>
  );
}

function AppMainContent({
  activeView,
  authorizeDeploymentState,
  deployment,
  displayStatus,
  focusedDiagnosticSelection,
  graphTransferWalletBridge,
  moveSourceCode,
  onMoveRebuild,
  onCompilationStateChange,
  onRegisterContractPanelVisibility,
  onRegisterInsertDemoNode,
  onRemediationNoticesChange,
  onRegisterRemoveDemoNode,
  onRegisterSidebarVisibility,
  onSelectedDeploymentTargetChange,
  onViewChange,
  selectedDeploymentTarget,
}: AppMainContentProps) {
  if (activeView === "visual") {
    return (
      <VisualWorkspaceView
        focusedDiagnosticSelection={focusedDiagnosticSelection}
        graphTransferWalletBridge={graphTransferWalletBridge}
        onCompilationStateChange={onCompilationStateChange}
        onRegisterContractPanelVisibility={onRegisterContractPanelVisibility}
        onRegisterInsertDemoNode={onRegisterInsertDemoNode}
        onRemediationNoticesChange={onRemediationNoticesChange}
        onRegisterRemoveDemoNode={onRegisterRemoveDemoNode}
        onRegisterSidebarVisibility={onRegisterSidebarVisibility}
        onSelectedDeploymentTargetChange={onSelectedDeploymentTargetChange}
        selectedDeploymentTarget={selectedDeploymentTarget}
      />
    );
  }

  if (activeView === "deploy") {
    return (
      <Suspense fallback={<MainContentFallback ariaLabel="Deploy workflow loading" />}>
        <DeployWorkflowView deployment={deployment} />
      </Suspense>
    );
  }

  if (activeView === "authorize" || activeView === "simulate") {
    return (
      <Suspense fallback={<MainContentFallback ariaLabel="Authorize workflow loading" />}>
        <AuthorizeView activeView={activeView} deploymentState={authorizeDeploymentState} onViewChange={onViewChange} />
      </Suspense>
    );
  }

  return <MoveSourceView displayStatus={displayStatus} moveSourceCode={moveSourceCode} onMoveRebuild={onMoveRebuild} />;
}

function getLiveDeploymentState(
  deploymentStatus: DeploymentStatus | null,
  latestAttempt: ReturnType<typeof useDeployment>["latestAttempt"],
): StoredDeploymentState | null {
  if (!hasLiveDeploymentSnapshot(deploymentStatus, latestAttempt)) {
    return null;
  }

  if (latestAttempt.moduleName === undefined) {
    return null;
  }

  if (latestAttempt.confirmationReference === undefined) {
    return null;
  }

  return {
    version: 1,
    packageId: latestAttempt.packageId,
    moduleName: latestAttempt.moduleName,
    targetId: latestAttempt.targetId,
    transactionDigest: latestAttempt.confirmationReference,
    deployedAt: new Date(latestAttempt.endedAt ?? latestAttempt.startedAt).toISOString(),
    contractName: loadActiveContractName(getBrowserStorage()) ?? latestAttempt.moduleName,
    sourceVersionTag: latestAttempt.sourceVersionTag,
    builderToolchainVersion: latestAttempt.builderToolchainVersion,
  };
}

function hasLiveDeploymentSnapshot(
  deploymentStatus: DeploymentStatus | null,
  latestAttempt: ReturnType<typeof useDeployment>["latestAttempt"],
): latestAttempt is NonNullable<ReturnType<typeof useDeployment>["latestAttempt"]> & { readonly packageId: string; readonly outcome: "succeeded" } {
  return deploymentStatus?.status === "deployed"
    && latestAttempt?.packageId !== undefined
    && latestAttempt.outcome === "succeeded";
}

function hasCompiledWorkflowAccess(status: CompilationStatus): boolean {
  return status.state === "compiled" || status.state === "error";
}

function resolveActiveView(input: {
  readonly activeView: PrimaryView;
  readonly authorizeDeploymentState: StoredDeploymentState | null;
  readonly canAccessCompiledWorkflow: boolean;
}): PrimaryView {
  if ((input.activeView === "authorize" || input.activeView === "simulate") && input.authorizeDeploymentState === null) {
    return input.canAccessCompiledWorkflow ? "deploy" : "visual";
  }

  if ((input.activeView === "move" || input.activeView === "deploy") && !input.canAccessCompiledWorkflow) {
    return "visual";
  }

  return input.activeView;
}

function StandardAppLayout({
  activeView,
  authorizeDeploymentState,
  deployment,
  diagnostics,
  displayStatus,
  focusedDiagnosticSelection,
  graphTransferWalletBridge,
  isPrivacyNoticeVisible,
  isCompiling,
  isCompiledWorkflowReady,
  isKitchenSinkRoute,
  moveSourceCode,
  onDismissPrivacyNotice,
  onMoveRebuild,
  onCompilationStateChange,
  onRegisterContractPanelVisibility,
  onRegisterInsertDemoNode,
  onRemediationNoticesChange,
  onRegisterRemoveDemoNode,
  onRegisterSidebarVisibility,
  onSelectDiagnostic,
  onStartTutorial,
  onViewChange,
  remediationNotices,
  selectedDeploymentTarget,
  tutorialOverlay,
  transientStatusMessage,
}: StandardAppLayoutProps) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header
        activeView={activeView}
        canAccessDeploy={isCompiledWorkflowReady}
        canAccessMove={isCompiledWorkflowReady}
        hasAuthorizeAccess={authorizeDeploymentState !== null}
        isCompiling={isCompiling}
        onDetectedDeploymentTarget={(targetId) => {
          deployment.setSelectedTarget(targetId);
        }}
        onStartTutorial={isKitchenSinkRoute ? undefined : onStartTutorial}
        onViewChange={isKitchenSinkRoute ? undefined : onViewChange}
        selectedDeploymentTarget={deployment.selectedTarget}
      />
      <AlphaBanner />
      {isKitchenSinkRoute ? (
        <Suspense fallback={<main className="flex flex-1 min-h-0" aria-label="Application shell"><h1 className="sr-only">Frontier Flow</h1></main>}>
          <KitchenSinkPage />
        </Suspense>
      ) : (
        <main className="relative flex flex-1 min-h-0 overflow-hidden" aria-label="Application shell">
          <h1 className="sr-only">Frontier Flow</h1>
          <AppMainContent
            activeView={activeView}
            authorizeDeploymentState={authorizeDeploymentState}
            deployment={deployment}
            displayStatus={displayStatus}
            focusedDiagnosticSelection={focusedDiagnosticSelection}
            graphTransferWalletBridge={graphTransferWalletBridge}
            moveSourceCode={moveSourceCode}
            onMoveRebuild={onMoveRebuild}
            onCompilationStateChange={onCompilationStateChange}
            onRegisterContractPanelVisibility={onRegisterContractPanelVisibility}
            onRegisterInsertDemoNode={onRegisterInsertDemoNode}
            onRemediationNoticesChange={onRemediationNoticesChange}
            onRegisterRemoveDemoNode={onRegisterRemoveDemoNode}
            onRegisterSidebarVisibility={onRegisterSidebarVisibility}
            onSelectedDeploymentTargetChange={deployment.setSelectedTarget}
            onViewChange={onViewChange}
            selectedDeploymentTarget={selectedDeploymentTarget}
          />
        </main>
      )}
      {tutorialOverlay}
      {isPrivacyNoticeVisible ? <PrivacyNoticeBanner onDismiss={onDismissPrivacyNotice} /> : null}
      <Footer
        deploymentStatus={deployment.deploymentStatus}
        diagnostics={diagnostics}
        onSelectDiagnostic={onSelectDiagnostic}
        remediationNotices={remediationNotices}
        status={displayStatus}
        transientStatusMessage={transientStatusMessage}
      />
      {deployment.isProgressModalOpen ? (
        <DeploymentProgressModal
          latestAttempt={deployment.latestAttempt}
          onDismiss={deployment.dismissProgress}
          progress={deployment.progress}
        />
      ) : null}
    </div>
  );
}

function createCompilationStateChangeHandler(
  setPersistedCompilationSnapshot: (snapshot: PersistedCompilationState) => void,
  setCompilationStatus: (status: CompilationStatus) => void,
  setDiagnostics: (diagnostics: readonly CompilerDiagnostic[]) => void,
  setMoveSourceCode: (code: string | null) => void,
) {
  return (
    status: CompilationStatus,
    nextDiagnostics: readonly CompilerDiagnostic[],
    nextSourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => {
    const nextMoveSourceCode = artifactMoveSource ?? nextSourceCode;

    if (hasCompiledWorkflowAccess(status)) {
      const nextSnapshot: PersistedCompilationState = {
        version: 1,
        graphKey: getCurrentContractGraphKey(),
        status,
        diagnostics: nextDiagnostics,
        moveSourceCode: nextMoveSourceCode,
      };

      setPersistedCompilationSnapshot(nextSnapshot);
      saveCompilationState(getBrowserStorage(), nextSnapshot);
    }

    setCompilationStatus(status);
    setDiagnostics(nextDiagnostics);
    setMoveSourceCode(nextMoveSourceCode);
  };
}

function createFallbackDiagnostics(error: unknown): readonly CompilerDiagnostic[] {
  const rawMessage = error instanceof Error ? error.message : String(error);

  return [
    {
      severity: "error",
      rawMessage,
      line: null,
      reactFlowNodeId: null,
      socketId: null,
      userMessage: rawMessage,
    },
  ];
}

function useTransientStatusMessageTimeout(
  transientStatusMessage: TransientStatusMessage | null,
  setTransientStatusMessage: (message: TransientStatusMessage | null | ((current: TransientStatusMessage | null) => TransientStatusMessage | null)) => void,
): void {
  useEffect(() => {
    if (transientStatusMessage === null || transientStatusMessage.tone === "info") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setTransientStatusMessage((currentMessage) => currentMessage === transientStatusMessage ? null : currentMessage);
    }, 2_500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [setTransientStatusMessage, transientStatusMessage]);
}

function useMoveRebuildHandler(
  handleCompilationStateChange: AppMainContentProps["onCompilationStateChange"],
  stateSetters: MoveRebuildStateSetters,
): () => Promise<void> {
  return useCallback(async () => {
    const activeContract = getCurrentActiveContract();
    const moduleName = getCurrentDraftContractName() ?? activeContract.name;
    const { setCompilationStatus, setDiagnostics, setMoveSourceCode, setTransientStatusMessage } = stateSetters;

    setTransientStatusMessage({ tone: "info", text: "Rebuilding..." });
    setCompilationStatus({ state: "compiling" });
    setDiagnostics([]);
    setMoveSourceCode(null);

    try {
      const { compilePipeline } = await import("./compiler/pipeline");
      const result = await compilePipeline({
        nodes: activeContract.nodes,
        edges: activeContract.edges,
        moduleName,
      });

      handleCompilationStateChange(result.status, result.diagnostics, result.code, result.artifact?.moveSource ?? null);
      setTransientStatusMessage({
        tone: result.status.state === "compiled" ? "success" : "error",
        text: result.status.state === "compiled" ? "Rebuild success" : "Rebuild failed",
      });
    } catch (error: unknown) {
      const fallbackDiagnostics = createFallbackDiagnostics(error);
      handleCompilationStateChange({ state: "error", diagnostics: fallbackDiagnostics }, fallbackDiagnostics, null, null);
      setTransientStatusMessage({ tone: "error", text: "Rebuild failed" });
    }
  }, [handleCompilationStateChange, stateSetters]);
}

function useEffectiveCompilationState(
  compilationStatus: CompilationStatus,
  diagnostics: readonly CompilerDiagnostic[],
  moveSourceCode: string | null,
  persistedCompilationSnapshot: PersistedCompilationState | null,
): EffectiveCompilationState {
  const currentContractGraphKey = getCurrentContractGraphKey();
  const restoredCompilationSnapshot = persistedCompilationSnapshot !== null
    && persistedCompilationSnapshot.graphKey === currentContractGraphKey
    ? persistedCompilationSnapshot
    : null;

  return useMemo(() => {
    if (compilationStatus.state === "compiling" || hasCompiledWorkflowAccess(compilationStatus)) {
      return { diagnostics, moveSourceCode, status: compilationStatus };
    }

    if (restoredCompilationSnapshot !== null) {
      return {
        diagnostics: restoredCompilationSnapshot.diagnostics,
        moveSourceCode: restoredCompilationSnapshot.moveSourceCode,
        status: restoredCompilationSnapshot.status,
      };
    }

    return { diagnostics, moveSourceCode, status: compilationStatus };
  }, [compilationStatus, diagnostics, moveSourceCode, restoredCompilationSnapshot]);
}

function useStandardAppController(initialAppState: InitialAppState): StandardAppController {
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus>(initialAppState.compilationSnapshot?.status ?? { state: "idle" });
  const [diagnostics, setDiagnostics] = useState<readonly CompilerDiagnostic[]>(initialAppState.compilationSnapshot?.diagnostics ?? []);
  const [remediationNotices, setRemediationNotices] = useState<readonly RemediationNotice[]>([]);
  const [focusedDiagnosticSelection, setFocusedDiagnosticSelection] = useState<FocusedDiagnosticSelection | null>(null);
  const [activeView, setActiveView] = useState<PrimaryView>(initialAppState.activeView);
  const [moveSourceCode, setMoveSourceCode] = useState<string | null>(initialAppState.compilationSnapshot?.moveSourceCode ?? null);
  const [persistedCompilationSnapshot, setPersistedCompilationSnapshot] = useState<PersistedCompilationState | null>(initialAppState.compilationSnapshot);
  const [transientStatusMessage, setTransientStatusMessage] = useState<TransientStatusMessage | null>(null);
  const effectiveCompilationState = useEffectiveCompilationState(
    compilationStatus,
    diagnostics,
    moveSourceCode,
    persistedCompilationSnapshot,
  );
  const deployment = useDeployment({
    initialTarget: initialAppState.selectedDeploymentTarget,
    status: effectiveCompilationState.status,
  });
  const persistedDeploymentState = getValidatedDeploymentState(deployment.selectedTarget);
  const displayStatus = useMemo(
    () => mergeDeploymentStatus(effectiveCompilationState.status, deployment.deploymentStatus),
    [deployment.deploymentStatus, effectiveCompilationState.status],
  );
  const authorizeDeploymentState = useMemo(
    () => persistedDeploymentState ?? getLiveDeploymentState(deployment.deploymentStatus, deployment.latestAttempt),
    [deployment.deploymentStatus, deployment.latestAttempt, persistedDeploymentState],
  );
  const isCompiledWorkflowReady = hasCompiledWorkflowAccess(effectiveCompilationState.status);
  const resolvedActiveView = useMemo(
    () => resolveActiveView({ activeView, authorizeDeploymentState, canAccessCompiledWorkflow: isCompiledWorkflowReady }),
    [activeView, authorizeDeploymentState, isCompiledWorkflowReady],
  );

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, { activeView: resolvedActiveView });
  }, [resolvedActiveView]);

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, {
      selectedDeploymentTarget: deployment.selectedTarget,
    });
  }, [deployment.selectedTarget]);

  useTransientStatusMessageTimeout(transientStatusMessage, setTransientStatusMessage);

  const handleCompilationStateChange = useMemo(
    () => createCompilationStateChangeHandler(setPersistedCompilationSnapshot, setCompilationStatus, setDiagnostics, setMoveSourceCode),
    [],
  );
  const handleSelectDiagnostic = useCallback((nodeId: string) => {
    setFocusedDiagnosticSelection((currentSelection) => ({
      nodeId,
      requestKey: (currentSelection?.requestKey ?? 0) + 1,
    }));
  }, []);
  const handleMoveRebuild = useMoveRebuildHandler(
    handleCompilationStateChange,
    {
      setCompilationStatus,
      setDiagnostics,
      setMoveSourceCode,
      setTransientStatusMessage,
    },
  );

  return {
    authorizeDeploymentState,
    deployment,
    diagnostics: effectiveCompilationState.diagnostics,
    displayStatus,
    focusedDiagnosticSelection,
    isCompiling: compilationStatus.state === "compiling",
    isCompiledWorkflowReady,
    moveSourceCode: effectiveCompilationState.moveSourceCode,
    onCompilationStateChange: handleCompilationStateChange,
    onMoveRebuild: handleMoveRebuild,
    onSelectDiagnostic: handleSelectDiagnostic,
    remediationNotices,
    resolvedActiveView,
    selectedDeploymentTarget: deployment.selectedTarget,
    setActiveView,
    setRemediationNotices,
    transientStatusMessage,
  };
}

function useTutorialBridge(resolvedActiveView: PrimaryView) {
  const setSidebarOpenRef = useRef<(open: boolean) => void>(() => undefined);
  const setContractPanelOpenRef = useRef<(open: boolean) => void>(() => undefined);
  const insertDemoNodeRef = useRef<() => void>(() => undefined);
  const removeDemoNodeRef = useRef<() => void>(() => undefined);
  const handleSetTutorialDrawerVisibility = useCallback((drawer: "sidebar" | "contract-panel", open: boolean) => {
    if (drawer === "sidebar") {
      setSidebarOpenRef.current(open);
      return;
    }

    setContractPanelOpenRef.current(open);
  }, []);
  const tutorial = useTutorial({
    activeView: resolvedActiveView,
    isCanvasReady: resolvedActiveView === "visual",
    onSetDrawerVisibility: handleSetTutorialDrawerVisibility,
    onInsertDemoNode: useCallback(() => { insertDemoNodeRef.current(); }, []),
    onRemoveDemoNode: useCallback(() => { removeDemoNodeRef.current(); }, []),
  });

  return { tutorial, setSidebarOpenRef, setContractPanelOpenRef, insertDemoNodeRef, removeDemoNodeRef };
}

function StandardApp({ isKitchenSinkRoute }: { readonly isKitchenSinkRoute: boolean }) {
  const [, setLocalEnvironmentRevision] = useState(0);
  const currentAccount = useCurrentAccount();
  const { isConnected } = useCurrentWallet();
  const signAndExecuteTransaction = useSignAndExecuteTransaction();
  const [isPrivacyNoticeVisible, setIsPrivacyNoticeVisible] = useState(() => shouldShowPrivacyNotice(getBrowserStorage()));
  const initialAppState = useMemo(() => getInitialAppState(), []);
  const {
    authorizeDeploymentState,
    deployment,
    diagnostics,
    displayStatus,
    focusedDiagnosticSelection,
    isCompiling,
    isCompiledWorkflowReady,
    moveSourceCode,
    onCompilationStateChange,
    onMoveRebuild,
    onSelectDiagnostic,
    remediationNotices,
    resolvedActiveView,
    selectedDeploymentTarget,
    setActiveView,
    setRemediationNotices,
    transientStatusMessage,
  } = useStandardAppController(initialAppState);
  const graphTransferWalletBridge = useMemo<GraphTransferWalletBridge>(() => ({
    accountAddress: currentAccount?.address ?? null,
    walletConnected: isConnected,
    signAndExecuteTransaction: async (transaction) => {
      const result = await signAndExecuteTransaction.mutateAsync({ transaction });
      return { digest: result.digest };
    },
  }), [currentAccount?.address, isConnected, signAndExecuteTransaction]);
  const handleDismissPrivacyNotice = useCallback(() => {
    acknowledgePrivacyNotice(getBrowserStorage());
    setIsPrivacyNoticeVisible(false);
  }, []);
  const { tutorial, setSidebarOpenRef, setContractPanelOpenRef, insertDemoNodeRef, removeDemoNodeRef } = useTutorialBridge(resolvedActiveView);

  useEffect(() => subscribeToLocalEnvironmentChanges(() => {
    setLocalEnvironmentRevision((currentValue) => currentValue + 1);
  }), []);

  return (
    <StandardAppLayout
      activeView={resolvedActiveView}
      authorizeDeploymentState={authorizeDeploymentState}
      deployment={deployment}
      diagnostics={diagnostics}
      displayStatus={displayStatus}
      focusedDiagnosticSelection={focusedDiagnosticSelection}
      graphTransferWalletBridge={graphTransferWalletBridge}
      isPrivacyNoticeVisible={isPrivacyNoticeVisible}
      isCompiling={isCompiling}
      isCompiledWorkflowReady={isCompiledWorkflowReady}
      isKitchenSinkRoute={isKitchenSinkRoute}
      moveSourceCode={moveSourceCode}
      onDismissPrivacyNotice={handleDismissPrivacyNotice}
      onMoveRebuild={onMoveRebuild}
      onCompilationStateChange={onCompilationStateChange}
      onRegisterContractPanelVisibility={(setContractPanelOpen) => {
        setContractPanelOpenRef.current = setContractPanelOpen;
      }}
      onRegisterInsertDemoNode={(insertDemoNode) => {
        insertDemoNodeRef.current = insertDemoNode;
      }}
      onRemediationNoticesChange={setRemediationNotices}
      onRegisterRemoveDemoNode={(removeDemoNode) => {
        removeDemoNodeRef.current = removeDemoNode;
      }}
      onRegisterSidebarVisibility={(setSidebarOpen) => {
        setSidebarOpenRef.current = setSidebarOpen;
      }}
      onSelectDiagnostic={onSelectDiagnostic}
      onStartTutorial={tutorial.start}
      onViewChange={setActiveView}
      remediationNotices={remediationNotices}
      selectedDeploymentTarget={selectedDeploymentTarget}
      tutorialOverlay={(
        tutorial.isActive || tutorial.currentStep !== null ? (
          <Suspense fallback={null}>
            <TutorialOverlay
              currentStep={tutorial.currentStep}
              currentStepIndex={tutorial.currentStepIndex}
              isActive={tutorial.isActive}
              onDismiss={tutorial.dismiss}
              onNext={tutorial.next}
              targetRect={tutorial.targetRect}
              totalSteps={tutorial.totalSteps}
            />
          </Suspense>
        ) : null
      )}
      transientStatusMessage={transientStatusMessage}
    />
  );
}

function App() {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const isIconPreviewRoute = pathname === "/icon-preview" || pathname.startsWith("/icon-preview/");
  const isColophonRoute = pathname === "/colophon";

  if (isIconPreviewRoute) {
    return (
      <Suspense fallback={<main className="flex min-h-[100dvh]" aria-label="Icon preview loading" />}>
        <IconPreviewPage />
      </Suspense>
    );
  }

  if (isColophonRoute) {
    return (
      <Suspense fallback={<main className="flex min-h-[100dvh]" aria-label="Colophon loading" />}>
        <ColophonPage />
      </Suspense>
    );
  }

  return <StandardApp isKitchenSinkRoute={pathname === "/kitchen-sink"} />;
}

export default App;
