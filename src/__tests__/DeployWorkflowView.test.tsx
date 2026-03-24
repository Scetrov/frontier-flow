import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DeployWorkflowView from "../components/DeployWorkflowView";
import type { DeploymentState } from "../compiler/types";

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: () => ({ address: "0xabc" }),
  useCurrentWallet: () => ({ isConnected: true }),
  useWallets: () => ([{ name: "Vault" }]),
}));

const mockUseTargetBalance = vi.fn((owner: string | null, target: DeploymentState["selectedTarget"]) => {
  void owner;
  void target;

  return {
    data: { totalBalance: "2500000000" },
    isError: false,
    isPending: false,
  };
});

vi.mock("../hooks/useTargetBalance", () => ({
  useTargetBalance: (...args: [string | null, DeploymentState["selectedTarget"]]) => mockUseTargetBalance(...args),
}));

function createDeploymentState(overrides: Partial<DeploymentState> = {}): DeploymentState {
  return {
    selectedTarget: "testnet:stillness",
    canDeploy: false,
    isDeploying: false,
    isProgressModalOpen: false,
    blockerReasons: ["Connect a Sui-compatible wallet before deploying to testnet:stillness."],
    requiredInputs: [
      "current compiled bytecode artifact",
      "connected Sui wallet for testnet:stillness",
      "published package references for testnet:stillness",
    ],
    resolvedInputs: [
      "current compiled bytecode artifact",
      "published package references for testnet:stillness",
    ],
    deploymentStatus: null,
    latestAttempt: null,
    progress: null,
    statusMessage: {
      attemptId: "attempt-1",
      targetId: "testnet:stillness",
      severity: "warning",
      headline: "Deployment blocked",
      details: "Resolve the wallet connection before retrying deployment.",
      visibleInFooter: true,
      visibleInMovePanel: true,
    },
    setSelectedTarget: () => undefined,
    startDeployment: () => Promise.resolve(),
    dismissProgress: () => undefined,
    ...overrides,
  };
}

describe("DeployWorkflowView", () => {
  it("renders deployment checks and the deploy control in a single checklist", () => {
    render(<DeployWorkflowView deployment={createDeploymentState()} />);

    expect(screen.getByRole("heading", { name: "Pre-flight deployment checks" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Deployment checks" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Deploy testnet:stillness" })).toBeVisible();
    expect(screen.getByText("current compiled bytecode artifact")).toBeVisible();
    expect(screen.getByText("connected Sui wallet for testnet:stillness")).toBeVisible();
    expect(screen.getByText("Connect a Sui-compatible wallet before deploying to testnet:stillness.")).toBeVisible();
    expect(screen.getByText("Wallet balance: 2.5 SUI")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Informational checks" })).not.toBeInTheDocument();
    expect(screen.getByText("Deployment blocked")).toBeVisible();
    expect(screen.getByText("Resolve the wallet connection before retrying deployment.")).toBeVisible();
    expect(mockUseTargetBalance).toHaveBeenCalledWith("0xabc", "testnet:stillness");
  });

  it("shows local deployment wallet and balance checks because local signing still requires funds", () => {
    render(
      <DeployWorkflowView
        deployment={createDeploymentState({
          selectedTarget: "local",
          blockerReasons: [],
          requiredInputs: [
            "current compiled bytecode artifact",
            "connected Sui wallet for local",
            "available local validator",
          ],
          resolvedInputs: [
            "current compiled bytecode artifact",
            "connected Sui wallet for local",
            "available local validator",
          ],
          statusMessage: null,
        })}
      />,
    );

    expect(screen.getByText("Wallet balance: 2.5 SUI")).toBeVisible();
    expect(screen.queryByText("All blocking deployment prerequisites are currently satisfied for local.")).not.toBeInTheDocument();
    expect(mockUseTargetBalance).toHaveBeenCalledWith("0xabc", "local");
  });
});