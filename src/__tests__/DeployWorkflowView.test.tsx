import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DeployWorkflowView from "../components/DeployWorkflowView";
import type { DeploymentState } from "../compiler/types";
import { getLocalDeploymentTargetLabel } from "../data/localEnvironment";
import { getPackageReferenceBundle } from "../data/packageReferences";

type TargetBalanceQuery = ReturnType<typeof import("../hooks/useTargetBalance").useTargetBalance>;

const mockUseTargetBalance = vi.fn<(...args: [string | null, import("../compiler/types").DeploymentTargetId]) => TargetBalanceQuery>();
const mockGetObject = vi.fn<() => Promise<unknown>>();
const mockSuiClient = { getObject: mockGetObject };
const STILLNESS_WORLD_PACKAGE_ID = getPackageReferenceBundle("testnet:stillness").worldPackageId;

vi.mock("@mysten/dapp-kit", () => ({
  useCurrentAccount: () => ({ address: "0xabc" }),
  useCurrentWallet: () => ({ isConnected: true }),
  useSuiClient: () => mockSuiClient,
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
    mockGetObject.mockReset();
    mockGetObject.mockResolvedValue({});
    mockUseTargetBalance.mockReturnValue(createBalanceQuery({
      data: { totalBalance: "2500000000" },
    }));
  });

  it("renders blocking prerequisites, informational checks, and the deploy control", async () => {
    renderDeployWorkflowView(createDeploymentState());

    expect(screen.getByRole("heading", { name: "Pre-flight deployment checks" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Deploy testnet:stillness" })).toBeVisible();
    expect(screen.getByText("current compiled bytecode artifact")).toBeVisible();
    expect(screen.getByText("connected Sui wallet for testnet:stillness")).toBeVisible();
    expect(screen.getByText("Connect a Sui-compatible wallet before deploying to testnet:stillness.")).toBeVisible();
    expect(screen.getByText("Review blockers before deploying")).toBeVisible();
    expect(screen.getByText("Wallet balance: 2.5 SUI")).toBeVisible();
    expect(await screen.findByText(STILLNESS_WORLD_PACKAGE_ID)).toBeVisible();
    expect(screen.getByText("Deployment blocked")).toBeVisible();
    expect(screen.getByText("Resolve the wallet connection before retrying deployment.")).toBeVisible();
  });

  it("renders multiline deployment diagnostics in a preserved code block", async () => {
    const details = [
      "Deployment failed.",
      "error[E04023]: invalid method call",
      "  ┌─ dependencies/world/sources/access/access_control.move:113:12",
    ].join("\n");

    renderDeployWorkflowView(createDeploymentState({
      statusMessage: {
        attemptId: "attempt-2",
        targetId: "testnet:stillness",
        severity: "error",
        headline: "Deployment failed",
        details,
        visibleInFooter: true,
        visibleInMovePanel: true,
      },
    }));

    const detailsBlock = screen.getByLabelText("Deployment status details");
    expect(await screen.findByText(STILLNESS_WORLD_PACKAGE_ID)).toBeVisible();

    expect(detailsBlock.tagName).toBe("PRE");
    expect(detailsBlock.textContent).toBe(details);
    expect(detailsBlock.textContent).toContain("error[E04023]: invalid method call");
  });

  it("shows the local target as ready when blockers are cleared", async () => {
    const localTargetLabel = getLocalDeploymentTargetLabel();

    renderDeployWorkflowView(
      createDeploymentState({
        selectedTarget: "local",
        canDeploy: true,
        blockerReasons: [],
        requiredInputs: [
          "current compiled bytecode artifact",
          `published package references for ${localTargetLabel}`,
          "available local validator",
        ],
        resolvedInputs: [
          "current compiled bytecode artifact",
          `published package references for ${localTargetLabel}`,
          "available local validator",
        ],
        statusMessage: null,
      }),
    );

    expect(screen.getByRole("button", { name: `Deploy ${localTargetLabel}` })).toBeVisible();
    expect(screen.getByText("Ready to deploy")).toBeVisible();
    expect(screen.getByText("available local validator")).toBeVisible();
    expect(screen.getByText("Balance check is skipped for local deployment")).toBeVisible();
    expect(await screen.findByText("Skipped for local deployment")).toBeVisible();
    expect(screen.queryByText("Current blockers")).not.toBeInTheDocument();
    expect(screen.getByText("No deployment attempt has been recorded for this graph revision yet.")).toBeVisible();
  });

  it("clears the previous world package detail while a new target check is pending", async () => {
    const pendingCheck = new Promise(() => undefined);
    mockGetObject
      .mockResolvedValueOnce({})
      .mockReturnValueOnce(pendingCheck);

    const { rerender } = renderDeployWorkflowView(createDeploymentState());

    expect(await screen.findByText(STILLNESS_WORLD_PACKAGE_ID)).toBeVisible();

    rerender(<DeployWorkflowView deployment={createDeploymentState({
      selectedTarget: "testnet:utopia",
      blockerReasons: ["Connect a Sui-compatible wallet before deploying to testnet:utopia."],
      requiredInputs: [
        "current compiled bytecode artifact",
        "connected Sui wallet for testnet:utopia",
        "published package references for testnet:utopia",
      ],
      resolvedInputs: [
        "current compiled bytecode artifact",
        "published package references for testnet:utopia",
      ],
      statusMessage: {
        attemptId: "attempt-utopia",
        targetId: "testnet:utopia",
        severity: "warning",
        headline: "Deployment blocked",
        details: "Resolve the wallet connection before retrying deployment.",
        visibleInFooter: true,
        visibleInMovePanel: true,
      },
    })} />);

    await waitFor(() => {
      expect(screen.queryByText(STILLNESS_WORLD_PACKAGE_ID)).not.toBeInTheDocument();
    });
    expect(screen.getByText("Checking published world package")).toBeVisible();
  });
});