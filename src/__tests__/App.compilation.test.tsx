import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useSignAndExecuteTransaction as useSignAndExecuteTransactionHook,
  useSuiClient as useSuiClientHook,
  useWallets as useWalletsHook,
} from "@mysten/dapp-kit";

import App from "../App";
import { mergeDeploymentStatus } from "../utils/mergeDeploymentStatus";

import type { CompilationStatus, CompilerDiagnostic } from "../compiler/types";
import { createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SignAndExecuteTransaction = ReturnType<typeof useSignAndExecuteTransactionHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;
type Wallets = ReturnType<typeof useWalletsHook>;

interface CanvasWorkspaceProps {
  readonly onCompilationStateChange?: (
    status: CompilationStatus,
    diagnostics: readonly CompilerDiagnostic[],
    sourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => void;
}

interface MoveSourcePanelProps {
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

const moveSourcePanelSpy = vi.fn<(props: MoveSourcePanelProps) => void>();
let lastMoveSourcePanelProps: MoveSourcePanelProps | null = null;
let hasReportedCompilation = false;
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
  default: (props: { onViewChange?: (view: "visual" | "move") => void }) => (
    <button
      type="button"
      onClick={() => {
        props.onViewChange?.("move");
      }}
    >
      Header Slot
    </button>
  ),
}));

vi.mock("../components/Footer", () => ({
  default: () => <div>Footer Slot</div>,
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div>Sidebar Slot</div>,
}));

vi.mock("../components/KitchenSinkPage", () => ({
  default: () => <div>Kitchen Sink Slot</div>,
}));

vi.mock("../components/CanvasWorkspace", () => ({
  default: ({ onCompilationStateChange }: CanvasWorkspaceProps) => {
    if (!hasReportedCompilation) {
      hasReportedCompilation = true;
      queueMicrotask(() => {
        onCompilationStateChange?.(
          {
            state: "compiled",
            bytecode: [new Uint8Array([1, 2, 3])],
            artifact: createGeneratedArtifactStub({
              moduleName: "artifact_contract",
              sourceDagId: "artifact_contract",
              moveToml: "[package]",
              moveSource: "module builder_extensions::artifact_contract {}",
              bytecodeModules: [new Uint8Array([1, 2, 3])],
            }),
          },
          [],
          null,
          "module builder_extensions::artifact_contract {}",
        );
      });
    }

    return <div>Canvas Workspace Slot</div>;
  },
}));

vi.mock("../components/MoveSourcePanel", () => ({
  default: (props: MoveSourcePanelProps) => {
    lastMoveSourcePanelProps = props;
    moveSourcePanelSpy(props);
    return <div>Move Source Slot</div>;
  },
}));

describe("App compilation handoff", () => {
  beforeEach(() => {
    mockUseCurrentAccount.mockReturnValue(null);
    mockUseCurrentWallet.mockReturnValue({ isConnected: false } as CurrentWallet);
    mockUseSignAndExecuteTransaction.mockReturnValue({ mutateAsync: vi.fn() } as unknown as SignAndExecuteTransaction);
    mockUseSuiClient.mockReturnValue({} as SuiClient);
    mockUseWallets.mockReturnValue([]);
  });

  afterEach(() => {
    moveSourcePanelSpy.mockClear();
    lastMoveSourcePanelProps = null;
    hasReportedCompilation = false;
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
    mockUseCurrentAccount.mockReset();
    mockUseCurrentWallet.mockReset();
    mockUseSignAndExecuteTransaction.mockReset();
    mockUseSuiClient.mockReset();
    mockUseWallets.mockReset();
  });

  it("prefers artifact-backed Move source when the workspace reports it", async () => {
    render(<App />);

    expect(await screen.findByText("Canvas Workspace Slot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Header Slot" }));

    await waitFor(() => {
      expect(moveSourcePanelSpy).toHaveBeenCalled();
      expect(lastMoveSourcePanelProps).not.toBeNull();
      expect(lastMoveSourcePanelProps?.sourceCode).toBe("module builder_extensions::artifact_contract {}");
      expect(lastMoveSourcePanelProps?.status.state).toBe("compiled");
    });
  });

  it("does not merge deployment metadata from a different artifact revision", () => {
    const artifact = createGeneratedArtifactStub({ artifactId: "artifact-a" });
    const mismatchedDeploymentStatus = createDeploymentStatus("deployed", { artifactId: "artifact-b" });
    const status: CompilationStatus = {
      state: "compiled",
      bytecode: [new Uint8Array([1, 2, 3])],
      artifact,
    };

    expect(mergeDeploymentStatus(status, mismatchedDeploymentStatus)).toBe(status);
  });
});