import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";

import type { CompilationStatus, CompilerDiagnostic, DeploymentStatus, DeploymentTargetId } from "./compiler/types";
import AlphaBanner from "./components/AlphaBanner";
import AuthorizeView from "./components/AuthorizeView";
import CanvasWorkspace from "./components/CanvasWorkspace";
import DeployWorkflowView from "./components/DeployWorkflowView";
import DeploymentProgressModal from "./components/DeploymentProgressModal";
import Footer from "./components/Footer";
import Header from "./components/Header";
import type { PrimaryView } from "./components/Header";
import MoveSourcePanel from "./components/MoveSourcePanel";
import Sidebar from "./components/Sidebar";
import VisualDeploymentTargetSelector from "./components/VisualDeploymentTargetSelector";
import { seededExampleContracts } from "./data/exampleContracts";
import { createDefaultContractFlow } from "./data/kitchenSinkFlow";
import { useDeployment } from "./hooks/useDeployment";
import type { RemediationNotice } from "./types/nodes";
import type { StoredDeploymentState } from "./types/authorization";
import { createNamedFlowContract, loadContractLibrary } from "./utils/contractStorage";
import { createCompilationGraphKey } from "./utils/compilationGraphKey";
import { loadCompilationState, saveCompilationState, type PersistedCompilationState } from "./utils/compilationStateStorage";
import { loadActiveContractName, loadDeploymentState, validateDeploymentState } from "./utils/deploymentStateStorage";
import { mergeDeploymentStatus } from "./utils/mergeDeploymentStatus";
import { loadUiState, mergeUiState } from "./utils/uiStateStorage";

const defaultContractFlow = createDefaultContractFlow();
const defaultContractName = "Starter Contract";
const KitchenSinkPage = lazy(() => import("./components/KitchenSinkPage"));
const IconPreviewPage = lazy(() => import("./components/IconPreviewPage"));

interface InitialAppState {
  readonly activeView: PrimaryView;
  readonly compilationSnapshot: PersistedCompilationState | null;
  readonly deploymentState: StoredDeploymentState | null;
  readonly selectedDeploymentTarget: "local" | "testnet:stillness" | "testnet:utopia";
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
  readonly moveSourceCode: string | null;
  readonly onCompilationStateChange: (
    status: CompilationStatus,
    nextDiagnostics: readonly CompilerDiagnostic[],
    nextSourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => void;
  readonly onRemediationNoticesChange: (notices: readonly RemediationNotice[]) => void;
  readonly onSelectedDeploymentTargetChange: (target: DeploymentTargetId) => void;
  readonly selectedDeploymentTarget: DeploymentTargetId;
}

interface VisualWorkspaceViewProps {
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly onCompilationStateChange: AppMainContentProps["onCompilationStateChange"];
  readonly onRemediationNoticesChange: (notices: readonly RemediationNotice[]) => void;
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
  readonly isCompiling: boolean;
  readonly isCompiledWorkflowReady: boolean;
  readonly isKitchenSinkRoute: boolean;
  readonly moveSourceCode: string | null;
  readonly onCompilationStateChange: AppMainContentProps["onCompilationStateChange"];
  readonly onRemediationNoticesChange: (notices: readonly RemediationNotice[]) => void;
  readonly onSelectDiagnostic: (nodeId: string) => void;
  readonly onViewChange: (view: PrimaryView) => void;
  readonly remediationNotices: readonly RemediationNotice[];
  readonly selectedDeploymentTarget: DeploymentTargetId;
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
    activeView: uiState.activeView === "authorize" && nextDeploymentState === null ? "visual" : uiState.activeView,
    compilationSnapshot: nextCompilationSnapshot,
    deploymentState: nextDeploymentState,
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
  onCompilationStateChange,
  onRemediationNoticesChange,
  onSelectedDeploymentTargetChange,
  selectedDeploymentTarget,
}: VisualWorkspaceViewProps) {
  return (
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
          initialContractName={defaultContractName}
          initialEdges={defaultContractFlow.edges}
          initialNodes={defaultContractFlow.nodes}
          onCompilationStateChange={onCompilationStateChange}
          onRemediationNoticesChange={onRemediationNoticesChange}
        />
      </section>
      <Sidebar />
    </div>
  );
}

function MoveSourceView({ displayStatus, moveSourceCode }: Pick<AppMainContentProps, "displayStatus" | "moveSourceCode">) {
  return (
    <section aria-label="Move source view" className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]">
      <MoveSourcePanel sourceCode={moveSourceCode} status={displayStatus} />
    </section>
  );
}

function AppMainContent({
  activeView,
  authorizeDeploymentState,
  deployment,
  displayStatus,
  focusedDiagnosticSelection,
  moveSourceCode,
  onCompilationStateChange,
  onRemediationNoticesChange,
  onSelectedDeploymentTargetChange,
  selectedDeploymentTarget,
}: AppMainContentProps) {
  if (activeView === "visual") {
    return (
      <VisualWorkspaceView
        focusedDiagnosticSelection={focusedDiagnosticSelection}
        onCompilationStateChange={onCompilationStateChange}
        onRemediationNoticesChange={onRemediationNoticesChange}
        onSelectedDeploymentTargetChange={onSelectedDeploymentTargetChange}
        selectedDeploymentTarget={selectedDeploymentTarget}
      />
    );
  }

  if (activeView === "deploy") {
    return <DeployWorkflowView deployment={deployment} />;
  }

  if (activeView === "authorize") {
    return <AuthorizeView deploymentState={authorizeDeploymentState} />;
  }

  return <MoveSourceView displayStatus={displayStatus} moveSourceCode={moveSourceCode} />;
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

  return {
    version: 1,
    packageId: latestAttempt.packageId,
    moduleName: latestAttempt.moduleName,
    targetId: latestAttempt.targetId,
    transactionDigest: latestAttempt.confirmationReference ?? latestAttempt.packageId,
    deployedAt: new Date(latestAttempt.endedAt ?? latestAttempt.startedAt).toISOString(),
    contractName: loadActiveContractName(getBrowserStorage()) ?? latestAttempt.moduleName,
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
  if (input.activeView === "authorize" && input.authorizeDeploymentState === null) {
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
  isCompiling,
  isCompiledWorkflowReady,
  isKitchenSinkRoute,
  moveSourceCode,
  onCompilationStateChange,
  onRemediationNoticesChange,
  onSelectDiagnostic,
  onViewChange,
  remediationNotices,
  selectedDeploymentTarget,
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
        onViewChange={isKitchenSinkRoute ? undefined : onViewChange}
        selectedDeploymentTarget={deployment.selectedTarget}
      />
      <AlphaBanner />
      {isKitchenSinkRoute ? (
        <Suspense fallback={<main className="flex flex-1 min-h-0" aria-label="Application shell" />}>
          <KitchenSinkPage />
        </Suspense>
      ) : (
        <main className="relative flex flex-1 min-h-0 overflow-hidden" aria-label="Application shell">
          <AppMainContent
            activeView={activeView}
            authorizeDeploymentState={authorizeDeploymentState}
            deployment={deployment}
            displayStatus={displayStatus}
            focusedDiagnosticSelection={focusedDiagnosticSelection}
            moveSourceCode={moveSourceCode}
            onCompilationStateChange={onCompilationStateChange}
            onRemediationNoticesChange={onRemediationNoticesChange}
            onSelectedDeploymentTargetChange={deployment.setSelectedTarget}
            selectedDeploymentTarget={selectedDeploymentTarget}
          />
        </main>
      )}
      <Footer
        deploymentStatus={deployment.deploymentStatus}
        diagnostics={diagnostics}
        onSelectDiagnostic={onSelectDiagnostic}
        remediationNotices={remediationNotices}
        status={displayStatus}
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

function StandardApp({ isKitchenSinkRoute }: { readonly isKitchenSinkRoute: boolean }) {
  const initialAppState = useMemo(() => getInitialAppState(), []);
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus>(initialAppState.compilationSnapshot?.status ?? { state: "idle" });
  const [diagnostics, setDiagnostics] = useState<readonly CompilerDiagnostic[]>(initialAppState.compilationSnapshot?.diagnostics ?? []);
  const [remediationNotices, setRemediationNotices] = useState<readonly RemediationNotice[]>([]);
  const [focusedDiagnosticSelection, setFocusedDiagnosticSelection] = useState<FocusedDiagnosticSelection | null>(null);
  const [activeView, setActiveView] = useState<PrimaryView>(initialAppState.activeView);
  const [moveSourceCode, setMoveSourceCode] = useState<string | null>(initialAppState.compilationSnapshot?.moveSourceCode ?? null);
  const [persistedCompilationSnapshot, setPersistedCompilationSnapshot] = useState<PersistedCompilationState | null>(initialAppState.compilationSnapshot);
  const currentContractGraphKey = getCurrentContractGraphKey();
  const restoredCompilationSnapshot = persistedCompilationSnapshot !== null
    && persistedCompilationSnapshot.graphKey === currentContractGraphKey
    ? persistedCompilationSnapshot
    : null;
  const effectiveCompilationState = useMemo(() => {
    if (hasCompiledWorkflowAccess(compilationStatus)) {
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
  const isCompiling = compilationStatus.state === "compiling";

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, { activeView: resolvedActiveView });
  }, [resolvedActiveView]);

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, {
      selectedDeploymentTarget: deployment.selectedTarget,
    });
  }, [deployment.selectedTarget]);

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

  return (
    <StandardAppLayout
      activeView={resolvedActiveView}
      authorizeDeploymentState={authorizeDeploymentState}
      deployment={deployment}
      diagnostics={effectiveCompilationState.diagnostics}
      displayStatus={displayStatus}
      focusedDiagnosticSelection={focusedDiagnosticSelection}
      isCompiling={isCompiling}
      isCompiledWorkflowReady={isCompiledWorkflowReady}
      isKitchenSinkRoute={isKitchenSinkRoute}
      moveSourceCode={effectiveCompilationState.moveSourceCode}
      onCompilationStateChange={handleCompilationStateChange}
      onRemediationNoticesChange={setRemediationNotices}
      onSelectDiagnostic={handleSelectDiagnostic}
      onViewChange={setActiveView}
      remediationNotices={remediationNotices}
      selectedDeploymentTarget={deployment.selectedTarget}
    />
  );
}

function App() {
  const pathname = typeof window === "undefined" ? "/" : window.location.pathname;
  const isIconPreviewRoute = pathname === "/icon-preview" || pathname.startsWith("/icon-preview/");

  if (isIconPreviewRoute) {
    return (
      <Suspense fallback={<main className="flex min-h-[100dvh]" aria-label="Icon preview loading" />}>
        <IconPreviewPage />
      </Suspense>
    );
  }

  return <StandardApp isKitchenSinkRoute={pathname === "/kitchen-sink"} />;
}

export default App;
