import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import type { CompilationStatus, CompilerDiagnostic, GeneratedContractArtifact } from "./compiler/types";
import CanvasWorkspace from "./components/CanvasWorkspace";
import DeploymentProgressModal from "./components/DeploymentProgressModal";
import Footer from "./components/Footer";
import Header from "./components/Header";
import type { PrimaryView } from "./components/Header";
import MoveSourcePanel from "./components/MoveSourcePanel";
import Sidebar from "./components/Sidebar";
import { createDefaultContractFlow } from "./data/kitchenSinkFlow";
import { useDeployment } from "./hooks/useDeployment";
import { loadUiState, mergeUiState } from "./utils/uiStateStorage";

const defaultContractFlow = createDefaultContractFlow();
const defaultContractName = "Starter Contract";
const KitchenSinkPage = lazy(() => import("./components/KitchenSinkPage"));

interface FocusedDiagnosticSelection {
  readonly nodeId: string;
  readonly requestKey: number;
}

interface AppMainContentProps {
  readonly activeView: PrimaryView;
  readonly displayStatus: CompilationStatus;
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly moveSourceCode: string | null;
  readonly onCompilationStateChange: (
    status: CompilationStatus,
    nextDiagnostics: readonly CompilerDiagnostic[],
    nextSourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => void;
  readonly onTriggerCompileChange: (nextTriggerCompile: () => void) => void;
}

interface VisualWorkspaceViewProps {
  readonly focusedDiagnosticSelection: FocusedDiagnosticSelection | null;
  readonly onCompilationStateChange: AppMainContentProps["onCompilationStateChange"];
  readonly onTriggerCompileChange: AppMainContentProps["onTriggerCompileChange"];
}

function VisualWorkspaceView({
  focusedDiagnosticSelection,
  onCompilationStateChange,
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
          onTriggerCompileChange={onTriggerCompileChange}
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
  displayStatus,
  focusedDiagnosticSelection,
  moveSourceCode,
  onCompilationStateChange,
  onTriggerCompileChange,
}: AppMainContentProps) {
  if (activeView === "visual") {
    return (
      <VisualWorkspaceView
        focusedDiagnosticSelection={focusedDiagnosticSelection}
        onCompilationStateChange={onCompilationStateChange}
        onTriggerCompileChange={onTriggerCompileChange}
      />
    );
  }

  return <MoveSourceView displayStatus={displayStatus} moveSourceCode={moveSourceCode} />;
}

function App() {
  const isKitchenSinkRoute = typeof window !== "undefined" && window.location.pathname === "/kitchen-sink";
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus>({ state: "idle" });
  const [diagnostics, setDiagnostics] = useState<readonly CompilerDiagnostic[]>([]);
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
        onBuild={handleBuild}
        onDeploy={handleDeploy}
        onDeploymentTargetChange={deployment.setSelectedTarget}
        onViewChange={isKitchenSinkRoute ? undefined : setActiveView}
        selectedDeploymentTarget={deployment.selectedTarget}
      />
      {isKitchenSinkRoute ? (
        <Suspense fallback={<main className="flex flex-1 min-h-0" aria-label="Application shell" />}>
          <KitchenSinkPage />
        </Suspense>
      ) : (
        <main className="relative flex flex-1 min-h-0 overflow-hidden" aria-label="Application shell">
          <AppMainContent
            activeView={activeView}
            displayStatus={displayStatus}
            focusedDiagnosticSelection={focusedDiagnosticSelection}
            moveSourceCode={moveSourceCode}
            onCompilationStateChange={handleCompilationStateChange}
            onTriggerCompileChange={(nextTriggerCompile) => {
              setTriggerCompile(() => nextTriggerCompile);
            }}
          />
        </main>
      )}
      <Footer
        diagnostics={diagnostics}
        onSelectDiagnostic={handleSelectDiagnostic}
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

function mergeDeploymentStatus(
  status: CompilationStatus,
  deploymentStatus: GeneratedContractArtifact["deploymentStatus"] | null,
): CompilationStatus {
  if (deploymentStatus === null) {
    return status;
  }

  if ((status.state !== "compiled" && status.state !== "error") || status.artifact === undefined) {
    return status;
  }

  return {
    ...status,
    artifact: {
      ...status.artifact,
      deploymentStatus,
    },
  };
}

export default App;
