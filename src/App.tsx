import { useState } from "react";

import type { CompilationStatus, CompilerDiagnostic } from "./compiler/types";
import Footer from "./components/Footer";
import CanvasWorkspace from "./components/CanvasWorkspace";
import Header from "./components/Header";
import KitchenSinkPage from "./components/KitchenSinkPage";
import MoveSourcePanel from "./components/MoveSourcePanel";
import Sidebar from "./components/Sidebar";
import type { PrimaryView } from "./components/Header";
import { createDefaultContractFlow } from "./data/kitchenSinkFlow";

const defaultContractFlow = createDefaultContractFlow();
const defaultContractName = "Starter Contract";

interface FocusedDiagnosticSelection {
  readonly nodeId: string;
  readonly requestKey: number;
}

function App() {
  const isKitchenSinkRoute = typeof window !== "undefined" && window.location.pathname === "/kitchen-sink";
  const [compilationStatus, setCompilationStatus] = useState<CompilationStatus>({ state: "idle" });
  const [diagnostics, setDiagnostics] = useState<readonly CompilerDiagnostic[]>([]);
  const [focusedDiagnosticSelection, setFocusedDiagnosticSelection] = useState<FocusedDiagnosticSelection | null>(null);
  const [activeView, setActiveView] = useState<PrimaryView>("visual");
  const [moveSourceCode, setMoveSourceCode] = useState<string | null>(null);
  const [triggerCompile, setTriggerCompile] = useState<() => void>(() => () => undefined);

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
        <KitchenSinkPage />
      ) : (
        <main className="relative flex flex-1 min-h-0 overflow-hidden" aria-label="Application shell">
          <div aria-hidden={activeView !== "visual"} className="flex flex-1 min-h-0 overflow-hidden" hidden={activeView !== "visual"}>
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
                onCompilationStateChange={(status, nextDiagnostics, nextSourceCode) => {
                  setCompilationStatus(status);
                  setDiagnostics(nextDiagnostics);
                  setMoveSourceCode(nextSourceCode);
                }}
                onTriggerCompileChange={(nextTriggerCompile) => {
                  setTriggerCompile(() => nextTriggerCompile);
                }}
              />
            </section>
            <Sidebar />
          </div>

          <section
            aria-hidden={activeView !== "move"}
            className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]"
            hidden={activeView !== "move"}
          >
            <MoveSourcePanel sourceCode={moveSourceCode} status={compilationStatus} />
          </section>
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
