import Footer from "./components/Footer";
import CanvasWorkspace from "./components/CanvasWorkspace";
import Header from "./components/Header";
import KitchenSinkPage from "./components/KitchenSinkPage";
import Sidebar from "./components/Sidebar";

function App() {
  const isKitchenSinkRoute = typeof window !== "undefined" && window.location.pathname === "/kitchen-sink";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      {isKitchenSinkRoute ? (
        <KitchenSinkPage />
      ) : (
        <main className="flex flex-1 overflow-hidden" aria-label="Application shell">
          <section
            aria-label="Node editor canvas"
            className="relative flex-1 overflow-hidden border-y border-[var(--ui-border-dark)]"
          >
            <CanvasWorkspace />
          </section>
          <Sidebar />
        </main>
      )}
      <Footer />
    </div>
  );
}

export default App;
