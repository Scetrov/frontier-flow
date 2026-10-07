import { afterEach, describe, expect, it, vi } from "vitest";

import { createSuiTargetClient } from "../utils/suiTargetClient";

const target = { networkFamily: "local" as const, rpcUrl: "http://127.0.0.1:19000" };

function pendingFetch() {
  const signals: AbortSignal[] = [];
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${target.rpcUrl}/sui.rpc.v2.StateService/GetBalance`);
    expect(request.headers.get("content-type")).toContain("application/grpc-web");
    expect(request.headers.get("x-sui-client-protocol-version")).toMatch(/^\d+$/);
    signals.push(request.signal);
    return new Promise<Response>((_resolve, reject) => {
      const abortError = () => request.signal.reason instanceof Error ? request.signal.reason : new Error("Cancelled request");
      if (request.signal.aborted) reject(abortError());
      else request.signal.addEventListener("abort", () => { reject(abortError()); }, { once: true });
    });
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, signals };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("operation-scoped gRPC transport cancellation", () => {
  it("retains operation cancellation when Core supplies an undefined signal", async () => {
    const { fetch, signals } = pendingFetch();
    const operation = new AbortController();
    const client = createSuiTargetClient(target, { abort: operation.signal, timeout: 8000 });
    const result = client.core.getBalance({ owner: "0x1", signal: undefined });
    await vi.waitFor(() => { expect(fetch).toHaveBeenCalledTimes(1); });
    operation.abort(new Error("Operation cancelled"));
    expect(signals[0].aborted).toBe(true);
    await expect(result).rejects.toThrow(/Operation cancelled/);
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("grpc-timeout")).toBe("8000m");
  });

  it.each(["operation", "call"] as const)("combines signals so %s cancellation remains effective", async (cancel) => {
    const { fetch, signals } = pendingFetch();
    const operation = new AbortController();
    const call = new AbortController();
    const client = createSuiTargetClient(target, { abort: operation.signal, timeout: 8000 });
    const result = client.stateService.getBalance({ owner: "0x1" }, { abort: call.signal, timeout: 1000 }).response;
    (cancel === "operation" ? operation : call).abort(new Error(`${cancel} cancelled`));
    expect(signals[0].aborted).toBe(true);
    await expect(result).rejects.toThrow(`${cancel} cancelled`);
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("grpc-timeout")).toBe("1000m");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not erase an already-aborted operation with a live call signal", async () => {
    const { signals } = pendingFetch();
    const operation = new AbortController();
    operation.abort(new Error("Already cancelled"));
    const client = createSuiTargetClient(target, { abort: operation.signal });
    const result = client.stateService.getBalance({ owner: "0x1" }, { abort: new AbortController().signal }).response;
    expect(signals[0].aborted).toBe(true);
    await expect(result).rejects.toThrow(/Already cancelled/);
  });
});
