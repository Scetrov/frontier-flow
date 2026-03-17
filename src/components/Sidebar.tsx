import { useEffect, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";

import { nodeDefinitions } from "../data/node-definitions";
import type { NodeDefinition } from "../types/nodes";

interface SidebarProps {
  readonly definitions?: readonly NodeDefinition[];
}

const categoryOrder = ["event-trigger", "data-accessor", "logic-gate", "data-source", "action"] as const;

const categoryLabels: Readonly<Record<(typeof categoryOrder)[number], string>> = {
  "event-trigger": "Event Trigger",
  "data-accessor": "Data Accessor",
  "logic-gate": "Logic Gate",
  "data-source": "Data Source",
  action: "Action",
};

function Sidebar({ definitions = nodeDefinitions }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const groupedDefinitions = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category],
      definitions: definitions.filter((definition) => definition.category === category),
    }))
    .filter((group) => group.definitions.length > 0);

  // All categories except the first are collapsed on load.
  const [collapsedCategories, setCollapsedCategories] = useState<ReadonlySet<string>>(
    () => new Set(groupedDefinitions.slice(1).map((g) => g.category)),
  );

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

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
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const offsetX = isFinite(rawX) ? Math.round(rawX) : 0;
    const offsetY = isFinite(rawY) ? Math.round(rawY) : 0;
    event.dataTransfer.setData("application/reactflow", definition.type);
    event.dataTransfer.setData("application/label", definition.label);
    event.dataTransfer.setData("application/x-offset", `${String(offsetX)},${String(offsetY)}`);
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
          "fixed inset-y-0 right-0 z-30 flex w-[min(22rem,88vw)] min-h-0 flex-col overflow-hidden border-l border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.96)] backdrop-blur-md transition-transform duration-200 md:static md:z-0 md:w-80 md:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        id="node-toolbox"
      >
        <div className="shrink-0 border-b border-[var(--ui-border-dark)] px-4 py-4 sm:px-5">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.3em] text-[var(--brand-orange)]">
            Toolbox
          </p>
          <h2 className="mt-2 font-heading text-xl uppercase tracking-[0.14em] text-[var(--cream-white)]">
            Frontier Nodes
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Drag nodes from the toolbox to start creating a flow.
          </p>
        </div>

        <div className="ff-toolbox__scroll flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {definitions.length === 0 ? (
            <p className="border border-dashed border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.8)] px-4 py-6 text-sm text-[var(--text-secondary)]">
              No node definitions available.
            </p>
          ) : (
            <div className="space-y-6">
              {groupedDefinitions.map((group) => {
                const isCollapsed = collapsedCategories.has(group.category);
                return (
                  <section key={group.category} aria-label={group.label} className="space-y-3">
                    <button
                      aria-expanded={!isCollapsed}
                      aria-label={`${group.label} category`}
                      className="flex w-full cursor-pointer items-center justify-between border-b border-[var(--ui-border-dark)] pb-2 text-left"
                      onClick={() => {
                        toggleCategory(group.category);
                      }}
                      type="button"
                    >
                      <h3 className="font-heading text-xs uppercase tracking-[0.22em] text-[var(--brand-orange)]">
                        {group.label}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          {group.definitions.length}
                        </span>
                        {isCollapsed ? (
                          <ChevronRight aria-hidden="true" className="h-3 w-3 text-[var(--text-secondary)]" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="h-3 w-3 text-[var(--text-secondary)]" />
                        )}
                      </div>
                    </button>

                    {!isCollapsed ? (
                      <ul className="space-y-3">
                        {group.definitions.map((definition) => (
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
                              <span className="font-heading text-[0.62rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                                {group.label} · {definition.sockets.length} sockets
                              </span>
                              <span className="text-sm text-[var(--text-secondary)]">{definition.description}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;