import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

import { getDeploymentTarget } from "../data/deploymentTargets";
import type { DeploymentConfirmationRequest, DeploymentConfirmationResult } from "../deployment/confirmation";
import { confirmPublishedPackage, confirmPublishedPackageWithClient } from "../deployment/confirmation";
import { createGeneratedArtifactStub } from "./compiler/helpers";

function createRequest(signal?: AbortSignal): DeploymentConfirmationRequest {
  return {
    artifact: createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    }),
    packageId: "0xabc",
    target: getDeploymentTarget("local"),
    transactionDigest: "0xdigest",
    signal,
  };
}

function createConfirmedResult(): DeploymentConfirmationResult {
  return {
    confirmed: true,
    confirmationReference: "0xdigest",
    packageId: "0xabc",
    finalStage: "confirming",
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("confirmPublishedPackage", () => {
  it("removes the abort listener after a retry delay completes", async () => {
    const controller = new AbortController();
    const removeEventListenerSpy = vi.spyOn(controller.signal, "removeEventListener");
    const verify = vi.fn<(
      request: DeploymentConfirmationRequest,
    ) => Promise<DeploymentConfirmationResult | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createConfirmedResult());

    const confirmationPromise = confirmPublishedPackage(
      createRequest(controller.signal),
      verify,
      { retries: 1, retryDelayMs: 25 },
    );

    await Promise.resolve();
    expect(verify).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(25);

    await expect(confirmationPromise).resolves.toEqual(createConfirmedResult());
    expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("rejects with an abort error when the retry delay is interrupted", async () => {
    const controller = new AbortController();
    const verify = vi.fn<(
      request: DeploymentConfirmationRequest,
    ) => Promise<DeploymentConfirmationResult | null>>()
      .mockResolvedValue(null);

    const confirmationPromise = confirmPublishedPackage(
      createRequest(controller.signal),
      verify,
      { retries: 1, retryDelayMs: 25 },
    );

    await Promise.resolve();
    controller.abort();

    await expect(confirmationPromise).rejects.toThrow("Deployment confirmation was aborted.");
  });

  it("waits for the published TurretAuth witness to become queryable before confirming success", async () => {
    const getNormalizedMoveStruct = vi.fn()
      .mockRejectedValueOnce(new Error("No struct was found with struct name TurretAuth"))
      .mockResolvedValueOnce({});
    const client = {
      waitForTransaction: vi.fn(() => Promise.resolve({
        digest: "0xdigest",
        effects: { status: { status: "success" } },
        objectChanges: [{ type: "published", packageId: "0xabc123" }],
      })),
      getNormalizedMoveStruct,
    } as unknown as SuiJsonRpcClient;

    const confirmationPromise = confirmPublishedPackageWithClient(createRequest(), client);

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(confirmationPromise).resolves.toEqual({
      confirmed: true,
      confirmationReference: "0xdigest",
      packageId: "0xabc123",
      finalStage: "confirming",
    });
    expect(getNormalizedMoveStruct).toHaveBeenCalledTimes(2);
    expect(getNormalizedMoveStruct).toHaveBeenNthCalledWith(1, {
      package: "0xabc123",
      module: "starter_contract",
      struct: "TurretAuth",
      signal: undefined,
    });
  });

  it("returns unresolved confirmation when the published TurretAuth witness never becomes queryable", async () => {
    const getNormalizedMoveStruct = vi.fn(() => Promise.reject(new Error("No struct was found with struct name TurretAuth")));
    const client = {
      waitForTransaction: vi.fn(() => Promise.resolve({
        digest: "0xdigest",
        effects: { status: { status: "success" } },
        objectChanges: [{ type: "published", packageId: "0xabc123" }],
      })),
      getNormalizedMoveStruct,
    } as unknown as SuiJsonRpcClient;

    const confirmationPromise = confirmPublishedPackageWithClient(createRequest(), client);

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(confirmationPromise).resolves.toEqual({
      confirmed: false,
      confirmationReference: "0xdigest",
      packageId: "0xabc123",
      finalStage: "confirming",
    });
    expect(getNormalizedMoveStruct).toHaveBeenCalled();
  });
});