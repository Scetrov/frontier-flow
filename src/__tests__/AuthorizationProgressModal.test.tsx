import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuthorizationProgressModal from "../components/AuthorizationProgressModal";
import type { AuthorizationProgressState } from "../types/authorization";

function createProgress(overrides: Partial<AuthorizationProgressState> = {}): AuthorizationProgressState {
  return {
    targetId: "testnet:stillness",
    targets: [
      {
        turretObjectId: "0x1111",
        ownerCapId: "0xowner-1",
        status: "pending",
        confirmationPhase: null,
        transactionDigest: null,
        errorMessage: null,
      },
      {
        turretObjectId: "0x2222",
        ownerCapId: "0xowner-2",
        status: "confirming",
        confirmationPhase: "transaction",
        transactionDigest: "0xdigest-2",
        errorMessage: null,
      },
    ],
    activeTurretObjectId: "0x2222",
    startedAt: 1,
    completedAt: null,
    dismissedByUser: false,
    walletDisconnected: false,
    ...overrides,
  };
}

describe("AuthorizationProgressModal", () => {
  it("renders pending and active turret rows while authorization is in progress", () => {
    render(<AuthorizationProgressModal onClose={() => undefined} progress={createProgress()} />);

    expect(screen.getByRole("dialog", { name: "Authorization in progress" })).toBeVisible();
    expect(screen.getByText("Pending")).toBeVisible();
    expect(screen.getByText("Confirming transaction")).toBeVisible();
    expect(screen.getByText("Transaction submitted. Waiting for on-chain confirmation.")).toBeVisible();
  });

  it("renders terminal counts, warning rows, and retry actions after completion", () => {
    const handleRetry = vi.fn();
    render(
      <AuthorizationProgressModal
        onClose={() => undefined}
        onRetryEventConfirmation={handleRetry}
        progress={createProgress({
          completedAt: 3,
          activeTurretObjectId: null,
          targets: [
            {
              turretObjectId: "0x1111",
              ownerCapId: "0xowner-1",
              status: "confirmed",
              confirmationPhase: null,
              transactionDigest: "0xdigest-1",
              errorMessage: null,
            },
            {
              turretObjectId: "0x2222",
              ownerCapId: "0xowner-2",
              status: "failed",
              confirmationPhase: null,
              transactionDigest: "0xdigest-2",
              errorMessage: "Transaction was rejected by your wallet.",
            },
            {
              turretObjectId: "0x3333",
              ownerCapId: "0xowner-3",
              status: "warning",
              confirmationPhase: "event",
              transactionDigest: "0xdigest-3",
              errorMessage: "Transaction confirmed, but the authorization event was not observed in time. Retry confirmation or check the target manually.",
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Authorization complete" })).toBeVisible();
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
    expect(screen.getByText("Warnings")).toBeVisible();
    expect(screen.getByText("1 confirmed, 2 require review.")).toBeVisible();
    expect(screen.getByText("Transaction confirmed, but the authorization event was not observed in time. Retry confirmation or check the target manually.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Retry confirmation" }));

    expect(handleRetry).toHaveBeenCalledWith("0x3333");
  });

  it("renders the awaiting event phase while event confirmation is in progress", () => {
    render(
      <AuthorizationProgressModal
        onClose={() => undefined}
        progress={createProgress({
          targets: [{
            turretObjectId: "0x2222",
            ownerCapId: "0xowner-2",
            status: "confirming",
            confirmationPhase: "event",
            transactionDigest: "0xdigest-2",
            errorMessage: null,
          }],
          activeTurretObjectId: "0x2222",
        })}
      />,
    );

    expect(screen.getByText("Awaiting event")).toBeVisible();
    expect(screen.getByText("Transaction confirmed. Awaiting authorization event.")).toBeVisible();
  });

  it("renders the wallet disconnect warning and invokes the close callback", () => {
    const handleClose = vi.fn();
    render(
      <AuthorizationProgressModal
        onClose={handleClose}
        progress={createProgress({ walletDisconnected: true })}
      />,
    );

    expect(screen.getByText("Wallet disconnected. Reconnect to resume authorization.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});