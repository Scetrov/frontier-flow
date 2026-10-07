import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { DeploymentTargetId } from "../compiler/types";
import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { TARGET_BALANCE_TIMEOUT_MS } from "../hooks/useTargetBalance";

import WalletStatus from "../components/WalletStatus";

const walletState = vi.hoisted(() => ({ address: "0x1" as string | null }));
const queryClients = new Set<QueryClient>();

// Mock only wallet discovery/account state and unrelated GraphQL identity work.
// The balance hook, query configuration, SDK client and response decoding are real.
vi.mock("../wallet/hooks", () => ({
  useFrontierWalletSession: () => ({
    account: walletState.address === null ? null : { address: walletState.address },
    wallets: [],
    isConnected: walletState.address !== null,
    isConnecting: false,
    disconnectPending: false,
    disconnect: vi.fn(),
    connect: vi.fn(),
    kit: {},
  }),
}));
vi.mock("../utils/characterProfile", () => ({
  fetchCharacterIdentityForWalletAcrossTargets: () => Promise.resolve(null),
}));
vi.mock("../data/packageReferences", async () => ({
  ...await vi.importActual<typeof import("../data/packageReferences")>("../data/packageReferences"),
  shouldRefreshPublishedWorldPackageManifest: () => false,
}));

function grpcFrame(flag: number, payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(5 + payload.length);
  frame[0] = flag;
  new DataView(frame.buffer).setUint32(1, payload.length);
  frame.set(payload, 5);
  return frame;
}

function balanceResponse(protobuf = "ChUKDTB4Mjo6c3VpOjpTVUkYgLq7yC4="): Response {
  // SDK 2.35.0 GetBalanceResponse.toBinary: coin_type=0x2::sui::SUI,
  // balance=12500000000. Keep a real protobuf fixture, not a hook result.
  const message = grpcFrame(0, Uint8Array.from(atob(protobuf), (c) => c.charCodeAt(0)));
  const trailer = grpcFrame(128, new TextEncoder().encode("grpc-status: 0\r\n"));
  const bytes = new Uint8Array(message.length + trailer.length);
  bytes.set(message);
  bytes.set(trailer, message.length);
  return new Response(btoa(String.fromCharCode(...bytes)), {
    headers: { "content-type": "application/grpc-web-text" },
  });
}

function renderStatus(targetId: DeploymentTargetId = "testnet:stillness") {
  const client = new QueryClient();
  queryClients.add(client);
  const tree = (target: DeploymentTargetId) => <QueryClientProvider client={client}><WalletStatus selectedDeploymentTarget={target} /></QueryClientProvider>;
  const view = render(tree(targetId));
  return { client, rerender: (target: DeploymentTargetId = targetId) => { view.rerender(tree(target)); } };
}

beforeEach(() => { walletState.address = "0x1"; });
afterEach(() => {
  cleanup();
  for (const client of queryClients) client.clear();
  queryClients.clear();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("loads WalletStatus balance through the real target hook without retired JSON-RPC (#119)", async () => {
  const legacyRequests: string[] = [];
  const grpcRequests: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const body = input instanceof Request ? await input.clone().text() : await new Request(url, init).text();
    if (body.includes('"jsonrpc"') || !url.endsWith("/sui.rpc.v2.StateService/GetBalance")) {
      legacyRequests.push(url);
      throw new Error("Public Sui JSON-RPC has been retired; use gRPC.");
    }
    grpcRequests.push(url);
    return balanceResponse();
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    render(<QueryClientProvider client={client}><WalletStatus selectedDeploymentTarget="testnet:stillness" /></QueryClientProvider>);
    await waitFor(() => { expect(grpcRequests.length + legacyRequests.length).toBeGreaterThan(0); });
    expect(legacyRequests).toEqual([]);
    expect(await screen.findByText("12.5 SUI")).toBeVisible();
    expect(grpcRequests).toHaveLength(1);
  } finally {
    client.clear();
  }
});

it("renders a valid zero instead of an unavailable balance", async () => {
  const fetchFn = vi.fn(() => Promise.resolve(balanceResponse("ChEKDTB4Mjo6c3VpOjpTVUkYAA==")));
  vi.stubGlobal("fetch", fetchFn);
  renderStatus();
  expect(await screen.findByText("0 SUI")).toBeVisible();
  expect(fetchFn).toHaveBeenCalledOnce();
});

it("bounds unavailable-service retries and provides an explicit user retry", async () => {
  const deadline = vi.spyOn(AbortSignal, "timeout");
  const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetchFn);
  renderStatus();
  expect(await screen.findByText("SUI unavailable")).toBeVisible();
  expect(screen.queryByText("0 SUI")).not.toBeInTheDocument();
  expect(fetchFn).toHaveBeenCalledTimes(2);
  expect(deadline).toHaveBeenCalledTimes(2);
  expect(deadline).toHaveBeenCalledWith(TARGET_BALANCE_TIMEOUT_MS);
  fetchFn.mockResolvedValueOnce(balanceResponse());
  fireEvent.click(screen.getByRole("button", { name: "Retry Sui balance" }));
  expect(await screen.findByText("12.5 SUI")).toBeVisible();
  expect(fetchFn).toHaveBeenCalledTimes(3);
});

it("rejects an omitted balance rather than accepting SDK-defaulted zero", async () => {
  const fetchFn = vi.fn(() => Promise.resolve(balanceResponse("")));
  vi.stubGlobal("fetch", fetchFn);
  renderStatus();
  expect(await screen.findByText("SUI unavailable")).toBeVisible();
  expect(screen.queryByText("0 SUI")).not.toBeInTheDocument();
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

it("uses abort deadlines without unbounded retries", async () => {
  const deadline = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => AbortSignal.abort(new DOMException("Read deadline exceeded", "TimeoutError")));
  const fetchFn = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
    const reason: unknown = init?.signal?.reason;
    return Promise.reject(reason instanceof Error ? reason : new Error("Read deadline exceeded"));
  });
  vi.stubGlobal("fetch", fetchFn);
  renderStatus();
  expect(await screen.findByText("SUI unavailable")).toBeVisible();
  expect(deadline).toHaveBeenCalledTimes(2);
  expect(fetchFn).toHaveBeenCalledTimes(2);
  for (const [, init] of fetchFn.mock.calls) {
    expect(init?.signal?.aborted).toBe(true);
    expect(new Headers(init?.headers).get("grpc-timeout")).toBe("8000m");
  }
});

for (const change of ["account", "target"] as const) {
  it(`discards a late balance after ${change} switching`, async () => {
    let release: (() => void) | undefined;
    const fetchFn = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { release = () => { resolve(balanceResponse()); }; }))
      .mockImplementation(() => Promise.resolve(balanceResponse("ChUKDTB4Mjo6c3VpOjpTVUkYgJTr3AM=")));
    vi.stubGlobal("fetch", fetchFn);
    const view = renderStatus();
    await waitFor(() => { expect(fetchFn).toHaveBeenCalledOnce(); });
    if (change === "account") walletState.address = "0x2";
    view.rerender(change === "target" ? "testnet:utopia" : "testnet:stillness");
    expect(await screen.findByText("1 SUI")).toBeVisible();
    await act(async () => { release?.(); await Promise.resolve(); });
    expect(screen.queryByText("12.5 SUI")).not.toBeInTheDocument();
    expect(view.client.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual([
      "target-balance", change === "target" ? "testnet:utopia" : "testnet:stillness", "https://fullnode.testnet.sui.io:443", change === "account" ? "0x2" : "0x1",
    ]);
  });
}

it("clears displayed account balance on disconnect without another request", async () => {
  const fetchFn = vi.fn(() => Promise.resolve(balanceResponse()));
  vi.stubGlobal("fetch", fetchFn);
  const view = renderStatus();
  expect(await screen.findByText("12.5 SUI")).toBeVisible();
  walletState.address = null;
  view.rerender();
  expect(screen.queryByText("12.5 SUI")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
  expect(fetchFn).toHaveBeenCalledOnce();
});

it("changes both client endpoint and query identity after local configuration edits", async () => {
  const fetchFn = vi.fn<typeof fetch>()
    .mockImplementationOnce(() => Promise.resolve(balanceResponse()))
    .mockImplementation(() => Promise.resolve(balanceResponse("ChUKDTB4Mjo6c3VpOjpTVUkYgKjWuQc=")));
  vi.stubGlobal("fetch", fetchFn);
  const view = renderStatus("local");
  expect(await screen.findByText("12.5 SUI")).toBeVisible();
  act(() => {
    saveLocalEnvironmentConfig(window.localStorage, { ...loadLocalEnvironmentConfig(), rpcUrl: "http://127.0.0.1:19000" });
  });
  expect(await screen.findByText("2 SUI")).toBeVisible();
  expect(fetchFn.mock.calls[1]?.[0]).toBe("http://127.0.0.1:19000/sui.rpc.v2.StateService/GetBalance");
  expect(view.client.getQueryCache().getAll().map((query) => query.queryKey)).toContainEqual(["target-balance", "local", "http://127.0.0.1:19000", "0x1"]);
});
