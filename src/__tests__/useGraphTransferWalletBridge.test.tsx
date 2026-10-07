import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@mysten/sui/transactions";

import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { useGraphTransferWalletBridge, WALRUS_GRAPH_SIGNING_NETWORK } from "../hooks/useGraphTransferWalletBridge";
import { getSuiTargetConfig } from "../utils/suiTargetClient";

const account = { address: "0xabc" };
const signAndExecuteTransaction = vi.hoisted(() => vi.fn());

vi.mock("../wallet/hooks", () => ({
  useFrontierWalletSession: () => ({
    account,
    isConnected: true,
    kit: { signAndExecuteTransaction },
  }),
}));

afterEach(() => {
  window.localStorage.clear();
  signAndExecuteTransaction.mockReset();
});

describe("useGraphTransferWalletBridge", () => {
  it("keeps Walrus signing on testnet after a local endpoint edit", async () => {
    saveLocalEnvironmentConfig(window.localStorage, {
      ...loadLocalEnvironmentConfig(),
      rpcUrl: "http://127.0.0.1:19000",
    });
    const localTarget = getSuiTargetConfig("local");
    expect(localTarget.network).toBe("localnet");
    expect(localTarget.baseUrl).toBe("http://127.0.0.1:19000");

    signAndExecuteTransaction.mockResolvedValue({
      $kind: "Transaction",
      Transaction: { digest: "0xdigest", status: { success: true } },
    });
    const transaction = { kind: "walrus-register" } as unknown as Transaction;
    const { result, rerender } = renderHook(() => useGraphTransferWalletBridge());

    await act(async () => {
      await expect(result.current.signAndExecuteTransaction(transaction)).resolves.toEqual({ digest: "0xdigest" });
    });

    saveLocalEnvironmentConfig(window.localStorage, {
      ...loadLocalEnvironmentConfig(),
      rpcUrl: "http://localhost:9001",
    });
    rerender();
    await act(async () => {
      await result.current.signAndExecuteTransaction(transaction);
    });

    expect(signAndExecuteTransaction).toHaveBeenCalledTimes(2);
    for (const [request] of signAndExecuteTransaction.mock.calls) {
      expect(request).toEqual({
        transaction,
        account,
        network: WALRUS_GRAPH_SIGNING_NETWORK,
      });
      expect(JSON.stringify(request)).not.toContain("127.0.0.1");
      expect(JSON.stringify(request)).not.toContain("localhost:9001");
      expect(JSON.stringify(request)).not.toContain("localnet");
    }
    expect(getSuiTargetConfig("local").baseUrl).toBe("http://localhost:9001");
  });
});
