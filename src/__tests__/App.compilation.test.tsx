import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { mergeUiState } from "../utils/uiStateStorage";

import type { CompilationStatus, CompilerDiagnostic } from "../compiler/types";
import { createDeploymentStatus, createGeneratedArtifactStub } from "./compiler/helpers";

const mockBeginGitHubOAuthPopup = vi.fn<typeof import("../utils/githubAuthClient").beginGitHubOAuthPopup>();
const mockValidateGitHubToken = vi.fn<typeof import("../utils/githubAuthClient").validateGitHubToken>();

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
  readonly onRebuild?: () => Promise<void>;
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

const deployWorkflowViewSpy = vi.fn();
const footerSpy = vi.fn();
const moveSourcePanelSpy = vi.fn<(props: MoveSourcePanelProps) => void>();
let lastMoveSourcePanelProps: MoveSourcePanelProps | null = null;
let hasReportedCompilation = false;
const mockCompilePipeline = vi.fn<typeof import("../compiler/pipeline").compilePipeline>();
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

vi.mock("../utils/githubAuthClient", async () => {
  const actual = await vi.importActual<typeof import("../utils/githubAuthClient")>("../utils/githubAuthClient");
  return {
    ...actual,
    beginGitHubOAuthPopup: (...args: Parameters<typeof actual.beginGitHubOAuthPopup>) => mockBeginGitHubOAuthPopup(...args),
    validateGitHubToken: (...args: Parameters<typeof actual.validateGitHubToken>) => mockValidateGitHubToken(...args),
  };
});

vi.mock("../components/Header", () => ({
  default: (props: { gitHubAccessState?: { mode: string }; onGitHubSignIn?: () => void; onViewChange?: (view: "visual" | "move" | "deploy") => void }) => (
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
      <button type="button" onClick={props.onGitHubSignIn}>Header GitHub Sign-In Slot</button>
      <span>{props.gitHubAccessState?.mode ?? "anonymous"}</span>
    </div>
  ),
}));

vi.mock("../components/Footer", () => ({
  default: (props: { transientStatusMessage?: { text: string } | null }) => {
    footerSpy(props);
    return <div>{props.transientStatusMessage?.text ?? "Footer Slot"}</div>;
  },
}));

vi.mock("../compiler/pipeline", () => ({
  compilePipeline: (...args: Parameters<typeof import("../compiler/pipeline").compilePipeline>) => mockCompilePipeline(...args),
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

vi.mock("../components/DeployWorkflowView", () => ({
  default: (props: unknown) => {
    deployWorkflowViewSpy(props);
    return <div>Deploy Workflow Slot</div>;
  },
}));

describe("App compilation handoff", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GITHUB_CLIENT_ID", "client-id");
    mockUseCurrentAccount.mockReturnValue(null);
    mockUseCurrentWallet.mockReturnValue({ isConnected: false } as CurrentWallet);
    mockUseSignAndExecuteTransaction.mockReturnValue({ mutateAsync: vi.fn() } as unknown as SignAndExecuteTransaction);
    mockUseSuiClient.mockReturnValue({} as SuiClient);
    mockUseWallets.mockReturnValue([]);
  });

  afterEach(() => {
    deployWorkflowViewSpy.mockClear();
    footerSpy.mockClear();
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
    mockCompilePipeline.mockReset();
    mockBeginGitHubOAuthPopup.mockReset();
    mockValidateGitHubToken.mockReset();
    vi.unstubAllEnvs();
  });

  it("prefers artifact-backed Move source when the workspace reports it", async () => {
    render(<App />);

    expect(await screen.findByText("Canvas Workspace Slot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Header Move Slot" }));

    await waitFor(() => {
      expect(moveSourcePanelSpy).toHaveBeenCalled();
      expect(lastMoveSourcePanelProps).not.toBeNull();
      expect(lastMoveSourcePanelProps?.sourceCode).toBe("module builder_extensions::artifact_contract {}");
      expect(lastMoveSourcePanelProps?.status.state).toBe("compiled");
    });
  });

  it("routes compiled workflows into the deploy step", async () => {
    render(<App />);

    expect(await screen.findByText("Canvas Workspace Slot")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Header Deploy Slot" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Header Deploy Slot" }));

    await waitFor(() => {
      expect(screen.getByText("Deploy Workflow Slot")).toBeInTheDocument();
      expect(deployWorkflowViewSpy).toHaveBeenCalled();
    });
  });

  it("shows footer rebuild success feedback after a manual Move rebuild completes", async () => {
    mockCompilePipeline.mockResolvedValue({
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([4, 5, 6])],
        artifact: createGeneratedArtifactStub({
          moduleName: "starter_contract",
          moveSource: "module builder_extensions::starter_contract {}",
          bytecodeModules: [new Uint8Array([4, 5, 6])],
        }),
      },
      diagnostics: [],
      code: "module builder_extensions::starter_contract {}",
      sourceMap: null,
      optimizationReport: null,
      artifact: createGeneratedArtifactStub({
        moduleName: "starter_contract",
        moveSource: "module builder_extensions::starter_contract {}",
        bytecodeModules: [new Uint8Array([4, 5, 6])],
      }),
    });

    render(<App />);

    expect(await screen.findByText("Canvas Workspace Slot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Header Move Slot" }));

    await waitFor(() => {
      expect(lastMoveSourcePanelProps?.onRebuild).toBeTypeOf("function");
    });

    await act(async () => {
      await lastMoveSourcePanelProps?.onRebuild?.();
    });

    await waitFor(() => {
      expect(footerSpy).toHaveBeenLastCalledWith(expect.objectContaining({
        transientStatusMessage: { tone: "success", text: "Rebuild success" },
      }));
      expect(screen.getByText("Rebuild success")).toBeInTheDocument();
    });
  });

  it("rebuilds using the persisted live draft contract name", async () => {
    mergeUiState(window.localStorage, { currentDraftContractName: "Turret Priority Draft" });
    mockCompilePipeline.mockResolvedValue({
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([7, 8, 9])],
        artifact: createGeneratedArtifactStub({
          moduleName: "turret_priority_draft",
          moveSource: "module builder_extensions::turret_priority_draft {}",
          bytecodeModules: [new Uint8Array([7, 8, 9])],
        }),
      },
      diagnostics: [],
      code: "module builder_extensions::turret_priority_draft {}",
      sourceMap: null,
      optimizationReport: null,
      artifact: createGeneratedArtifactStub({
        moduleName: "turret_priority_draft",
        moveSource: "module builder_extensions::turret_priority_draft {}",
        bytecodeModules: [new Uint8Array([7, 8, 9])],
      }),
    });

    render(<App />);

    expect(await screen.findByText("Canvas Workspace Slot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Header Move Slot" }));

    await waitFor(() => {
      expect(lastMoveSourcePanelProps?.onRebuild).toBeTypeOf("function");
    });

    await act(async () => {
      await lastMoveSourcePanelProps?.onRebuild?.();
    });

    expect(mockCompilePipeline).toHaveBeenLastCalledWith(expect.objectContaining({
      moduleName: "Turret Priority Draft",
    }));
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

  it("retries a blocked rebuild once after GitHub sign-in succeeds", async () => {
    const rateLimitDiagnostic: CompilerDiagnostic = {
      severity: "error",
      stage: "compilation",
      rawMessage: "429 Too Many Requests while fetching https://raw.githubusercontent.com/MystenLabs/sui/.../token.move",
      line: null,
      reactFlowNodeId: null,
      socketId: null,
      userMessage: "Compilation could not fetch upstream Sui framework sources because the dependency host rate limited the request. Wait for the limit to reset, then retry compile.",
    };

    mockCompilePipeline
      .mockResolvedValueOnce({
        status: {
          state: "error",
          diagnostics: [rateLimitDiagnostic],
          artifact: createGeneratedArtifactStub({
            moduleName: "starter_contract",
            moveSource: "module builder_extensions::starter_contract {}",
          }),
        },
        diagnostics: [rateLimitDiagnostic],
        code: null,
        sourceMap: null,
        optimizationReport: null,
        artifact: createGeneratedArtifactStub({
          moduleName: "starter_contract",
          moveSource: "module builder_extensions::starter_contract {}",
        }),
      })
      .mockResolvedValueOnce({
        status: {
          state: "compiled",
          bytecode: [new Uint8Array([4, 5, 6])],
          artifact: createGeneratedArtifactStub({
            moduleName: "starter_contract",
            moveSource: "module builder_extensions::starter_contract {}",
            bytecodeModules: [new Uint8Array([4, 5, 6])],
          }),
        },
        diagnostics: [],
        code: "module builder_extensions::starter_contract {}",
        sourceMap: null,
        optimizationReport: null,
        artifact: createGeneratedArtifactStub({
          moduleName: "starter_contract",
          moveSource: "module builder_extensions::starter_contract {}",
          bytecodeModules: [new Uint8Array([4, 5, 6])],
        }),
      });
    mockBeginGitHubOAuthPopup.mockResolvedValue({
      type: "ff:github-auth:success",
      token: "test-token",
      scopeHeader: "",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: [],
    });
    mockValidateGitHubToken.mockResolvedValue({
      scopeHeader: "repo",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: ["repo"],
    });

    render(<App />);

    expect(await screen.findByText("Canvas Workspace Slot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Header Move Slot" }));

    await waitFor(() => {
      expect(lastMoveSourcePanelProps?.onRebuild).toBeTypeOf("function");
    });

    await act(async () => {
      await lastMoveSourcePanelProps?.onRebuild?.();
    });

    expect(await screen.findByText(/GitHub rate limited the blocked dependency fetch/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Header GitHub Sign-In Slot" }));

    await waitFor(() => {
      expect(mockCompilePipeline).toHaveBeenCalledTimes(2);
      expect(screen.getByText("authenticated")).toBeInTheDocument();
    });
  });
});