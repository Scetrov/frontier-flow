import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GrpcTypes } from "@mysten/sui/grpc";

import { getDeploymentTarget } from "../data/deploymentTargets";
import type { DeploymentConfirmationClient, DeploymentConfirmationRequest, DeploymentConfirmationResult } from "../deployment/confirmation";
import { confirmPublishedPackage, confirmPublishedPackageWithClient } from "../deployment/confirmation";
import { grpcResponse } from "../test/suiGrpcMocks";
import { createPublicationResult, createTurretAuthDatatype, TEST_PUBLISHED_PACKAGE, TEST_TRANSACTION_DIGEST } from "../test/suiTransactionFixtures";
import { createGeneratedArtifactStub } from "./compiler/helpers";

function createRequest(signal?: AbortSignal): DeploymentConfirmationRequest {
  return { artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
    packageId: TEST_PUBLISHED_PACKAGE, target: getDeploymentTarget("local"), transactionDigest: TEST_TRANSACTION_DIGEST, signal };
}
function createConfirmedResult(): DeploymentConfirmationResult {
  return { confirmed: true, confirmationReference: TEST_TRANSACTION_DIGEST, packageId: TEST_PUBLISHED_PACKAGE, finalStage: "confirming" };
}
function createClient(): DeploymentConfirmationClient {
  return {
    getTransaction: vi.fn(() => Promise.resolve(createPublicationResult())),
    getDatatype: vi.fn(() => ({ response: Promise.resolve(createTurretAuthDatatype()) })),
  };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("confirmPublishedPackage", () => {
  it("removes the abort listener after a retry delay completes", async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const verify = vi.fn<(request: DeploymentConfirmationRequest) => Promise<DeploymentConfirmationResult | null>>()
      .mockResolvedValueOnce(null).mockResolvedValueOnce(createConfirmedResult());
    const pending = confirmPublishedPackage(createRequest(controller.signal), verify, { retries: 1, retryDelayMs: 25 });
    await Promise.resolve();
    expect(verify).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(25);
    await expect(pending).resolves.toEqual(createConfirmedResult());
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("rejects when a retry delay is cancelled", async () => {
    const controller = new AbortController();
    const pending = confirmPublishedPackage(createRequest(controller.signal), () => Promise.resolve(null), { retries: 1, retryDelayMs: 25 });
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toThrow("Deployment confirmation was aborted.");
  });

  it("waits for transaction visibility and delayed TurretAuth identity without signing or resubmitting", async () => {
    const getTransaction = vi.fn<DeploymentConfirmationClient["getTransaction"]>()
      .mockRejectedValueOnce(new Error("not found")).mockResolvedValue(createPublicationResult());
    const getDatatype = vi.fn<DeploymentConfirmationClient["getDatatype"]>()
      .mockReturnValueOnce({ response: Promise.resolve({}) })
      .mockImplementation(() => ({ response: Promise.resolve(createTurretAuthDatatype()) }));
    const pending = confirmPublishedPackageWithClient(createRequest(), { getTransaction, getDatatype });
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(pending).resolves.toEqual(createConfirmedResult());
    expect(getTransaction).toHaveBeenCalledTimes(2);
    expect(getDatatype).toHaveBeenCalledTimes(2);
    expect(getDatatype.mock.calls[0][0]).toEqual({ packageId: TEST_PUBLISHED_PACKAGE, moduleName: "starter_contract", name: "TurretAuth" });
  });

  it("returns unresolved within the interface deadline for missing or wrong datatype identity", async () => {
    const client = { ...createClient(), getDatatype: vi.fn(() => ({ response: Promise.resolve(createTurretAuthDatatype("0x999")) })) };
    const pending = confirmPublishedPackageWithClient(createRequest(), client, { interfaceTimeoutMs: 2_000 });
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(pending).resolves.toEqual({ ...createConfirmedResult(), confirmed: false });
    expect(client.getDatatype).toHaveBeenCalledTimes(2);
  });

  it("returns unresolved within the transaction deadline when service visibility is unavailable", async () => {
    const client = { ...createClient(), getTransaction: vi.fn(() => Promise.reject(new Error("unavailable"))) };
    const pending = confirmPublishedPackageWithClient(createRequest(), client, { transactionTimeoutMs: 2_000 });
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(pending).resolves.toEqual({ ...createConfirmedResult(), confirmed: false });
    expect(client.getTransaction).toHaveBeenCalledTimes(2);
    expect(client.getDatatype).not.toHaveBeenCalled();
  });

  it.each([
    { $kind: "FailedTransaction", protoJson: { effects: { status: { success: false } } } },
    { ...createPublicationResult(), protoJson: { digest: TEST_TRANSACTION_DIGEST, effects: {} } },
    { ...createPublicationResult(), Transaction: { ...createPublicationResult().Transaction, effects: { changedObjects: [] } } },
    createPublicationResult("wrong-digest"),
    createPublicationResult(TEST_TRANSACTION_DIGEST, "0x999"),
  ])("fails closed on unsuccessful or incomplete publication evidence", async (result) => {
    const client = { ...createClient(), getTransaction: vi.fn(() => Promise.resolve(result)) };
    await expect(confirmPublishedPackageWithClient(createRequest(), client)).rejects.toThrow();
    expect(client.getDatatype).not.toHaveBeenCalled();
  });

  it("never confirms a digest-less request or a pre-cancelled operation", async () => {
    const client = createClient();
    await expect(confirmPublishedPackageWithClient({ ...createRequest(), transactionDigest: undefined }, client)).resolves.toMatchObject({ confirmed: false });
    await expect(confirmPublishedPackageWithClient(createRequest(AbortSignal.abort()), client)).rejects.toThrow();
    expect(client.getTransaction).not.toHaveBeenCalled();
  });

  it("cancels confirmation during delayed visibility", async () => {
    const controller = new AbortController();
    const client = { ...createClient(), getDatatype: vi.fn(() => ({ response: Promise.resolve({}) })) };
    const pending = confirmPublishedPackageWithClient(createRequest(controller.signal), client);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await expect(pending).rejects.toThrow("Deployment confirmation was aborted.");
    expect(client.getDatatype).toHaveBeenCalledTimes(1);
  });

  it("uses actual protobuf gRPC transaction/package evidence on the captured local endpoint", async () => {
    const paths: string[] = [];
    const fetch = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(url, init);
      const path = new URL(request.url).pathname;
      paths.push(path);
      expect(new URL(request.url).port).toBe("19000");
      expect(request.headers.get("content-type")).toContain("application/grpc-web");
      expect(request.headers.get("grpc-timeout")).toBe("8000m");
      if (path.endsWith("/GetTransaction")) return Promise.resolve(grpcResponse(GrpcTypes.GetTransactionResponse.toBinary(GrpcTypes.GetTransactionResponse.create({ transaction: {
        digest: TEST_TRANSACTION_DIGEST, effects: { status: { success: true }, epoch: 1n, transactionDigest: TEST_TRANSACTION_DIGEST,
          changedObjects: [{ objectId: TEST_PUBLISHED_PACKAGE, outputState: GrpcTypes.ChangedObject_OutputObjectState.PACKAGE_WRITE, idOperation: GrpcTypes.ChangedObject_IdOperation.CREATED }] },
      } }))));
      expect(path).toBe("/sui.rpc.v2.MovePackageService/GetDatatype");
      return Promise.resolve(grpcResponse(GrpcTypes.GetDatatypeResponse.toBinary(GrpcTypes.GetDatatypeResponse.create(createTurretAuthDatatype()))));
    });
    vi.stubGlobal("fetch", fetch);
    await expect(confirmPublishedPackageWithClient({ ...createRequest(), target: { ...getDeploymentTarget("local"), rpcUrl: "http://127.0.0.1:19000" } })).resolves.toEqual(createConfirmedResult());
    expect(paths).toEqual(["/sui.rpc.v2.LedgerService/GetTransaction", "/sui.rpc.v2.MovePackageService/GetDatatype"]);
  });
});
