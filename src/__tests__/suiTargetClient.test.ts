import { afterEach, describe, expect, it, vi } from "vitest";
import { SuiGrpcClient } from "@mysten/sui/grpc";

import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { getWalrusGraphConfig } from "../utils/walrusGraphConfig";
import { createSuiTargetClient, getSuiTargetClient, getSuiTargetConfig, targetBalanceQueryKey } from "../utils/suiTargetClient";

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllEnvs();
});

describe("target-aware Sui gRPC configuration", () => {
  it("constructs native gRPC clients with the correct network", () => {
    expect(getSuiTargetClient("local")).toBeInstanceOf(SuiGrpcClient);
    expect(getSuiTargetClient("local").network).toBe("localnet");
    expect(getSuiTargetClient("testnet:stillness").network).toBe("testnet");
  });

  it("limits deployed local origins to reviewed loopback hosts", () => {
    vi.stubEnv("PROD", true);
    for (const rpcUrl of ["http://localhost:9000", "http://127.0.0.1:19000", "https://localhost:9000"]) {
      expect(createSuiTargetClient({ networkFamily: "local", rpcUrl })).toBeInstanceOf(SuiGrpcClient);
    }
    for (const rpcUrl of ["http://192.168.1.10:9000", "https://validator.example", "http://localhost.evil.example", "http://user:password@localhost:9000"]) {
      expect(() => createSuiTargetClient({ networkFamily: "local", rpcUrl })).toThrow(/reviewed CSP allowlist/);
    }
    vi.stubEnv("PROD", false);
    expect(createSuiTargetClient({ networkFamily: "local", rpcUrl: "http://192.168.1.10:9000" })).toBeInstanceOf(SuiGrpcClient);
  });

  it("isolates logical worlds and accounts sharing the same fullnode", () => {
    expect(getSuiTargetConfig("testnet:stillness").baseUrl).toBe(getSuiTargetConfig("testnet:utopia").baseUrl);
    expect(targetBalanceQueryKey("testnet:stillness", "0x1")).not.toEqual(targetBalanceQueryKey("testnet:utopia", "0x1"));
    expect(targetBalanceQueryKey("testnet:stillness", "0x1")).not.toEqual(targetBalanceQueryKey("testnet:stillness", "0x2"));
  });

  it("resolves local endpoint edits without changing Walrus testnet configuration", () => {
    const initial = targetBalanceQueryKey("local", "0x1");
    const walrus = getWalrusGraphConfig();
    saveLocalEnvironmentConfig(window.localStorage, { ...loadLocalEnvironmentConfig(), rpcUrl: "http://127.0.0.1:19000" });
    expect(getSuiTargetConfig("local").baseUrl).toBe("http://127.0.0.1:19000");
    expect(targetBalanceQueryKey("local", "0x1")).not.toEqual(initial);
    expect(getWalrusGraphConfig()).toEqual(walrus);
    expect(getWalrusGraphConfig().network).toBe("testnet");
  });
});
