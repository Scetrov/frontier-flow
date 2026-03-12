import Footer from "./components/Footer";
import CanvasWorkspace from "./components/CanvasWorkspace";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="flex flex-1 overflow-hidden" aria-label="Application shell">
        <section
          aria-label="Node editor canvas"
          className="relative flex-1 overflow-hidden border-y border-[var(--ui-border-dark)]"
        >
          <CanvasWorkspace />
        </section>
        <Sidebar />
      </main>
      <Footer />
    </div>
  );
}

export default App;
