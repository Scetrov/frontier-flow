import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DeployWorkflowView from "../components/DeployWorkflowView";
import type { DeploymentState } from "../compiler/types";

type TargetBalanceQuery = ReturnType<typeof import("../hooks/useTargetBalance").useTargetBalance>;

const mockUseTargetBalance = vi.fn<(...args: [string | null, import("../compiler/types").DeploymentTargetId]) => TargetBalanceQuery>();

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: () => ({ address: "0xabc" }),
  useCurrentWallet: () => ({ isConnected: true }),
  useWallets: () => ([{ name: "Vault" }]),
}));

vi.mock("../hooks/useTargetBalance", () => ({
  useTargetBalance: (...args: Parameters<typeof import("../hooks/useTargetBalance").useTargetBalance>) => mockUseTargetBalance(...args),
}));

function createBalanceQuery(overrides: Partial<TargetBalanceQuery> = {}): TargetBalanceQuery {
  return {
    data: undefined,
    isError: false,
    isPending: false,
    ...overrides,
  } as TargetBalanceQuery;
}

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

function renderDeployWorkflowView(deployment: DeploymentState) {
  return render(<DeployWorkflowView deployment={deployment} />);
}

describe("DeployWorkflowView", () => {
  beforeEach(() => {
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "2500000000" },
    }));
  });

  it("renders blocking prerequisites, informational checks, and the deploy control", () => {
    renderDeployWorkflowView(createDeploymentState());

    expect(screen.getByRole("heading", { name: "Pre-flight deployment checks" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Deploy testnet:stillness" })).toBeVisible();
    expect(screen.getByText("current compiled bytecode artifact")).toBeVisible();
    expect(screen.getByText("connected Sui wallet for testnet:stillness")).toBeVisible();
    expect(screen.getByText("Connect a Sui-compatible wallet before deploying to testnet:stillness.")).toBeVisible();
    expect(screen.getByText("Review blockers before deploying")).toBeVisible();
    expect(screen.getByText("Wallet balance: 2.5 SUI")).toBeVisible();
    expect(screen.getByText("Deployment blocked")).toBeVisible();
    expect(screen.getByText("Resolve the wallet connection before retrying deployment.")).toBeVisible();
  });

  it("shows the local target as ready when blockers are cleared", () => {
    renderDeployWorkflowView(
      createDeploymentState({
        selectedTarget: "local",
        canDeploy: true,
        blockerReasons: [],
        requiredInputs: ["current compiled bytecode artifact", "available local validator"],
        resolvedInputs: ["current compiled bytecode artifact", "available local validator"],
        statusMessage: null,
      }),
    );

    expect(screen.getByRole("button", { name: "Deploy local" })).toBeVisible();
    expect(screen.getByText("Ready to deploy")).toBeVisible();
    expect(screen.getByText("available local validator")).toBeVisible();
    expect(screen.getByText("Wallet balance: 2.5 SUI")).toBeVisible();
    expect(screen.queryByText("Current blockers")).not.toBeInTheDocument();
    expect(screen.getByText("No deployment attempt has been recorded for this graph revision yet.")).toBeVisible();
  });
});