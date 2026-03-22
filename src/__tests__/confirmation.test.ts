import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDeploymentTarget } from "../data/deploymentTargets";
import type { DeploymentConfirmationRequest, DeploymentConfirmationResult } from "../deployment/confirmation";
import { confirmPublishedPackage } from "../deployment/confirmation";
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
});