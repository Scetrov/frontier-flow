import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  useCurrentAccount as useCurrentAccountHook,
  useCurrentWallet as useCurrentWalletHook,
  useSuiClient as useSuiClientHook,
} from "@mysten/dapp-kit";

import type { AuthorizationProgressState, StoredDeploymentState, TurretInfo } from "../types/authorization";
import type { SimulationReferenceDataPayload } from "../types/turretSimulation";
import AuthorizeView from "../components/AuthorizeView";
import type { PrimaryView } from "../components/Header";
import type { UseAuthorizationResult } from "../hooks/useAuthorization";
import type { UseTurretListResult } from "../hooks/useTurretList";
import type { FetchOwnerCapInput } from "../utils/authorizationTransaction";
import { createDevInspectErrorResponse, createDevInspectSuccessResponse } from "../test/turretSimulationMocks";
import { encodeSimulationPriorityEntries } from "../utils/turretSimulationCodec";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;
type CurrentWallet = ReturnType<typeof useCurrentWalletHook>;
type SuiClient = ReturnType<typeof useSuiClientHook>;
type DevInspectTransactionBlock = SuiClient["devInspectTransactionBlock"];
type AuthorizeWorkflowView = Extract<PrimaryView, "authorize" | "simulate">;

const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseCurrentWallet = vi.fn<() => CurrentWallet>();
const mockUseSuiClient = vi.fn<() => SuiClient>();
const mockUseTurretList = vi.fn<(input: unknown) => UseTurretListResult>();
const mockUseAuthorization = vi.fn<(input: unknown) => UseAuthorizationResult>();
const { mockFetchSimulationOwnerCharacterId, mockLoadSimulationReferenceData } = vi.hoisted(() => ({
  mockFetchSimulationOwnerCharacterId: vi.fn<(input: FetchOwnerCapInput) => Promise<string>>(),
  mockLoadSimulationReferenceData: vi.fn<(input: unknown) => Promise<SimulationReferenceDataPayload>>(),
}));

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

vi.mock("../utils/authorizationTransaction", async () => {
  const actual = await vi.importActual<typeof import("../utils/authorizationTransaction")>("../utils/authorizationTransaction");

  return {
    ...actual,
    fetchSimulationOwnerCharacterId: (input: FetchOwnerCapInput) => mockFetchSimulationOwnerCharacterId(input),
  };
});

vi.mock("../utils/turretSimulationReferenceData", async () => {
  const actual = await vi.importActual<typeof import("../utils/turretSimulationReferenceData")>("../utils/turretSimulationReferenceData");

  return {
    ...actual,
    loadSimulationReferenceData: (input: unknown) => mockLoadSimulationReferenceData(input),
  };
});

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

function createSuiClient(overrides: Partial<SuiClient> = {}): SuiClient {
  return {
    devInspectTransactionBlock: vi.fn<DevInspectTransactionBlock>(() => Promise.resolve(createDevInspectSuccessResponse([]))),
    ...overrides,
  } as SuiClient;
}

function AuthorizeViewHarness(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly initialView?: AuthorizeWorkflowView;
}) {
  const { deploymentState, initialView = "authorize" } = input;
  const [activeView, setActiveView] = useState<AuthorizeWorkflowView>(initialView);

  return (
    <AuthorizeView
      activeView={activeView}
      deploymentState={deploymentState}
      onViewChange={(view) => {
        if (view === "authorize" || view === "simulate") {
          setActiveView(view);
        }
      }}
    />
  );
}

beforeEach(() => {
  mockUseCurrentAccount.mockReturnValue(connectedAccount);
  mockUseCurrentWallet.mockReturnValue(connectedWallet);
  mockUseSuiClient.mockReturnValue(createSuiClient());
  mockUseAuthorization.mockReturnValue(createAuthorizationResult());
  mockFetchSimulationOwnerCharacterId.mockReset();
  mockFetchSimulationOwnerCharacterId.mockResolvedValue("0xownercharacter");
  mockLoadSimulationReferenceData.mockReset();
  mockLoadSimulationReferenceData.mockResolvedValue({
    characterOptions: [{
      characterId: 42,
      characterTribe: 7,
      description: "Tribe 7",
      label: "Character 42",
      sourceObjectId: "0xprofile",
    }],
    errorMessages: [],
    shipOptions: [{
      description: "Frigate · Group 25",
      groupId: "25",
      label: "USV",
      typeId: "900002",
    }],
    tribeOptions: [{
      description: "SEP",
      label: "Sepharim",
      value: 7,
    }],
  });
});

describe("AuthorizeView", () => {
  it("shows relative deployment age in the contract dropdown", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T02:00:00.000Z"));

    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: [],
      errorMessage: null,
      refresh: vi.fn(),
    });

    try {
      render(<AuthorizeView deploymentState={deploymentState} />);

      expect(screen.getByRole("option", { name: "Starter Contract · starter_contract (deployed 1d 2h ago)" })).toBeVisible();
      expect(screen.getAllByText("Starter Contract · starter_contract (deployed 1d 2h ago)").length).toBeGreaterThan(0);
      expect(screen.getByText("0xfeedface on testnet:stillness")).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

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

  it("navigates into the simulate tab without changing turret selection", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeViewHarness deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Simulate turret Perimeter Lancer" }));

    expect(screen.getByRole("heading", { name: "Simulate Turrets" })).toBeVisible();
    expect(screen.getByText("Select a turret you own from the dropdown and execute the active contract as the EVE Frontier gameserver would.")).toBeVisible();
    expect(screen.getByText("Selected Turret")).toBeVisible();
    expect(screen.getByRole("button", { name: "Change Turret" })).toBeVisible();
    expect(screen.queryByLabelText("Simulation Turret")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Authorize Contract")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Deployment")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Authorize Selected" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Authorize" })).not.toBeInTheDocument();
  });

  it("expands the compact simulation context when changing the selected turret", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeViewHarness deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Simulate turret Perimeter Lancer" }));
    fireEvent.click(screen.getByRole("button", { name: "Change Turret" }));

    expect(screen.getByLabelText("Simulation Turret")).toBeVisible();
  });

  it("hydrates the simulation modal with the turret owner character lookup", async () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeViewHarness deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Simulate turret Perimeter Lancer" }));

    await waitFor(() => {
      expect(screen.getByText("0xownercharacter")).toBeVisible();
    });

    expect(mockFetchSimulationOwnerCharacterId).toHaveBeenCalledWith(expect.objectContaining({
      deploymentState,
      turretObjectId: "0x111",
      walletAddress: connectedWalletAddress,
    }));
    await waitFor(() => {
      expect(screen.getByLabelText("Type Id")).toHaveValue("900002");
    });

    expect(screen.getByLabelText("Group Id")).toHaveValue("25");
    expect(screen.getByLabelText("Character Id")).toHaveValue("42");
    expect(screen.getByLabelText("Character Tribe")).toHaveValue("7");
    expect(screen.getByLabelText("Item Id")).toHaveValue("10000002887");
    expect(screen.getByLabelText("HP Ratio")).toHaveValue(100);
  });

  it("runs a simulation and renders decoded priority results", async () => {
    const returnedBytes = encodeSimulationPriorityEntries([{
      targetItemId: "900001",
      priorityWeight: "120",
    }]);
    const devInspectTransactionBlock = vi.fn<DevInspectTransactionBlock>(() => Promise.resolve(createDevInspectSuccessResponse(Array.from(returnedBytes))));
    mockUseSuiClient.mockReturnValue(createSuiClient({ devInspectTransactionBlock }));
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeViewHarness deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Simulate turret Perimeter Lancer" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Character Id")).toHaveValue("42");
    });

    fireEvent.change(screen.getByLabelText("Item Id"), { target: { value: "900001" } });
    fireEvent.click(screen.getByRole("button", { name: "Run Simulation" }));

    await waitFor(() => {
      expect(screen.getByText("Simulation Results")).toBeVisible();
    });

    expect(screen.getByRole("cell", { name: "120" })).toBeVisible();
    expect(devInspectTransactionBlock).toHaveBeenCalledTimes(1);
  });

  it("preserves the draft and renders execution failures when the simulation fails", async () => {
    mockUseSuiClient.mockReturnValue(createSuiClient({
      devInspectTransactionBlock: vi.fn<DevInspectTransactionBlock>(() => Promise.resolve(createDevInspectErrorResponse("MoveAbort"))),
    }));
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeViewHarness deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Simulate turret Perimeter Lancer" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Character Id")).toHaveValue("42");
    });

    fireEvent.change(screen.getByLabelText("Item Id"), { target: { value: "900001" } });
    fireEvent.click(screen.getByRole("button", { name: "Run Simulation" }));

    await waitFor(() => {
      expect(screen.getByText("Simulation Error")).toBeVisible();
    });

    expect(screen.getByText("MoveAbort")).toBeVisible();
    expect(screen.getByLabelText("Item Id")).toHaveValue("900001");
  });

  it("marks the simulation workspace as stale when the deployment context changes", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    const { rerender } = render(<AuthorizeViewHarness deploymentState={deploymentState} />);

    fireEvent.click(screen.getByRole("button", { name: "Simulate turret Perimeter Lancer" }));

    rerender(<AuthorizeViewHarness deploymentState={{ ...deploymentState, targetId: "testnet:utopia" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Deployment context changed");
  });

  it("renders an empty simulation state when no turret session is active", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeViewHarness deploymentState={deploymentState} initialView="simulate" />);

    expect(screen.getByText("Simulation Context Required")).toBeVisible();
    expect(screen.getByLabelText("Simulation Turret")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open Authorize" })).toBeVisible();
  });

  it("uses the dedicated simulate scroll container when the simulate tab is active", () => {
    mockUseTurretList.mockReturnValue({
      status: "success",
      turrets: turretFixtures,
      errorMessage: null,
      refresh: vi.fn(),
    });

    render(<AuthorizeViewHarness deploymentState={deploymentState} initialView="simulate" />);

    const simulateHeading = screen.getByRole("heading", { name: "Simulate Turrets" });
    const simulateViewRoot = simulateHeading.closest(".ff-authorize-view");

    expect(simulateViewRoot).not.toBeNull();
    expect(simulateViewRoot).toHaveClass("ff-authorize-view--simulate");
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