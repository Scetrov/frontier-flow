import { useEffect, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import ministryOfPassageLogo from "../../assets/TheMOPLogo.png";
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

interface DefinitionGroup {
  readonly category: (typeof categoryOrder)[number];
  readonly label: string;
  readonly definitions: readonly NodeDefinition[];
}

function getIsDesktop() {
  if (typeof window === "undefined") {
    return true;
  }

  if (typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia(desktopMediaQuery).matches;
}

function createGroupedDefinitions(definitions: readonly NodeDefinition[]): readonly DefinitionGroup[] {
  return categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category],
      definitions: definitions.filter((definition) => definition.category === category),
    }))
    .filter((group) => group.definitions.length > 0);
}

function createDragStartHandler(event: ReactDragEvent<HTMLButtonElement>, definition: NodeDefinition) {
  const rect = event.currentTarget.getBoundingClientRect();
  const rawX = event.clientX - rect.left;
  const rawY = event.clientY - rect.top;
  const offsetX = isFinite(rawX) ? Math.round(rawX) : 0;
  const offsetY = isFinite(rawY) ? Math.round(rawY) : 0;
  event.dataTransfer.setData("application/reactflow", definition.type);
  event.dataTransfer.setData("application/label", definition.label);
  event.dataTransfer.setData("application/x-offset", `${String(offsetX)},${String(offsetY)}`);
  event.dataTransfer.effectAllowed = "move";
}

function SidebarOverlay({ isDesktop, isOpen, onClose }: { readonly isDesktop: boolean; readonly isOpen: boolean; readonly onClose: () => void }) {
  if (isDesktop || !isOpen) {
    return null;
  }

  return (
    <button
      aria-label="Close node toolbox overlay"
      className="fixed inset-y-0 left-0 z-20 bg-black/40 md:hidden"
      onClick={onClose}
      style={{ right: `calc(${drawerPanelWidth} + ${drawerHandleWidth})` }}
      type="button"
    />
  );
}

function SidebarHeader() {
  return (
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
  );
}

function SidebarFooterCta() {
  return (
    <div className="shrink-0 border-t border-[var(--ui-border-dark)] px-4 py-4 sm:px-5">
      <p className="font-heading text-[0.62rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">
        Colaborative Automation
      </p>
      <a
        className="group mt-3 flex items-center gap-3 px-3 py-3 text-left transition-colors"
        href="https://themop.dev"
        rel="noreferrer"
        target="_blank"
      >
        <img alt="" className="h-14 w-auto shrink-0" src={ministryOfPassageLogo} />
        <span className="min-w-0">
          <span className="block font-heading text-[0.8rem] uppercase tracking-[0.16em] text-[var(--cream-white)] transition-colors group-hover:text-[var(--brand-orange)]">
            themop.dev
          </span>
          <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
            Use Ministry of Passage in your gates and storage for collaborative automation.
          </span>
        </span>
      </a>
    </div>
  );
}

function SidebarCategorySection({
  group,
  isCollapsed,
  onDragStart,
  onToggle,
}: {
  readonly group: DefinitionGroup;
  readonly isCollapsed: boolean;
  readonly onDragStart: (event: ReactDragEvent<HTMLButtonElement>, definition: NodeDefinition) => void;
  readonly onToggle: () => void;
}) {
  return (
    <section aria-label={group.label} className="space-y-3">
      <button
        aria-expanded={!isCollapsed}
        aria-label={`${group.label} category`}
        className="flex w-full cursor-pointer items-center justify-between border-b border-[var(--ui-border-dark)] pb-2 text-left"
        onClick={onToggle}
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
              <ToolboxNodePreview definition={definition} onDragStart={onDragStart} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function SidebarDrawer({
  collapsedCategories,
  groupedDefinitions,
  isOpen,
  onDragStart,
  onToggleCategory,
  onToggleOpen,
}: {
  readonly collapsedCategories: ReadonlySet<string>;
  readonly groupedDefinitions: readonly DefinitionGroup[];
  readonly isOpen: boolean;
  readonly onDragStart: (event: ReactDragEvent<HTMLButtonElement>, definition: NodeDefinition) => void;
  readonly onToggleCategory: (category: string) => void;
  readonly onToggleOpen: () => void;
}) {
  const drawerTransform = isOpen ? "translateX(0)" : `translateX(calc(100% - ${drawerHandleWidth}))`;

  return (
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
          onClick={onToggleOpen}
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
          <SidebarHeader />

          <div className="ff-toolbox__scroll flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {groupedDefinitions.length === 0 ? (
              <p className="border border-dashed border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.8)] px-4 py-6 text-sm text-[var(--text-secondary)]">
                No node definitions available.
              </p>
            ) : (
              <div className="space-y-6">
                {groupedDefinitions.map((group) => (
                  <SidebarCategorySection
                    group={group}
                    isCollapsed={collapsedCategories.has(group.category)}
                    key={group.category}
                    onDragStart={onDragStart}
                    onToggle={() => {
                      onToggleCategory(group.category);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <SidebarFooterCta />
        </aside>
      </div>
    </div>
  );
}

function Sidebar({ definitions = authorableNodeDefinitions }: SidebarProps) {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [isOpen, setIsOpen] = useState(
    () => loadUiState(typeof window === "undefined" ? undefined : window.localStorage).isSidebarOpen,
  );
  const groupedDefinitions = createGroupedDefinitions(definitions);

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

  return (
    <>
      <SidebarOverlay isDesktop={isDesktop} isOpen={isOpen} onClose={() => {
        setIsOpen(false);
      }} />
      <SidebarDrawer
        collapsedCategories={collapsedCategories}
        groupedDefinitions={groupedDefinitions}
        isOpen={isOpen}
        onDragStart={createDragStartHandler}
        onToggleCategory={toggleCategory}
        onToggleOpen={() => {
          setIsOpen((open) => !open);
        }}
      />
    </>
  );
}

export default Sidebar;