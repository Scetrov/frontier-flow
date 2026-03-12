import { useEffect, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { Menu, X } from "lucide-react";

import { nodeDefinitions } from "../data/node-definitions";
import type { NodeDefinition } from "../types/nodes";

interface SidebarProps {
  readonly definitions?: readonly NodeDefinition[];
}

function Sidebar({ definitions = nodeDefinitions }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsOpen(false);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const handleDragStart = (
    event: ReactDragEvent<HTMLButtonElement>,
    definition: NodeDefinition,
  ) => {
    event.dataTransfer.setData("application/reactflow", definition.type);
    event.dataTransfer.setData("application/label", definition.label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <>
      <button
        aria-controls="node-toolbox"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close node toolbox" : "Open node toolbox"}
        className="fixed right-4 top-20 z-40 border border-[var(--brand-orange)] bg-[rgba(26,10,10,0.92)] p-3 text-[var(--cream-white)] shadow-[0_0_0_1px_rgba(255,71,0,0.2)] md:hidden"
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        type="button"
      >
        {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>

      {isOpen ? (
        <button
          aria-label="Close node toolbox overlay"
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => {
            setIsOpen(false);
          }}
          type="button"
        />
      ) : null}

      <aside
        aria-label="Node toolbox"
        className={[
          "fixed inset-y-0 right-0 z-30 flex w-[min(22rem,88vw)] flex-col border-l border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.96)] backdrop-blur-md transition-transform duration-200 md:static md:z-0 md:w-80 md:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        id="node-toolbox"
      >
        <div className="border-b border-[var(--ui-border-dark)] px-4 py-4 sm:px-5">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.3em] text-[var(--brand-orange)]">
            Toolbox
          </p>
          <h2 className="mt-2 font-heading text-xl uppercase tracking-[0.14em] text-[var(--cream-white)]">
            Frontier Nodes
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Drag domain primitives onto the canvas to start a deterministic contract graph.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {definitions.length === 0 ? (
            <p className="border border-dashed border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.8)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              No node definitions available.
            </p>
          ) : (
            <ul className="space-y-3">
              {definitions.map((definition) => (
                <li key={definition.type}>
                  <button
                    className="group flex w-full cursor-grab flex-col items-start gap-2 border border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.82)] p-4 text-left transition-colors hover:border-[var(--brand-orange)] active:cursor-grabbing"
                    draggable="true"
                    onDragStart={(event) => {
                      handleDragStart(event, definition);
                    }}
                    type="button"
                  >
                    <div className="flex w-full items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 border border-[var(--cream-white)]"
                        style={{ backgroundColor: definition.color }}
                      />
                      <span className="font-heading text-sm uppercase tracking-[0.14em] text-[var(--cream-white)] group-hover:text-[var(--brand-orange)]">
                        {definition.label}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--text-secondary)]">
                      {definition.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;