import { Suspense, lazy, useEffect, useState } from "react";

import type { CompilationStatus, CompilerDiagnostic } from "./compiler/types";
import CanvasWorkspace from "./components/CanvasWorkspace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import type { PrimaryView } from "./components/Header";
import MoveSourcePanel from "./components/MoveSourcePanel";
import Sidebar from "./components/Sidebar";
import { createDefaultContractFlow } from "./data/kitchenSinkFlow";
import { loadUiState, mergeUiState } from "./utils/uiStateStorage";

const defaultContractFlow = createDefaultContractFlow();
const defaultContractName = "Starter Contract";
const KitchenSinkPage = lazy(() => import("./components/KitchenSinkPage"));

interface FocusedDiagnosticSelection {
  readonly nodeId: string;
  readonly requestKey: number;
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

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, { activeView });
  }, [activeView]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header
        activeView={activeView}
        isCompiling={compilationStatus.state === "compiling"}
        onBuild={() => {
          triggerCompile();
        }}
        onViewChange={isKitchenSinkRoute ? undefined : setActiveView}
      />
      {isKitchenSinkRoute ? (
        <Suspense fallback={<main className="flex flex-1 min-h-0" aria-label="Application shell" />}>
          <KitchenSinkPage />
        </Suspense>
      ) : (
        <main className="relative flex flex-1 min-h-0 overflow-hidden" aria-label="Application shell">
          {activeView === "visual" ? (
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
                  onCompilationStateChange={(status, nextDiagnostics, nextSourceCode, artifactMoveSource) => {
                    setCompilationStatus(status);
                    setDiagnostics(nextDiagnostics);
                    setMoveSourceCode(artifactMoveSource ?? nextSourceCode);
                  }}
                  onTriggerCompileChange={(nextTriggerCompile) => {
                    setTriggerCompile(() => nextTriggerCompile);
                  }}
                />
              </section>
              <Sidebar />
            </div>
          ) : null}

          {activeView === "move" ? (
            <section aria-label="Move source view" className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]">
              <MoveSourcePanel sourceCode={moveSourceCode} status={compilationStatus} />
            </section>
          ) : null}
        </main>
      )}
      <Footer
        diagnostics={diagnostics}
        onSelectDiagnostic={(nodeId) => {
          setFocusedDiagnosticSelection((currentSelection) => ({
            nodeId,
            requestKey: (currentSelection?.requestKey ?? 0) + 1,
          }));
        }}
        status={compilationStatus}
      />
    </div>
  );
}

export default App;
