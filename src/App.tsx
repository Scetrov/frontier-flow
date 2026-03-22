import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import type { CompilationStatus, CompilerDiagnostic, DeploymentStatus } from "./compiler/types";
import AlphaBanner from "./components/AlphaBanner";
import CanvasWorkspace from "./components/CanvasWorkspace";
import DeploymentProgressModal from "./components/DeploymentProgressModal";
import Footer from "./components/Footer";
import Header from "./components/Header";
import type { PrimaryView } from "./components/Header";
import MoveSourcePanel from "./components/MoveSourcePanel";
import Sidebar from "./components/Sidebar";
import { createDefaultContractFlow } from "./data/kitchenSinkFlow";
import { useDeployment } from "./hooks/useDeployment";
import type { RemediationNotice } from "./types/nodes";
import { mergeDeploymentStatus } from "./utils/mergeDeploymentStatus";
import { loadUiState, mergeUiState } from "./utils/uiStateStorage";

const defaultContractFlow = createDefaultContractFlow();
const defaultContractName = "Starter Contract";
const KitchenSinkPage = lazy(() => import("./components/KitchenSinkPage"));
const IconPreviewPage = lazy(() => import("./components/IconPreviewPage"));

interface FocusedDiagnosticSelection {
  readonly nodeId: string;
  readonly requestKey: number;
}

interface AppMainContentProps {
  readonly activeView: PrimaryView;
  readonly deploymentStatus: DeploymentStatus | null;
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
  readonly onTriggerCompileChange: (nextTriggerCompile: () => void) => void;
}

interface VisualWorkspaceViewProps {
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly onCompilationStateChange: AppMainContentProps["onCompilationStateChange"];
  readonly onRemediationNoticesChange: (notices: readonly RemediationNotice[]) => void;
  readonly onTriggerCompileChange: AppMainContentProps["onTriggerCompileChange"];
}

function VisualWorkspaceView({
  focusedDiagnosticSelection,
  onCompilationStateChange,
  onRemediationNoticesChange,
  onTriggerCompileChange,
}: VisualWorkspaceViewProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <section
        aria-label="Node editor canvas"
        className="relative flex-1 overflow-hidden border-y border-[var(--ui-border-dark)]"
      >
        <CanvasWorkspace
          focusedDiagnosticNodeId={focusedDiagnosticSelection?.nodeId ?? null}
          focusedDiagnosticRequestKey={focusedDiagnosticSelection?.requestKey ?? 0}
          initialContractName={defaultContractName}
          initialEdges={defaultContractFlow.edges}
          initialNodes={defaultContractFlow.nodes}
          onCompilationStateChange={onCompilationStateChange}
          onRemediationNoticesChange={onRemediationNoticesChange}
          onTriggerCompileChange={onTriggerCompileChange}
        />
      </section>
      <Sidebar />
    </div>
  );
}

function MoveSourceView({ deploymentStatus, displayStatus, moveSourceCode }: Pick<AppMainContentProps, "deploymentStatus" | "displayStatus" | "moveSourceCode">) {
  return (
    <section aria-label="Move source view" className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]">
      <MoveSourcePanel deploymentStatus={deploymentStatus} sourceCode={moveSourceCode} status={displayStatus} />
    </section>
  );
}

function AppMainContent({
  activeView,
  deploymentStatus,
  displayStatus,
  focusedDiagnosticSelection,
  moveSourceCode,
  onCompilationStateChange,
  onRemediationNoticesChange,
  onTriggerCompileChange,
}: AppMainContentProps) {
  if (activeView === "visual") {
    return (
      <VisualWorkspaceView
        focusedDiagnosticSelection={focusedDiagnosticSelection}
        onCompilationStateChange={onCompilationStateChange}
        onRemediationNoticesChange={onRemediationNoticesChange}
        onTriggerCompileChange={onTriggerCompileChange}
      />
    );
  }

  return <MoveSourceView deploymentStatus={deploymentStatus} displayStatus={displayStatus} moveSourceCode={moveSourceCode} />;
}

function StandardApp({ isKitchenSinkRoute }: { readonly isKitchenSinkRoute: boolean }) {
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus>({ state: "idle" });
  const [diagnostics, setDiagnostics] = useState<readonly CompilerDiagnostic[]>([]);
  const [remediationNotices, setRemediationNotices] = useState<readonly RemediationNotice[]>([]);
  const [focusedDiagnosticSelection, setFocusedDiagnosticSelection] = useState<FocusedDiagnosticSelection | null>(null);
  const [activeView, setActiveView] = useState<PrimaryView>(
    () => loadUiState(typeof window === "undefined" ? undefined : window.localStorage).activeView,
  );
  const [moveSourceCode, setMoveSourceCode] = useState<string | null>(null);
  const [triggerCompile, setTriggerCompile] = useState<() => void>(() => () => undefined);
  const deployment = useDeployment({
    initialTarget: loadUiState(typeof window === "undefined" ? undefined : window.localStorage).selectedDeploymentTarget,
    status: compilationStatus,
  });
  const displayStatus = useMemo(() => mergeDeploymentStatus(compilationStatus, deployment.deploymentStatus), [compilationStatus, deployment.deploymentStatus]);
  const isCompiling = compilationStatus.state === "compiling";
  const isUpgrade = deployment.deploymentStatus?.status === "deployed";

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, { activeView });
  }, [activeView]);

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, {
      selectedDeploymentTarget: deployment.selectedTarget,
    });
  }, [deployment.selectedTarget]);

  const handleCompilationStateChange = (
    status: CompilationStatus,
    nextDiagnostics: readonly CompilerDiagnostic[],
    nextSourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => {
    setCompilationStatus(status);
    setDiagnostics(nextDiagnostics);
    setMoveSourceCode(artifactMoveSource ?? nextSourceCode);
  };

  const handleBuild = () => {
    triggerCompile();
  };

  const handleDeploy = () => {
    void deployment.startDeployment();
  };

  const handleSelectDiagnostic = (nodeId: string) => {
    setFocusedDiagnosticSelection((currentSelection) => ({
      nodeId,
      requestKey: (currentSelection?.requestKey ?? 0) + 1,
    }));
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header
        activeView={activeView}
        canDeploy={deployment.canDeploy}
        isDeploying={deployment.isDeploying}
        isCompiling={isCompiling}
        isUpgrade={isUpgrade}
        onBuild={handleBuild}
        onDeploy={handleDeploy}
        onDeploymentTargetChange={deployment.setSelectedTarget}
        onViewChange={isKitchenSinkRoute ? undefined : setActiveView}
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
            deploymentStatus={deployment.deploymentStatus}
            displayStatus={displayStatus}
            focusedDiagnosticSelection={focusedDiagnosticSelection}
            moveSourceCode={moveSourceCode}
            onCompilationStateChange={handleCompilationStateChange}
            onRemediationNoticesChange={setRemediationNotices}
            onTriggerCompileChange={(nextTriggerCompile) => {
              setTriggerCompile(() => nextTriggerCompile);
            }}
          />
        </main>
      )}
      <Footer
        deploymentStatus={deployment.deploymentStatus}
        diagnostics={diagnostics}
        onSelectDiagnostic={handleSelectDiagnostic}
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
