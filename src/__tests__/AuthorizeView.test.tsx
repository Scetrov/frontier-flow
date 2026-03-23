import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { useCurrentAccount as useCurrentAccountHook } from "@mysten/dapp-kit";

import type { StoredDeploymentState, TurretInfo } from "../types/authorization";
import AuthorizeView from "../components/AuthorizeView";
import type { UseTurretListResult } from "../hooks/useTurretList";

type CurrentAccount = ReturnType<typeof useCurrentAccountHook>;

const mockUseCurrentAccount = vi.fn<() => CurrentAccount>();
const mockUseTurretList = vi.fn<(input: unknown) => UseTurretListResult>();

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: () => mockUseCurrentAccount(),
}));

vi.mock("../hooks/useTurretList", () => ({
  useTurretList: (input: unknown) => mockUseTurretList(input),
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

const connectedAccount = {
  address: "0x1234",
  chains: [],
  features: [],
  icon: undefined,
  label: undefined,
  publicKey: new Uint8Array(),
} as CurrentAccount;

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

describe("AuthorizeView", () => {
  it("renders a loading state while turrets are being fetched", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
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
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
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
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
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
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
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

  it("passes the connected wallet and deployment state into the turret list hook", () => {
    mockUseCurrentAccount.mockReturnValue(connectedAccount);
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
  });
});