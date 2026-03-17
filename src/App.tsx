import Footer from "./components/Footer";
import CanvasWorkspace from "./components/CanvasWorkspace";
import Header from "./components/Header";
import KitchenSinkPage from "./components/KitchenSinkPage";
import Sidebar from "./components/Sidebar";
import { createDefaultContractFlow } from "./data/kitchenSinkFlow";

const defaultContractFlow = createDefaultContractFlow();
const defaultContractName = "Starter Contract";

function App() {
  const isKitchenSinkRoute = typeof window !== "undefined" && window.location.pathname === "/kitchen-sink";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      {isKitchenSinkRoute ? (
        <KitchenSinkPage />
      ) : (
        <main className="relative flex flex-1 min-h-0 overflow-hidden" aria-label="Application shell">
          <section
            aria-label="Node editor canvas"
            className="relative flex-1 overflow-hidden border-y border-[var(--ui-border-dark)]"
          >
            <CanvasWorkspace
              initialContractName={defaultContractName}
              initialEdges={defaultContractFlow.edges}
              initialNodes={defaultContractFlow.nodes}
            />
          </section>
          <Sidebar />
        </main>
      )}
      <Footer />
    </div>
  );
}

export default App;
