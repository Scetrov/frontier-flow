import { afterEach, describe, expect, it, vi } from "vitest";
import { SuiGrpcClient } from "@mysten/sui/grpc";

import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { createEndpointAwareLocalSuiClient } from "../utils/suiTargetClient";

function setEndpoint(rpcUrl: string) {
  saveLocalEnvironmentConfig(window.localStorage, { ...loadLocalEnvironmentConfig(), rpcUrl });
}

function balanceResponse() {
  const protobuf = Uint8Array.from(atob("ChUKDTB4Mjo6c3VpOjpTVUkYgLq7yC4="), (char) => char.charCodeAt(0));
  const trailers = new TextEncoder().encode("grpc-status: 0\r\n");
  const bytes = new Uint8Array(10 + protobuf.length + trailers.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(1, protobuf.length);
  bytes.set(protobuf, 5);
  const offset = 5 + protobuf.length;
  bytes[offset] = 128;
  view.setUint32(offset + 1, trailers.length);
  bytes.set(trailers, offset + 5);
  return new Response(btoa(String.fromCharCode(...bytes)), {
    headers: { "Content-Type": "application/grpc-web-text" },
  });
}

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("stable wallet local client boundary", () => {
  it("keeps identity and chain stable but refreshes native service/core handles", () => {
    setEndpoint("http://127.0.0.1:19000");
    const client = createEndpointAwareLocalSuiClient();
    expect(client).toBeInstanceOf(SuiGrpcClient);
    expect(client.network).toBe("localnet");
    const firstService = client.stateService;
    const firstCore = client.core;
    expect(client.stateService).toBe(firstService);
    expect(client.core).toBe(firstCore);
    setEndpoint("http://127.0.0.1:19001");
    expect(client.stateService).not.toBe(firstService);
    expect(client.core).not.toBe(firstCore);
    expect(client.network).toBe("localnet");
  });

  it("sends later calls to the new endpoint and pins a captured native handle", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      urls.push(input instanceof Request ? input.url : input.toString());
      return Promise.resolve(balanceResponse());
    }));
    setEndpoint("http://127.0.0.1:19000");
    const client = createEndpointAwareLocalSuiClient();
    const capturedService = client.stateService;
    // Wallet transaction builders use the client's core interface.
    const capturedMethod = client.core.getBalance.bind(client.core);
    await capturedService.getBalance({ owner: "0x1" }, { timeout: 1000 }).response;
    setEndpoint("http://127.0.0.1:19001");
    const result = await client.core.getBalance({ owner: "0x1" });
    expect(result.balance.balance).toBe("12500000000");
    await capturedService.getBalance({ owner: "0x1" }, { timeout: 1000 }).response;
    await capturedMethod({ owner: "0x1" });
    expect(urls.map((url) => new URL(url).port)).toEqual(["19000", "19001", "19000", "19000"]);
    expect(urls.every((url) => url.endsWith("/sui.rpc.v2.StateService/GetBalance"))).toBe(true);
  });

  it("defers production policy errors to operation access, not identity rendering", () => {
    vi.stubEnv("PROD", true);
    setEndpoint("http://validator.example:9000");
    const client = createEndpointAwareLocalSuiClient();
    expect(client.network).toBe("localnet");
    expect(() => client.stateService).toThrow(/reviewed CSP allowlist/);
    setEndpoint("http://127.0.0.1:19001");
    expect(() => client.stateService).not.toThrow();
  });
});
