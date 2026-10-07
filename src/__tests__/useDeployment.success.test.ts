import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { signTransaction as signTransactionFunction } from "@mysten/wallet-standard";

import { useDeployment } from "../hooks/useDeployment";
import { loadDeploymentState } from "../utils/deploymentStateStorage";
import { createGeneratedArtifactStub } from "./compiler/helpers";
import { createPublicationResult, createTurretAuthDatatype } from "../test/suiTransactionFixtures";

type CurrentAccount = { readonly address: string; readonly chains?: readonly string[]; readonly features?: readonly string[]; readonly icon?: undefined; readonly label?: undefined; readonly publicKey?: Uint8Array };
type CurrentWallet = { readonly isConnected?: boolean; readonly connectionStatus?: string; readonly currentWallet?: object | null; readonly isConnecting?: boolean; readonly isDisconnected?: boolean; readonly supportedIntents?: readonly string[] };
type SignAndExecuteTransaction = { readonly mutateAsync: (input: unknown) => Promise<unknown> };
type SuiClient = { readonly executeTransactionBlock?: (input: unknown) => Promise<unknown> };
type Wallets = readonly { readonly name: string }[];

const {
  mockGetWorldObject,
  mockGetTransaction,
  mockGetDatatype,
  mockCompileMove,
  mockCompileForDeployment,
  mockFetchWorldSource,
  mockGetProjectCachedDependencyResolution,
  mockSignTransaction,
  mockExecuteSigned,
  mockUseCurrentAccount,
  mockUseCurrentWallet,
  mockUseSignAndExecuteTransaction,
  mockUseSuiClient,
  mockUseWallets,
} = vi.hoisted(() => ({
  mockGetWorldObject: vi.fn<(input: { readonly objectId: string }) => Promise<unknown>>(),
  mockGetTransaction: vi.fn<() => Promise<unknown>>(),
  mockGetDatatype: vi.fn<() => { readonly response: Promise<unknown> }>(),
  mockCompileMove: vi.fn(),
  mockCompileForDeployment: vi.fn(),
  mockFetchWorldSource: vi.fn(),
  mockGetProjectCachedDependencyResolution: vi.fn(),
  mockSignTransaction: vi.fn<typeof signTransactionFunction>(),
  mockExecuteSigned: vi.fn(() => Promise.resolve({ digest: "0xdigest" })),
  mockUseCurrentAccount: vi.fn<() => CurrentAccount>(),
  mockUseCurrentWallet: vi.fn<() => CurrentWallet>(),
  mockUseSignAndExecuteTransaction: vi.fn<() => SignAndExecuteTransaction>(),
  mockUseSuiClient: vi.fn<() => SuiClient>(),
  mockUseWallets: vi.fn<() => Wallets>(),
}));
const availableWallet = { name: "Sui Wallet" };

function createConnectedWalletState(): CurrentWallet {
  return {
    connectionStatus: "connected",
    currentWallet: availableWallet,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    supportedIntents: [],
  };
}

vi.mock("../wallet/hooks", () => ({
  useFrontierWalletSession: () => ({
    account: mockUseCurrentAccount(),
    wallets: mockUseWallets(),
    isConnected: mockUseCurrentWallet().isConnected === true,
    isConnecting: false,
    disconnectPending: false,
    disconnect: vi.fn(),
    connect: vi.fn(),
    kit: {},
  }),
}));
vi.mock("../utils/suiWalletKit", () => ({
  signTargetTransaction: mockSignTransaction,
}));
vi.mock("../utils/suiTransactionExecution", async () => ({
  ...await vi.importActual<typeof import("../utils/suiTransactionExecution")>("../utils/suiTransactionExecution"),
  executeSignedGrpcTransaction: mockExecuteSigned,
}));

vi.mock("@mysten/wallet-standard", () => ({
  signTransaction: mockSignTransaction,
}));

vi.mock("../utils/suiTargetClient", () => ({
  getSuiTargetClient: () => ({ getObject: mockGetWorldObject }),
  createSuiTargetClient: () => ({ getTransaction: mockGetTransaction, movePackageService: { getDatatype: mockGetDatatype } }),
}));

vi.mock("../compiler/moveCompiler", () => ({
  compileMove: mockCompileMove,
}));

vi.mock("../deployment/worldSourceFetcher", () => ({
  fetchWorldSource: mockFetchWorldSource,
}));

vi.mock("../compiler/deployGradeCompiler", () => ({
  compileForDeployment: mockCompileForDeployment,
}));

vi.mock("../deployment/dependencySnapshotLoader", () => ({
  getProjectCachedDependencyResolution: mockGetProjectCachedDependencyResolution,
  createWorldSourceFromCachedResolution: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  mockGetProjectCachedDependencyResolution.mockResolvedValue(null);
  mockGetWorldObject.mockImplementation(({ objectId }) => Promise.resolve({ object: { objectId, type: "package", version: "1", digest: "11111111111111111111111111111111" } }));
  mockGetTransaction.mockResolvedValue(createPublicationResult("0xdigest"));
  mockGetDatatype.mockImplementation(() => ({ response: Promise.resolve(createTurretAuthDatatype()) }));
  mockUseCurrentAccount.mockReturnValue({
    address: "0x1234",
    chains: [],
    features: [],
    icon: undefined,
    label: undefined,
    publicKey: new Uint8Array(),
  });
  mockUseCurrentWallet.mockReturnValue(createConnectedWalletState());
  mockUseSignAndExecuteTransaction.mockReturnValue({ mutateAsync: vi.fn() });
  mockUseSuiClient.mockReturnValue({
    executeTransactionBlock: vi.fn(() => Promise.resolve({ digest: "0xdigest" })),
    getNormalizedMoveStruct: vi.fn(() => Promise.resolve({})),
    waitForTransaction: vi.fn(() => Promise.resolve({
      digest: "0xdigest",
      effects: { status: { status: "success" } },
      objectChanges: [{ type: "published", packageId: "0xabc123" }],
    })),
  } as unknown as SuiClient);
  mockUseWallets.mockReturnValue([availableWallet]);
  mockSignTransaction.mockResolvedValue({ bytes: "dGVzdA==", signature: "0xsig" });
  mockFetchWorldSource.mockResolvedValue({
    files: {
      "Move.toml": "[package]\nname = \"world\"\n",
      "sources/world.move": "module world::world {}",
    },
    sourceVersionTag: "v0.0.24",
    fetchedAt: new Date("2026-03-22T12:00:00.000Z").getTime(),
  });
  mockCompileForDeployment.mockResolvedValue({
    targetId: "testnet:stillness",
    modules: [new Uint8Array([1, 2, 3])],
    dependencies: [
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000000000000000000000000000002",
      "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
    ],
    digest: [1, 2, 3],
    resolvedDependencies: {
      files: "{}",
      dependencies: "{}",
      lockfileDependencies: "{}",
    },
    sourceVersionTag: "v0.0.24",
    builderToolchainVersion: "1.74.0",
    compiledAt: new Date("2026-03-22T12:00:00.500Z").getTime(),
  });
  mockCompileMove.mockImplementation((artifact: { bytecodeModules: readonly Uint8Array[]; dependencies: readonly string[] }) => Promise.resolve({
    success: true,
    modules: artifact.bytecodeModules.length > 0
      ? artifact.bytecodeModules
      : [new Uint8Array([1, 2, 3])],
    dependencies: artifact.dependencies.length > 0
      ? artifact.dependencies
      : [
          "0x0000000000000000000000000000000000000000000000000000000000000001",
          "0x0000000000000000000000000000000000000000000000000000000000000002",
          "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
        ],
    errors: null,
    warnings: [],
    artifact: {
      ...artifact,
      bytecodeModules: artifact.bytecodeModules.length > 0
        ? artifact.bytecodeModules
        : [new Uint8Array([1, 2, 3])],
      dependencies: artifact.dependencies.length > 0
        ? artifact.dependencies
        : [
            "0x0000000000000000000000000000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000000000000000000000000000002",
            "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
          ],
    },
  }));
  window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=0");
});

afterEach(async () => {
  await act(async () => {
    vi.runOnlyPendingTimers();
    await Promise.resolve();
  });
  vi.useRealTimers();
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("useDeployment success path", () => {
  it("creates a successful deployment result for the selected target", async () => {
    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    act(() => {
      result.current.setSelectedTarget("testnet:stillness");
    });

    await act(async () => {
      await result.current.startDeployment();
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(result.current.canDeploy).toBe(true);
    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.latestAttempt?.targetId).toBe("testnet:stillness");
    expect(result.current.latestAttempt?.packageId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.latestAttempt?.confirmationReference).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.deploymentStatus?.status).toBe("deployed");
    expect(result.current.deploymentStatus?.targetId).toBe("testnet:stillness");
    expect(result.current.deploymentStatus?.confirmationReference).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.current.statusMessage?.headline).toBe("Deployed");
    expect(loadDeploymentState(window.localStorage)).toEqual({
      version: 1,
      packageId: result.current.latestAttempt?.packageId,
      moduleName: artifact.moduleName,
      targetId: "testnet:stillness",
      transactionDigest: result.current.latestAttempt?.confirmationReference,
      deployedAt: new Date(result.current.latestAttempt?.endedAt ?? 0).toISOString(),
      contractName: artifact.moduleName,
      sourceVersionTag: "v0.0.24",
      builderToolchainVersion: "1.74.0",
    });
  });

  it("clears a persisted deployment snapshot when a new deployment starts", async () => {
    window.history.replaceState({}, "", "/?ff_mock_deploy_stage_delay_ms=1000");
    window.localStorage.setItem("frontier-flow:deployment", JSON.stringify({
      version: 1,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "local",
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "starter_contract",
    }));

    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "local",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    await act(async () => {
      await result.current.startDeployment();
    });

    expect(loadDeploymentState(window.localStorage)).toBeNull();
  });

  it.each(["missing", "unavailable"] as const)("blocks before consent when World package verification is %s", async (failure) => {
    window.history.replaceState({}, "", "/");
    if (failure === "missing") mockGetWorldObject.mockResolvedValueOnce({});
    else mockGetWorldObject.mockRejectedValueOnce(new Error("gRPC unavailable"));
    const artifact = createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] });
    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: { state: "compiled", bytecode: artifact.bytecodeModules, artifact },
    }));
    await act(async () => { await result.current.startDeployment(); });
    expect(result.current.latestAttempt?.outcome).toBe("blocked");
    expect(mockSignTransaction).not.toHaveBeenCalled();
    expect(mockCompileForDeployment).not.toHaveBeenCalled();
  });

  it("preserves the real attempt start time when the executor-backed remote path succeeds", async () => {
    vi.setSystemTime(new Date("2026-03-22T12:00:00.000Z"));
    mockExecuteSigned.mockImplementation(() => {
      vi.setSystemTime(new Date("2026-03-22T12:00:01.500Z"));
      return Promise.resolve({ digest: "0xdigest" });
    });
    mockGetTransaction.mockImplementation(() => {
      vi.setSystemTime(new Date("2026-03-22T12:00:02.000Z"));
      return Promise.resolve(createPublicationResult("0xdigest"));
    });
    window.history.replaceState({}, "", "/");

    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    await act(async () => {
      await result.current.startDeployment();
      await Promise.resolve();
    });

    expect(mockFetchWorldSource).toHaveBeenCalledTimes(1);
    expect(mockCompileForDeployment).toHaveBeenCalledTimes(1);
    expect(result.current.latestAttempt?.outcome).toBe("succeeded");
    expect(result.current.latestAttempt?.startedAt).toBe(Date.parse("2026-03-22T12:00:00.000Z"));
    expect(result.current.latestAttempt?.endedAt).toBe(Date.parse("2026-03-22T12:00:02.000Z"));
  });

  it("keeps the persisted deployment snapshot tied to the deployed module after later recompiles", async () => {
    const deployedArtifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });
    const recompiledArtifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      bytecodeModules: [new Uint8Array([4, 5, 6])],
    });

    const { result, rerender } = renderHook(
      ({ artifact }) => useDeployment({
        initialTarget: "testnet:stillness",
        status: {
          state: "compiled",
          bytecode: artifact.bytecodeModules,
          artifact,
        },
      }),
      { initialProps: { artifact: deployedArtifact } },
    );

    await act(async () => {
      await result.current.startDeployment();
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    const persistedSnapshot = loadDeploymentState(window.localStorage);
    expect(persistedSnapshot?.moduleName).toBe("starter_contract");

    rerender({ artifact: recompiledArtifact });

    expect(loadDeploymentState(window.localStorage)).toEqual(persistedSnapshot);
  });

  it("preserves a valid persisted deployment snapshot on mount", () => {
    window.localStorage.setItem("frontier-flow:deployment", JSON.stringify({
      version: 1,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "testnet:stillness",
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "starter_contract",
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
    }));

    const artifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    expect(loadDeploymentState(window.localStorage)).toEqual({
      version: 1,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "testnet:stillness",
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "starter_contract",
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
    });
  });

  it("clears a persisted deployment snapshot when the compiled module changes", () => {
    window.localStorage.setItem("frontier-flow:deployment", JSON.stringify({
      version: 1,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "testnet:stillness",
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "Starter Contract",
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
    }));

    const artifact = createGeneratedArtifactStub({
      moduleName: "renamed_contract",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    expect(loadDeploymentState(window.localStorage)).toBeNull();
  });

  it("clears a persisted deployment snapshot when the selected target changes", () => {
    window.localStorage.setItem("frontier-flow:deployment", JSON.stringify({
      version: 1,
      packageId: "0xabc",
      moduleName: "starter_contract",
      targetId: "testnet:stillness",
      transactionDigest: "0xdigest",
      deployedAt: "2026-03-23T00:00:00.000Z",
      contractName: "Starter Contract",
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
    }));

    const artifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    const { result } = renderHook(() => useDeployment({
      initialTarget: "testnet:stillness",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([1, 2, 3])],
        artifact,
      },
    }));

    expect(loadDeploymentState(window.localStorage)?.targetId).toBe("testnet:stillness");

    act(() => {
      result.current.setSelectedTarget("testnet:utopia");
    });

    expect(loadDeploymentState(window.localStorage)).toBeNull();
  });
});