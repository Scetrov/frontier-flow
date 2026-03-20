import { useEffect, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { authorableNodeDefinitions } from "../data/node-definitions";
import type { NodeDefinition } from "../types/nodes";
import { loadUiState, mergeUiState } from "../utils/uiStateStorage";
import DrawerHandle from "./DrawerHandle";
import ToolboxNodePreview from "./ToolboxNodePreview";

interface SidebarProps {
  readonly definitions?: readonly NodeDefinition[];
}

const categoryOrder = ["event-trigger", "static-data", "data-extractor", "logic-gate", "action"] as const;

const categoryLabels: Readonly<Record<(typeof categoryOrder)[number], string>> = {
  "event-trigger": "Event Trigger",
  "static-data": "Static Data",
  "data-extractor": "Data Extractor",
  "logic-gate": "Logic",
  action: "Action",
};

const desktopMediaQuery = "(min-width: 768px)";
const drawerHandleWidth = "2.75rem";
const drawerPanelWidth = "min(22rem, 88vw)";

function getIsDesktop() {
  if (typeof window === "undefined") {
    return true;
  }

  if (typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia(desktopMediaQuery).matches;
}

function Sidebar({ definitions = authorableNodeDefinitions }: SidebarProps) {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [isOpen, setIsOpen] = useState(
    () => loadUiState(typeof window === "undefined" ? undefined : window.localStorage).isSidebarOpen,
  );
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

    const mediaQuery = window.matchMedia(desktopMediaQuery);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, { isSidebarOpen: isOpen });
  }, [isOpen]);

  const handleDragStart = (
    event: ReactDragEvent<HTMLDivElement>,
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

  const drawerTransform = isOpen ? "translateX(0)" : `translateX(calc(100% - ${drawerHandleWidth}))`;

  return (
    <>
      {!isDesktop && isOpen ? (
        <button
          aria-label="Close node toolbox overlay"
          className="fixed inset-y-0 left-0 z-20 bg-black/40 md:hidden"
          onClick={() => {
            setIsOpen(false);
          }}
          style={{ right: `calc(${drawerPanelWidth} + ${drawerHandleWidth})` }}
          type="button"
        />
      ) : null}

      <div className="pointer-events-none fixed inset-y-0 right-0 z-30 flex md:absolute">
        <div
          className="pointer-events-auto flex h-full items-center transition-transform duration-200 ease-out"
          style={{ transform: drawerTransform }}
        >
          <DrawerHandle
            closeLabel="Close node toolbox"
            controls="node-toolbox"
            drawerLabel="Toolbox"
            expanded={isOpen}
            onClick={() => {
              setIsOpen((open) => !open);
            }}
            openLabel="Open node toolbox"
            side="right"
          />

          <aside
            aria-hidden={!isOpen}
            aria-label="Node toolbox"
            className="flex h-full max-h-full w-[min(22rem,88vw)] min-h-0 flex-col overflow-hidden border-l border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.96)] backdrop-blur-md md:w-80"
            id="node-toolbox"
            inert={!isOpen}
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
                          <ul className="space-y-4">
                            {group.definitions.map((definition) => (
                              <li key={definition.type}>
                                <ToolboxNodePreview definition={definition} onDragStart={handleDragStart} />
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
        </div>
      </div>
    </>
  );
}

export default Sidebar;