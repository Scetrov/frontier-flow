import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";

import App from "../App";
import { createDefaultContractFlow } from "../data/kitchenSinkFlow";
import { UI_STATE_STORAGE_KEY } from "../utils/uiStateStorage";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type Wallets = ReturnType<typeof useWalletsHook>;

interface CanvasWorkspaceSpyProps {
  readonly initialNodes?: unknown;
  readonly initialEdges?: unknown;
  readonly initialContractName?: string;
  readonly focusedDiagnosticNodeId?: string | null;
  readonly focusedDiagnosticRequestKey?: number;
}

const canvasWorkspaceSpy = vi.fn<(props: CanvasWorkspaceSpyProps) => void>();
const footerSpy = vi.fn();
const headerSpy = vi.fn();
const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseCurrentWallet = vi.fn<() => CurrentWallet>();
const mockUseWallets = vi.fn<() => Wallets>();

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: () => mockUseCurrentAccount(),
  useCurrentWallet: () => mockUseCurrentWallet(),
  useWallets: () => mockUseWallets(),
}));

vi.mock("../components/Header", () => ({
  default: (props: { activeView?: string; onViewChange?: (view: "visual" | "move") => void }) => {
    headerSpy(props);
    return (
      <button
        type="button"
        onClick={() => {
          props.onViewChange?.("move");
        }}
      >
        Header Slot
      </button>
    );
  },
}));

vi.mock("../components/Footer", () => ({
  default: (props: { onSelectDiagnostic?: (nodeId: string) => void }) => {
    footerSpy(props);
    return (
      <button
        type="button"
        onClick={() => {
          props.onSelectDiagnostic?.("node_1");
        }}
      >
        Footer Slot
      </button>
    );
  },
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div>Sidebar Slot</div>,
}));

vi.mock("../components/CanvasWorkspace", () => ({
  default: (props: CanvasWorkspaceSpyProps) => {
    canvasWorkspaceSpy(props);
    return <div>Canvas Workspace Slot</div>;
  },
}));

vi.mock("../components/KitchenSinkPage", () => ({
  default: () => <div>Kitchen Sink Slot</div>,
}));

vi.mock("../components/IconPreviewPage", () => ({
  default: () => <div>Icon Preview Slot</div>,
}));

vi.mock("../components/MoveSourcePanel", () => ({
  default: () => <div>Move Source Slot</div>,
}));

describe("App", () => {
  const defaultContractFlow = createDefaultContractFlow();

  beforeEach(() => {
    mockUseCurrentAccount.mockReturnValue(null);
    mockUseCurrentWallet.mockReturnValue({ isConnected: false } as CurrentWallet);
    mockUseWallets.mockReturnValue([]);
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
    canvasWorkspaceSpy.mockClear();
    footerSpy.mockClear();
    headerSpy.mockClear();
    mockUseCurrentAccount.mockReset();
    mockUseCurrentWallet.mockReset();
    mockUseWallets.mockReset();
  });

  it("renders the default editor shell on the root route", async () => {
    window.history.replaceState({}, "", "/");

    render(<App />);

    expect(screen.getByLabelText("Application shell")).toBeInTheDocument();
    expect(await screen.findByText("Canvas Workspace Slot")).toBeInTheDocument();
    expect(await screen.findByText("Sidebar Slot")).toBeInTheDocument();
    expect(screen.queryByText("Kitchen Sink Slot")).not.toBeInTheDocument();
    expect(canvasWorkspaceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        initialContractName: "Starter Contract",
        initialNodes: defaultContractFlow.nodes,
        initialEdges: defaultContractFlow.edges,
      }),
    );
  });

  it("restores the primary view from local storage", () => {
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "move",
        isSidebarOpen: true,
        isContractPanelOpen: true,
      }),
    );

    render(<App />);

    expect(headerSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeView: "move",
      }),
    );
  });

  it("persists the primary view when the header switches tabs", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Header Slot" }));

    expect(JSON.parse(window.localStorage.getItem(UI_STATE_STORAGE_KEY) ?? "{}")).toMatchObject({
      activeView: "move",
    });
  });

  it("renders the kitchen sink page on the /kitchen-sink route", async () => {
    window.history.replaceState({}, "", "/kitchen-sink");

    render(<App />);

    expect(await screen.findByText("Kitchen Sink Slot")).toBeInTheDocument();
    expect(screen.queryByLabelText("Application shell")).not.toBeInTheDocument();
    expect(screen.queryByText("Sidebar Slot")).not.toBeInTheDocument();
  });

  it("renders the icon preview pages on the /icon-preview route family", async () => {
    window.history.replaceState({}, "", "/icon-preview/product-fit");

    render(<App />);

    expect(await screen.findByText("Icon Preview Slot")).toBeInTheDocument();
    expect(screen.queryByLabelText("Application shell")).not.toBeInTheDocument();
    expect(screen.queryByText("Sidebar Slot")).not.toBeInTheDocument();
    expect(headerSpy).not.toHaveBeenCalled();
  });

  it("reissues diagnostic focus requests when the same item is selected repeatedly", () => {
    window.history.replaceState({}, "", "/");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Footer Slot" }));
    const firstRequest = canvasWorkspaceSpy.mock.lastCall?.[0];

    fireEvent.click(screen.getByRole("button", { name: "Footer Slot" }));
    const secondRequest = canvasWorkspaceSpy.mock.lastCall?.[0];

    expect(firstRequest).toEqual(
      expect.objectContaining({
        focusedDiagnosticNodeId: "node_1",
        focusedDiagnosticRequestKey: 1,
      }),
    );
    expect(secondRequest).toEqual(
      expect.objectContaining({
        focusedDiagnosticNodeId: "node_1",
        focusedDiagnosticRequestKey: 2,
      }),
    );
  });
});