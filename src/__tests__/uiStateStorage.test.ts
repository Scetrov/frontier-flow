import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadUiState, mergeUiState, UI_STATE_STORAGE_KEY } from "../utils/uiStateStorage";

const originalMatchMedia = window.matchMedia;

describe("uiStateStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "(min-width: 768px)",
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("returns responsive defaults when storage is empty", () => {
    expect(loadUiState(window.localStorage)).toEqual({
      version: 1,
      activeView: "visual",
      isSidebarOpen: true,
      isContractPanelOpen: true,
    });
  });

  it("falls back to defaults when storage is corrupted", () => {
    window.localStorage.setItem(UI_STATE_STORAGE_KEY, "{invalid-json");

    expect(loadUiState(window.localStorage)).toEqual({
      version: 1,
      activeView: "visual",
      isSidebarOpen: true,
      isContractPanelOpen: true,
    });
  });

  it("restores a previously saved state", () => {
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "move",
        isSidebarOpen: false,
        isContractPanelOpen: false,
      }),
    );

    expect(loadUiState(window.localStorage)).toEqual({
      version: 1,
      activeView: "move",
      isSidebarOpen: false,
      isContractPanelOpen: false,
    });
  });

  it("merges partial updates with the stored snapshot", () => {
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "visual",
        isSidebarOpen: true,
        isContractPanelOpen: false,
      }),
    );

    expect(mergeUiState(window.localStorage, { activeView: "move" })).toEqual({
      version: 1,
      activeView: "move",
      isSidebarOpen: true,
      isContractPanelOpen: false,
    });
  });

  it("uses mobile defaults when matchMedia reports a narrow viewport", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "(min-width: 768px)",
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    });

    expect(loadUiState(window.localStorage)).toEqual({
      version: 1,
      activeView: "visual",
      isSidebarOpen: false,
      isContractPanelOpen: false,
    });
  });
});