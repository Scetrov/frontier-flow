import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useSignAndExecuteTransaction as useSignAndExecuteTransactionHook,
  useSuiClient as useSuiClientHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";

import App from "../App";
import { createDefaultContractFlow } from "../data/kitchenSinkFlow";
import { createCompilationGraphKey } from "../utils/compilationGraphKey";
import { saveCompilationState } from "../utils/compilationStateStorage";
import { UI_STATE_STORAGE_KEY } from "../utils/uiStateStorage";
import { createGeneratedArtifactStub } from "./compiler/helpers";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SignAndExecuteTransaction = ReturnType<typeof useSignAndExecuteTransactionHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;
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
const mockUseSignAndExecuteTransaction = vi.fn<() => SignAndExecuteTransaction>();
const mockUseSuiClient = vi.fn<() => SuiClient>();
const mockUseWallets = vi.fn<() => Wallets>();

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: () => mockUseCurrentAccount(),
  useCurrentWallet: () => mockUseCurrentWallet(),
  useSignAndExecuteTransaction: () => mockUseSignAndExecuteTransaction(),
  useSuiClient: () => mockUseSuiClient(),
  useWallets: () => mockUseWallets(),
}));

vi.mock("../components/Header", () => ({
  default: (props: { activeView?: string; onViewChange?: (view: "visual" | "move" | "deploy" | "authorize") => void }) => {
    headerSpy(props);
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            props.onViewChange?.("move");
          }}
        >
          Header Move Slot
        </button>
        <button
          type="button"
          onClick={() => {
            props.onViewChange?.("deploy");
          }}
        >
          Header Deploy Slot
        </button>
      </div>
    );
  },
}));

vi.mock("../components/Footer", () => ({
  default: (props: { onSelectDiagnostic?: (nodeId: string) => void; transientStatusMessage?: { text: string } | null }) => {
    footerSpy(props);
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            props.onSelectDiagnostic?.("node_1");
          }}
        >
          Footer Slot
        </button>
        {props.transientStatusMessage ? <span>{props.transientStatusMessage.text}</span> : null}
      </div>
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
    mockUseSignAndExecuteTransaction.mockReturnValue({ mutateAsync: vi.fn() } as unknown as SignAndExecuteTransaction);
    mockUseSuiClient.mockReturnValue({} as SuiClient);
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
    mockUseSignAndExecuteTransaction.mockReset();
    mockUseSuiClient.mockReset();
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

  it("renders the deployment target selector in the visual workspace and persists changes", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Target network/server" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "testnet:utopia" }));

    expect(JSON.parse(window.localStorage.getItem(UI_STATE_STORAGE_KEY) ?? "{}")).toMatchObject({
      selectedDeploymentTarget: "testnet:utopia",
    });
  });

  it("falls back from persisted move to visual until the compiled workflow is ready", () => {
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "move",
        selectedDeploymentTarget: "local",
        isSidebarOpen: true,
        isContractPanelOpen: true,
      }),
    );

    render(<App />);

    expect(headerSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeView: "visual",
      }),
    );
  });

  it("restores the persisted move view when a matching compilation snapshot exists", async () => {
    const artifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      moveSource: "module builder_extensions::starter_contract {}",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    saveCompilationState(window.localStorage, {
      version: 1,
      graphKey: createCompilationGraphKey(defaultContractFlow.nodes, defaultContractFlow.edges, "Starter Contract"),
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
      diagnostics: [],
      moveSourceCode: artifact.moveSource,
    });
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "move",
        selectedDeploymentTarget: "local",
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
    expect(await screen.findByText("Move Source Slot")).toBeInTheDocument();
  });

  it("lets Move reopen from visual while the matching cached build is available", async () => {
    const artifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      moveSource: "module builder_extensions::starter_contract {}",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    saveCompilationState(window.localStorage, {
      version: 1,
      graphKey: createCompilationGraphKey(defaultContractFlow.nodes, defaultContractFlow.edges, "Starter Contract"),
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
      diagnostics: [],
      moveSourceCode: artifact.moveSource,
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Header Move Slot" }));

    expect(await screen.findByText("Move Source Slot")).toBeInTheDocument();
  });

  it("falls back from authorize to visual when no valid deployment state exists", () => {
    window.localStorage.setItem(
      UI_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        activeView: "authorize",
        selectedDeploymentTarget: "local",
        isSidebarOpen: true,
        isContractPanelOpen: true,
      }),
    );

    render(<App />);

    expect(headerSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeView: "visual",
      }),
    );
  });

  it("persists the primary view when the header switches tabs", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Header Move Slot" }));

    expect(JSON.parse(window.localStorage.getItem(UI_STATE_STORAGE_KEY) ?? "{}")).toMatchObject({
      activeView: "visual",
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