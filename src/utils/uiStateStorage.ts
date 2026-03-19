export const UI_STATE_STORAGE_KEY = "frontier-flow:ui-state";

export type StoredPrimaryView = "visual" | "move";

export interface UiState {
  readonly version: 1;
  readonly activeView: StoredPrimaryView;
  readonly isSidebarOpen: boolean;
  readonly isContractPanelOpen: boolean;
}

const desktopMediaQuery = "(min-width: 768px)";

/**
 * Loads persisted UI state and falls back to responsive defaults when storage is empty or invalid.
 */
export function loadUiState(storage: Storage | undefined): UiState {
  const rawValue = storage?.getItem(UI_STATE_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return createDefaultUiState();
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return parseUiState(parsedValue);
  } catch {
    return createDefaultUiState();
  }
}

/**
 * Persists the full UI state snapshot to local storage.
 */
export function saveUiState(storage: Storage | undefined, state: UiState): void {
  storage?.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Merges a partial UI-state update with the latest persisted snapshot before saving it.
 */
export function mergeUiState(storage: Storage | undefined, patch: Partial<Omit<UiState, "version">>): UiState {
  const nextState: UiState = {
    ...loadUiState(storage),
    ...patch,
    version: 1,
  };

  saveUiState(storage, nextState);
  return nextState;
}

function createDefaultUiState(): UiState {
  const isDesktop = getIsDesktop();

  return {
    version: 1,
    activeView: "visual",
    isSidebarOpen: isDesktop,
    isContractPanelOpen: isDesktop,
  };
}

function parseUiState(parsedValue: unknown): UiState {
  if (!isRecord(parsedValue)) {
    return createDefaultUiState();
  }

  const defaults = createDefaultUiState();

  return {
    version: 1,
    activeView: parsedValue.activeView === "move" ? "move" : defaults.activeView,
    isSidebarOpen: typeof parsedValue.isSidebarOpen === "boolean" ? parsedValue.isSidebarOpen : defaults.isSidebarOpen,
    isContractPanelOpen:
      typeof parsedValue.isContractPanelOpen === "boolean"
        ? parsedValue.isContractPanelOpen
        : defaults.isContractPanelOpen,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}