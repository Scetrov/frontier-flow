import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useSuiClient as useSuiClientHook,
} from "@mysten/dapp-kit";

import type { AuthorizationProgressState, StoredDeploymentState, TurretInfo } from "../types/authorization";
import AuthorizeView from "../components/AuthorizeView";
import type { UseAuthorizationResult } from "../hooks/useAuthorization";
import type { UseTurretListResult } from "../hooks/useTurretList";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;

const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseCurrentWallet = vi.fn<() => CurrentWallet>();
const mockUseSuiClient = vi.fn<() => SuiClient>();
const mockUseTurretList = vi.fn<(input: unknown) => UseTurretListResult>();
const mockUseAuthorization = vi.fn<(input: unknown) => UseAuthorizationResult>();

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: () => mockUseCurrentAccount(),
  useCurrentWallet: () => mockUseCurrentWallet(),
  useSuiClient: () => mockUseSuiClient(),
}));

vi.mock("../hooks/useTurretList", () => ({
  useTurretList: (input: unknown) => mockUseTurretList(input),
}));

vi.mock("../hooks/useAuthorization", () => ({
  useAuthorization: (input: unknown) => mockUseAuthorization(input),
}));

const deploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

const connectedWalletAddress = "0x1234";

const connectedAccount = {
  address: connectedWalletAddress,
  chains: [],
  features: [],
  icon: undefined,
  label: undefined,
  publicKey: new Uint8Array(),
} as CurrentAccount;

const connectedWallet = {
  connectionStatus: "connected",
  currentWallet: { name: "Sui Wallet" },
  isConnected: true,
  isConnecting: false,
  isDisconnected: false,
  supportedIntents: [],
} as unknown as CurrentWallet;

const turretFixtures: readonly TurretInfo[] = [
  {
    objectId: "0x111",
    displayName: "Perimeter Lancer",
    currentExtension: null,
  },
  {
    objectId: "0x222",
    displayName: "Shield Bastion",
    currentExtension: {
      packageId: "0xfeedface",
      moduleName: "starter_contract",
      typeName: "0xfeedface::starter_contract::TurretAuth",
      isCurrentDeployment: true,
    },
  },
];

function createAuthorizationProgress(overrides: Partial<AuthorizationProgressState> = {}): AuthorizationProgressState {
  return {
    targetId: "testnet:stillness",
    targets: [{
      turretObjectId: "0x111",
      ownerCapId: "0xownercap",
      status: "confirmed",
      confirmationPhase: null,
      transactionDigest: "0xdigest",
      errorMessage: null,
    }],
    activeTurretObjectId: null,
    startedAt: 1,
    completedAt: 2,
    dismissedByUser: false,
    walletDisconnected: false,
    ...overrides,
  };
}

function createAuthorizationResult(overrides: Partial<UseAuthorizationResult> = {}): UseAuthorizationResult {
  const abortAuthorization = overrides.abortAuthorization ?? vi.fn();
  const cancelAuthorization = overrides.cancelAuthorization ?? vi.fn();
  const dismissProgress = overrides.dismissProgress ?? vi.fn();
  const retryEventConfirmation = overrides.retryEventConfirmation ?? vi.fn().mockResolvedValue(undefined);
  const startAuthorization = overrides.startAuthorization ?? vi.fn().mockResolvedValue(undefined);
  const results = overrides.results ?? [];
  const summary = overrides.summary ?? {
    confirmed: 0,
    failed: 0,
    pending: 0,
    warnings: 0,
    total: 0,
  };

  return {
    abortAuthorization,
    cancelAuthorization,
    dismissProgress,
    isAuthorizing: false,
    progress: null,
    results,
    retryEventConfirmation,
    startAuthorization,
    summary,
    ...overrides,
  } as UseAuthorizationResult;
}

beforeEach(() => {
  mockUseCurrentAccount.mockReturnValue(connectedAccount);
  mockUseCurrentWallet.mockReturnValue(connectedWallet);
  mockUseSuiClient.mockReturnValue({} as SuiClient);
  mockUseAuthorization.mockReturnValue(createAuthorizationResult());
});

describe("AuthorizeView", () => {
  it("renders a loading state while turrets are being fetched", () => {
    mockUseTurretList.mockReturnValue({
      status: "loading",
      turrets: [],
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeView deploymentState={deploymentState} />);

    expect(screen.getByText("Scanning deployed turrets")).toBeVisible();
    expect(screen.getByRole("button", { name: "Authorize Selected" })).toBeDisabled();
  });

  it("renders a retry action when the turret query fails", () => {
    const refresh = vi.fn();
    mockUseTurretList.mockReturnValue({
      status: "error",
      turrets: [],
      errorMessage: "GraphQL unavailable",
      refresh,
    });

    render(<AuthorizeView deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(screen.getByText("GraphQL unavailable")).toBeVisible();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders an empty state when no turrets are found", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: [],
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeView deploymentState={deploymentState} />);

    expect(screen.getByText("No turrets found")).toBeVisible();
  });

  it("renders the turret list and toggles selectable turrets", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeView deploymentState={deploymentState} />);

    const selectableTurret = screen.getByRole("checkbox", { name: /Perimeter Lancer/i });
    const alreadyAuthorizedTurret = screen.getByRole("checkbox", { name: /Shield Bastion/i });

    expect(alreadyAuthorizedTurret).toBeChecked();
    expect(alreadyAuthorizedTurret).toBeDisabled();
    expect(screen.getByRole("button", { name: "Authorize Selected" })).toBeDisabled();

    fireEvent.click(selectableTurret);

    expect(selectableTurret).toBeChecked();
    expect(screen.getByRole("button", { name: "Authorize Selected" })).toBeEnabled();
  });

  it("passes the connected wallet and deployment state into the turret hooks", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: [],
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeView deploymentState={deploymentState} />);

    expect(mockUseTurretList).toHaveBeenCalledWith(expect.objectContaining({
      deploymentState,
      walletAddress: "0x1234",
    }));
    expect(mockUseAuthorization).toHaveBeenCalledWith(expect.objectContaining({
      deploymentState,
      walletAccount: connectedAccount,
      currentWallet: connectedWallet,
    }));
  });

  it("renders linked code blocks for deployment ids and copies package and wallet values", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });

    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: [],
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeView deploymentState={deploymentState} />);

    expect(screen.getByRole("link", { name: deploymentState.packageId })).toHaveAttribute(
      "href",
      "https://suiscan.xyz/testnet/object/0xfeedface",
    );
    expect(screen.getByRole("link", { name: connectedWalletAddress })).toHaveAttribute(
      "href",
      "https://suiscan.xyz/testnet/account/0x1234",
    );
    expect(screen.getByText(deploymentState.packageId).closest("code")).not.toBeNull();
    expect(screen.getByText(deploymentState.moduleName).closest("code")).not.toBeNull();
    expect(screen.getByText(deploymentState.targetId).closest("code")).not.toBeNull();
    expect(screen.getByText(connectedWalletAddress).closest("code")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Copy package id" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(deploymentState.packageId);
    });
    expect(screen.getByRole("button", { name: "Copied package id" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Copy wallet address" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(connectedWalletAddress);
    });
    expect(screen.getByRole("button", { name: "Copied wallet address" })).toBeVisible();
  });

  it("starts authorization for the selected turret", () => {
    const startAuthorization = vi.fn().mockResolvedValue(undefined);
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });
    mockUseAuthorization.mockReturnValue(createAuthorizationResult({ startAuthorization }));

    render(<AuthorizeView deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Perimeter Lancer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Authorize Selected" }));

    expect(startAuthorization).toHaveBeenCalledWith(["0x111"]);
  });

  it("refreshes the turret list when the completed progress modal is closed", () => {
    const refresh = vi.fn();
    const dismissProgress = vi.fn();
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh,
    });
    mockUseAuthorization.mockReturnValue(createAuthorizationResult({
      dismissProgress,
      progress: createAuthorizationProgress(),
    }));

    render(<AuthorizeView deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(dismissProgress).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("cancels an in-progress batch and clears selection when the deployment target changes", () => {
    const cancelAuthorization = vi.fn();
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });
    mockUseAuthorization.mockReturnValue(createAuthorizationResult({
      cancelAuthorization,
      isAuthorizing: true,
    }));

    const { rerender } = render(<AuthorizeView deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Perimeter Lancer/i }));
    expect(screen.getByRole("button", { name: "Authorize Selected" })).toBeDisabled();

    rerender(<AuthorizeView deploymentState={{ ...deploymentState, targetId: "testnet:utopia" }} />);

    expect(cancelAuthorization).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Authorize Selected" })).toBeDisabled();
  });
});