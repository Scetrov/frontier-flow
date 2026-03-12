import Footer from "./components/Footer";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />
      <main className="flex flex-1 overflow-hidden" aria-label="Application shell">
        <section
          aria-label="Node editor canvas"
          className="relative flex-1 overflow-hidden border-y border-[var(--ui-border-dark)] bg-[linear-gradient(180deg,rgba(255,71,0,0.05),transparent_30%),radial-gradient(circle_at_top_left,rgba(84,160,255,0.18),transparent_35%),linear-gradient(135deg,#10151f,#16212e_55%,#0d1118)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(250,250,229,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(250,250,229,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
          <div className="relative flex h-full flex-col justify-between p-4 sm:p-6 lg:p-8">
            <div className="max-w-2xl space-y-4">
              <p className="font-heading text-xs uppercase tracking-[0.28em] text-[var(--brand-orange)]">
                Contract Canvas
              </p>
              <h1 className="max-w-xl font-heading text-3xl uppercase tracking-[0.12em] text-[var(--cream-white)] sm:text-4xl">
                Visual automation for EVE Frontier command flows.
              </h1>
              <p className="max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">
                Drag nodes from the toolbox, wire the combat and logistics graph,
                and generate deterministic Sui Move contracts from the browser.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.78)] p-3 backdrop-blur-sm">
                <p className="font-heading text-[0.7rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">
                  Signals
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Fleet inputs, spatial triggers, and combat telemetry feed the graph.
                </p>
              </div>
              <div className="border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.78)] p-3 backdrop-blur-sm">
                <p className="font-heading text-[0.7rem] uppercase tracking-[0.24em] text-[var(--socket-value)]">
                  Determinism
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Compile readable Move output from a constrained visual language.
                </p>
              </div>
              <div className="border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.78)] p-3 backdrop-blur-sm">
                <p className="font-heading text-[0.7rem] uppercase tracking-[0.24em] text-[var(--socket-entity)]">
                  Deploy
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Package workflows for on-chain execution without leaving the canvas.
                </p>
              </div>
            </div>
          </div>
        </section>
        <Sidebar />
      </main>
      <Footer />
    </div>
  );
}

export default App;
