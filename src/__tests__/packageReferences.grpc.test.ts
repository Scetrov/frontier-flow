import { GrpcTypes } from "@mysten/sui/grpc";
import { fromBase64 } from "@mysten/sui/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getPackageReferenceBundle, verifyPublishedWorldPackageExists } from "../data/packageReferences";
import { packageObjectResponseBody } from "../test/suiGrpcMocks";

const PACKAGE = getPackageReferenceBundle("testnet:stillness").worldPackageId;
const object = { objectId: PACKAGE, type: "package", version: "1", digest: "11111111111111111111111111111111" };

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("authoritative gRPC World package existence", () => {
  it("uses actual binary gRPC and validates required package fields", async () => {
    const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(url, init);
      expect(new URL(request.url).pathname).toBe("/sui.rpc.v2.LedgerService/BatchGetObjects");
      expect(request.headers.get("grpc-timeout")).toBe("8000m");
      const body = await request.text();
      expect(body).not.toContain("jsonrpc");
      const frames = fromBase64(body);
      const length = new DataView(frames.buffer, frames.byteOffset, frames.byteLength).getUint32(1);
      const decoded = GrpcTypes.BatchGetObjectsRequest.fromBinary(frames.slice(5, 5 + length));
      expect(decoded.requests[0].objectId).toBe(PACKAGE);
      expect(decoded.readMask?.paths).toEqual(expect.arrayContaining(["object_id", "object_type", "version", "digest"]));
      return new Response(packageObjectResponseBody(PACKAGE), { headers: { "content-type": "application/grpc-web-text" } });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(verifyPublishedWorldPackageExists("testnet:stillness")).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    {}, { object: undefined },
    { object: { ...object, objectId: "0x999" } },
    { object: { ...object, type: "0x2::coin::Coin" } },
    { object: { ...object, version: "" } },
    { object: { ...object, digest: "" } },
    { error: { code: "notExists" } },
  ])("fails closed for missing or mismatched package evidence", async (response) => {
    await expect(verifyPublishedWorldPackageExists("testnet:stillness", { getObject: () => Promise.resolve(response) })).resolves.toBe(false);
  });

  it("does not assume success from an unsupported client", async () => {
    await expect(verifyPublishedWorldPackageExists("testnet:stillness", {})).resolves.toBe(false);
  });

  it("reports unavailable verification without retrying or accepting cached references", async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response("Unavailable", { status: 503 })));
    vi.stubGlobal("fetch", fetch);
    await expect(verifyPublishedWorldPackageExists("testnet:stillness")).resolves.toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("aborts before the request and discards late success after cancellation", async () => {
    const getObject = vi.fn(() => Promise.resolve({ object }));
    await expect(verifyPublishedWorldPackageExists("testnet:stillness", { getObject }, AbortSignal.abort())).resolves.toBe(false);
    expect(getObject).not.toHaveBeenCalled();
    const controller = new AbortController();
    const delayed = vi.fn(() => { controller.abort(); return Promise.resolve({ object }); });
    await expect(verifyPublishedWorldPackageExists("testnet:stillness", { getObject: delayed }, controller.signal)).resolves.toBe(false);
  });
});
