import { GrpcTypes } from "@mysten/sui/grpc";
import { bcs } from "@mysten/sui/bcs";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSimulationCandidateDraft, simulationDeploymentState } from "../test/turretSimulationFixtures";
import { encodeSimulationPriorityEntries } from "../utils/turretSimulationCodec";
import { runTurretSimulation } from "../utils/turretSimulationExecution";

const SENDER = `0x${"1".repeat(64)}`;
const input = {
  candidate: createSimulationCandidateDraft({ itemId: "900001", typeId: "900002", groupId: "25", characterId: 42, characterTribe: 7 }),
  deploymentState: simulationDeploymentState,
  ownerCharacterId: `0x${"3".repeat(64)}`,
  sender: SENDER,
  turretObjectId: `0x${"2".repeat(64)}`,
};
const entries = [{ targetItemId: "900001", priorityWeight: "120" }];
const returnedBytes = encodeSimulationPriorityEntries(entries);
const wrappedBytes = bcs.vector(bcs.U8).serialize(Array.from(returnedBytes)).toBytes();

function grpcResponse(response: GrpcTypes.SimulateTransactionResponse) {
  const protobuf = GrpcTypes.SimulateTransactionResponse.toBinary(response);
  const trailers = new TextEncoder().encode("grpc-status: 0\r\n");
  const frames = new Uint8Array(10 + protobuf.length + trailers.length);
  const view = new DataView(frames.buffer);
  view.setUint32(1, protobuf.length);
  frames.set(protobuf, 5);
  const offset = 5 + protobuf.length;
  frames[offset] = 128;
  view.setUint32(offset + 1, trailers.length);
  frames.set(trailers, offset + 5);
  return new Response(toBase64(frames), { headers: { "Content-Type": "application/grpc-web-text" } });
}

function serveSimulation({ success = true, missingEffects = false, name = "vector<u8>", bytes = wrappedBytes, omitReturn = false }: {
  readonly success?: boolean;
  readonly missingEffects?: boolean;
  readonly name?: string;
  readonly bytes?: Uint8Array;
  readonly omitReturn?: boolean;
} = {}) {
  const requests: GrpcTypes.SimulateTransactionRequest[] = [];
  const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(url, init);
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname).toBe("/sui.rpc.v2.TransactionExecutionService/SimulateTransaction");
    expect(request.headers.get("content-type")).toContain("application/grpc-web");
    expect(request.headers.get("grpc-timeout")).toBe("8000m");
    const body = await request.text();
    expect(body).not.toContain("jsonrpc");
    const frames = fromBase64(body);
    const length = new DataView(frames.buffer, frames.byteOffset, frames.byteLength).getUint32(1);
    requests.push(GrpcTypes.SimulateTransactionRequest.fromBinary(frames.slice(5, 5 + length)));
    return grpcResponse(GrpcTypes.SimulateTransactionResponse.create({
      transaction: { effects: missingEffects ? undefined : { status: { success }, epoch: 1n } },
      commandOutputs: [{}, { returnValues: omitReturn ? [] : [{ value: { name, value: bytes } }] }],
    }));
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, requests };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("gRPC read-only turret simulation", () => {
  it("decodes multiple returned priority entries from native vector bytes", async () => {
    const decoded = [
      { targetItemId: "900001", priorityWeight: "120" },
      { targetItemId: "900009", priorityWeight: "7" },
    ];
    const payload = encodeSimulationPriorityEntries(decoded);
    const { fetch } = serveSimulation({ bytes: bcs.vector(bcs.U8).serialize(Array.from(payload)).toBytes() });
    await expect(runTurretSimulation(input)).resolves.toEqual({ kind: "success", entries: decoded, rawReturnedBytes: payload });
    const requestUrl = (url: RequestInfo | URL) => typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    expect(fetch.mock.calls.every(([url]) => requestUrl(url).includes("SimulateTransaction"))).toBe(true);
    expect(fetch.mock.calls.some(([url]) => requestUrl(url).includes("ExecuteTransaction"))).toBe(false);
  });

  it("uses the real SDK and binary response to decode the unchanged priority contract", async () => {
    const { requests } = serveSimulation();
    const result = await runTurretSimulation(input);
    expect(result).toEqual({ kind: "success", entries, rawReturnedBytes: returnedBytes });
    expect(requests).toHaveLength(1);
    expect(requests[0].checks).toBe(GrpcTypes.SimulateTransactionRequest_TransactionChecks.DISABLED);
    expect(requests[0].transaction?.sender).toBe(SENDER);
    expect(requests[0].readMask?.paths).toContain("command_outputs");
    expect(requests[0].readMask?.paths).toContain("transaction.effects");
  });

  it.each([
    ["failed effects", { success: false }],
    ["missing effects", { missingEffects: true }],
    ["wrong Move type", { name: "u64" }],
    ["missing Move type", { name: "" }],
    ["missing return value", { omitReturn: true }],
    ["malformed BCS", { bytes: new Uint8Array([255]) }],
  ] as const)("rejects %s without signing, execution, or retry", async (_label, fixture) => {
    const { fetch } = serveSimulation(fixture);
    expect((await runTurretSimulation(input)).kind).toBe("execution-error");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports an unavailable service after one bounded request", async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response("Unavailable", { status: 503 })));
    vi.stubGlobal("fetch", fetch);
    expect((await runTurretSimulation(input)).kind).toBe("execution-error");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("cancels the actual simulation transport", async () => {
    const controller = new AbortController();
    const fetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) throw new Error("Missing transport abort signal");
      signal.addEventListener("abort", () => { reject(new Error("Cancelled")); }, { once: true });
      controller.abort();
    }));
    vi.stubGlobal("fetch", fetch);
    expect((await runTurretSimulation({ ...input, signal: controller.signal })).kind).toBe("execution-error");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not request, sign, or execute for an already-cancelled or local operation", async () => {
    const { fetch } = serveSimulation();
    expect((await runTurretSimulation({ ...input, signal: AbortSignal.abort() })).kind).toBe("execution-error");
    expect((await runTurretSimulation({ ...input, deploymentState: { ...input.deploymentState, targetId: "local" } })).kind).toBe("execution-error");
    expect(fetch).not.toHaveBeenCalled();
  });
});
