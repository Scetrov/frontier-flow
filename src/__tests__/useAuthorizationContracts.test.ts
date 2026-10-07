import { act, renderHook, waitFor } from "@testing-library/react";
import { bcs } from "@mysten/sui/bcs";
import { GrpcTypes } from "@mysten/sui/grpc";
import { normalizeSuiAddress, toBase64 } from "@mysten/sui/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadAuthorizationContractsFromUpgradeCaps, useAuthorizationContracts, type AuthorizationContractDiscoveryClient } from "../hooks/useAuthorizationContracts";
import { grpcResponse } from "../test/suiGrpcMocks";
import { simulationDeploymentState } from "../test/turretSimulationFixtures";

const OWNER = normalizeSuiAddress("0x1234");
const CAP_ID = normalizeSuiAddress("0x111");
const PACKAGE = normalizeSuiAddress("0xfeedface");
const Cap = bcs.struct("UpgradeCap", { id: bcs.Address, package: bcs.Address, version: bcs.U64, policy: bcs.U8 });
const content = Cap.serialize({ id: CAP_ID, package: PACKAGE, version: "1", policy: 0 }).toBytes();
const cap = { objectId: CAP_ID, type: "0x2::package::UpgradeCap", owner: { $kind: "AddressOwner", AddressOwner: OWNER }, content };
const pkg = { package: { storageId: PACKAGE, modules: [{ name: "starter_contract", datatypes: [{ name: "TurretAuth", module: "starter_contract" }], functions: [{ name: "get_target_priority_list" }] }] } };
const options = { fallbackDeploymentState: null, targetId: "testnet:stillness" as const, walletAddress: OWNER };

function clientFixture(page: unknown = { objects: [cap], hasNextPage: false, cursor: null }, descriptor: unknown = pkg): AuthorizationContractDiscoveryClient {
  return {
    listOwnedObjects: vi.fn(() => Promise.resolve(page)),
    getPackage: vi.fn(() => ({ response: Promise.resolve(descriptor) })),
  };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("gRPC authorization package discovery", () => {
  it("paginates real protobuf responses, decodes UpgradeCap BCS and validates package/module descriptors", async () => {
    let pages = 0;
    const paths: string[] = [];
    const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(url, init);
      const path = new URL(request.url).pathname;
      paths.push(path);
      expect(request.method).toBe("POST");
      expect(request.headers.get("content-type")).toContain("application/grpc-web");
      expect(request.headers.get("grpc-timeout")).toBe("8000m");
      expect(await request.text()).not.toContain("jsonrpc");
      if (path.endsWith("/ListOwnedObjects")) {
        pages += 1;
        return grpcResponse(GrpcTypes.ListOwnedObjectsResponse.toBinary(GrpcTypes.ListOwnedObjectsResponse.create({
          objects: pages === 1 ? [{ objectId: CAP_ID, version: 1n, digest: "11111111111111111111111111111111", objectType: cap.type,
            owner: { kind: GrpcTypes.Owner_OwnerKind.ADDRESS, address: OWNER }, contents: { value: content } }] : [],
          nextPageToken: pages === 1 ? new Uint8Array([1]) : undefined,
        })));
      }
      expect(path).toBe("/sui.rpc.v2.MovePackageService/GetPackage");
      return grpcResponse(GrpcTypes.GetPackageResponse.toBinary(GrpcTypes.GetPackageResponse.create({ package: {
        storageId: PACKAGE, originalId: PACKAGE, version: 1n,
        modules: [{ name: "starter_contract", datatypes: [{ name: "TurretAuth", module: "starter_contract" }], functions: [{ name: "get_target_priority_list" }] }],
      } })));
    });
    vi.stubGlobal("fetch", fetch);
    const contracts = await loadAuthorizationContractsFromUpgradeCaps(options);
    expect(contracts).toEqual([expect.objectContaining({ packageId: PACKAGE, moduleName: "starter_contract", targetId: "testnet:stillness" })]);
    expect(paths).toEqual(["/sui.rpc.v2.StateService/ListOwnedObjects", "/sui.rpc.v2.StateService/ListOwnedObjects", "/sui.rpc.v2.MovePackageService/GetPackage"]);
  });

  it("retains the selected fallback contract and deterministically selects a real witness-only module", async () => {
    const client = clientFixture(undefined, { package: { storageId: PACKAGE, modules: [{ name: "starter_contract", datatypes: [{ name: "TurretAuth", module: "starter_contract" }], functions: [] }] } });
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, suiClient: client, fallbackDeploymentState: simulationDeploymentState })).resolves.toEqual([simulationDeploymentState]);
  });

  it.each([
    ["malformed page", {}],
    ["wrong owner", { objects: [{ ...cap, owner: { $kind: "AddressOwner", AddressOwner: "0x999" } }], hasNextPage: false }],
    ["wrong type", { objects: [{ ...cap, type: "0x2::coin::Coin" }], hasNextPage: false }],
    ["missing BCS", { objects: [{ ...cap, content: undefined }], hasNextPage: false }],
    ["mismatched cap identity", { objects: [{ ...cap, objectId: "0x999" }], hasNextPage: false }],
    ["missing cursor", { objects: [], hasNextPage: true }],
  ])("fails closed on %s", async (_label, page) => {
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, suiClient: clientFixture(page) })).rejects.toThrow();
  });

  it("does not accept an earlier page when a later page fails", async () => {
    let pages = 0;
    const client = {
      ...clientFixture(),
      listOwnedObjects: vi.fn(() => {
        pages += 1;
        return pages === 1
          ? Promise.resolve({ objects: [cap], hasNextPage: true, cursor: "next" })
          : Promise.reject(new Error("page unavailable"));
      }),
    };
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, suiClient: client })).rejects.toThrow("page unavailable");
    expect(client.getPackage).not.toHaveBeenCalled();
  });

  it("rejects repeated cursors rather than accepting partial discovery", async () => {
    const client = clientFixture({ objects: [], hasNextPage: true, cursor: "same" });
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, suiClient: client })).rejects.toThrow("repeated");
    expect(client.listOwnedObjects).toHaveBeenCalledTimes(2);
  });

  it("enforces the bounded pagination limit", async () => {
    let cursor = 0;
    const client = { ...clientFixture(), listOwnedObjects: vi.fn(() => Promise.resolve({ objects: [], hasNextPage: true, cursor: String(++cursor) })) };
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, suiClient: client })).rejects.toThrow("page limit");
    expect(client.listOwnedObjects).toHaveBeenCalledTimes(20);
    expect(client.getPackage).not.toHaveBeenCalled();
  });

  it.each([{}, { package: { ...pkg.package, storageId: "0x999" } }])("rejects missing or wrong package identity", async (descriptor) => {
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, suiClient: clientFixture(undefined, descriptor) })).rejects.toThrow();
  });

  it("does not accept imported witness references as a local witness declaration", async () => {
    const descriptor = { package: { storageId: PACKAGE, modules: [{ ...pkg.package.modules[0], datatypes: [{ name: "TurretAuth", module: "other" }] }] } };
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, suiClient: clientFixture(undefined, descriptor) })).resolves.toEqual([]);
  });

  it("returns actionable service failure without a legacy fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("Unavailable", { status: 503 }))));
    await expect(loadAuthorizationContractsFromUpgradeCaps(options)).rejects.toThrow();
  });

  it("cancels prior account discovery and rejects late data", async () => {
    let complete: (value: unknown) => void = () => {};
    const client = clientFixture();
    const list = vi.fn<AuthorizationContractDiscoveryClient["listOwnedObjects"]>(({ owner }) => owner === OWNER
      ? new Promise((resolve) => { complete = resolve; }) : Promise.resolve({ objects: [], hasNextPage: false, cursor: null }));
    const props = { ...options, suiClient: { ...client, listOwnedObjects: list } };
    const hook = renderHook((input) => useAuthorizationContracts(input), { initialProps: props });
    await waitFor(() => { expect(list).toHaveBeenCalledTimes(1); });
    hook.rerender({ ...props, walletAddress: normalizeSuiAddress("0x999") });
    expect(list.mock.calls[0][0].signal.aborted).toBe(true);
    await act(async () => { complete({ objects: [cap], hasNextPage: false, cursor: null }); await Promise.resolve(); });
    await waitFor(() => { expect(hook.result.current.isLoading).toBe(false); });
    expect(hook.result.current.contracts).toEqual([]);
    expect(client.getPackage).not.toHaveBeenCalled();
  });

  it("skips local/disconnected discovery and cancels before any request", async () => {
    const client = clientFixture();
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, targetId: "local", suiClient: client })).resolves.toEqual([]);
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, walletAddress: null, suiClient: client })).resolves.toEqual([]);
    await expect(loadAuthorizationContractsFromUpgradeCaps({ ...options, signal: AbortSignal.abort(), suiClient: client })).rejects.toThrow();
    expect(client.listOwnedObjects).not.toHaveBeenCalled();
    expect(toBase64(content)).not.toBe("");
  });
});
