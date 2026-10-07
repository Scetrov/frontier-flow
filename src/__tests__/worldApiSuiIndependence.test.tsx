import { readFileSync } from "node:fs";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import WalletStatus from "../components/WalletStatus";
import NodeFieldEditor from "../nodes/NodeFieldEditor";
import { resetNodeFieldEditorOptionCacheForTests } from "../nodes/nodeFieldEditorOptions";
import { getWorldApiBaseUrl } from "../utils/worldApiClient";

vi.mock("../wallet/hooks", () => ({
  useFrontierWalletSession: () => ({
    account: { address: "0x1" },
    wallets: [],
    isConnected: true,
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

const TRIBE_URL = "https://world-api-stillness.live.pub.evefrontier.com/v2/tribes";

function tribeResponse(status: number) {
  return new Response(JSON.stringify({
    data: [{ id: 98000418, name: "Pegasus Cartel", nameShort: "PGCL" }],
  }), { status, headers: { "Content-Type": "application/json" } });
}

function renderOutage(worldStatus: number) {
  const requests: string[] = [];
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    requests.push(url);
    if (url === TRIBE_URL) return tribeResponse(worldStatus);
    return new Response("Sui unavailable", { status: 503 });
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WalletStatus selectedDeploymentTarget="testnet:stillness" />
      <NodeFieldEditor
        fields={{ selectedTribeIds: [] }}
        nodeLabel="List of Tribe"
        nodeType="listTribe"
        onClose={() => undefined}
        onSave={() => undefined}
      />
    </QueryClientProvider>,
  );
  return { client, requests };
}

afterEach(() => {
  resetNodeFieldEditorOptionCacheForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("List of Tribe while Sui is unavailable", () => {
  it("keeps World API tribe selection usable without a Sui hostname", async () => {
    const { requests } = renderOutage(200);
    expect(await screen.findByText("SUI unavailable")).toBeVisible();
    expect(await screen.findByText("Pegasus Cartel")).toBeVisible();
    expect(screen.queryByText("0 SUI")).not.toBeInTheDocument();
    expect(requests).toContain(TRIBE_URL);
    expect(requests.filter((url) => url.includes("/v2/tribes")).every((url) => new URL(url).origin === getWorldApiBaseUrl())).toBe(true);
    expect(requests.some((url) => url.includes("jsonrpc") || url.includes("suix_getBalance"))).toBe(false);
    const policy = readFileSync("netlify.toml", "utf8");
    expect(policy).toContain(getWorldApiBaseUrl());
    expect(policy).not.toContain("https://world-api.evefrontier.com");
    expect(policy).not.toContain("world-api-stillness.live.tech");
    expect(requests.some((url) => url.includes("world-api-stillness.live.tech"))).toBe(false);
  });

  it("reports World API failure independently of the Sui outage", async () => {
    const { requests } = renderOutage(503);
    expect(await screen.findByText("SUI unavailable")).toBeVisible();
    expect(await screen.findByText("World API lookup failed. Request failed with status 503")).toBeVisible();
    expect(screen.queryByText("Pegasus Cartel")).not.toBeInTheDocument();
    expect(requests.filter((url) => url.includes("/v2/tribes"))).toEqual([TRIBE_URL]);
  });
});
