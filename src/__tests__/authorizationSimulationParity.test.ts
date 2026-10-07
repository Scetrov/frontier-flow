import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { signTransaction as signTransactionFunction } from "@mysten/wallet-standard";

import { useAuthorization, type AuthorizationWalletAccount, type AuthorizationWalletConnection } from "../hooks/useAuthorization";
import type { StoredDeploymentState } from "../types/authorization";
import type { AuthorizationChainClient } from "../utils/authorizationChainClient";
import type { buildAuthorizeTurretTransaction } from "../utils/authorizationTransaction";

const deploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

const account: AuthorizationWalletAccount = { address: "0x1234", chains: ["sui:testnet"] };
const wallet: AuthorizationWalletConnection = { currentWallet: { name: "Sui Wallet" }, isConnected: true, supportedIntents: [] };

function transaction() {
  return {
    setSenderIfNotSet: vi.fn(),
    toJSON: vi.fn(() => Promise.resolve("{}")),
  } as unknown as ReturnType<typeof buildAuthorizeTurretTransaction>;
}

function chainClient(overrides: Partial<AuthorizationChainClient> = {}): AuthorizationChainClient {
  return {
    executeSigned: vi.fn(() => Promise.resolve({ digest: "0xdigest" })),
    isTurretAuthReady: vi.fn(() => Promise.resolve(true)),
    readEvents: vi.fn(() => Promise.resolve([])),
    waitForEffects: vi.fn(() => Promise.resolve({ success: true as const })),
    ...overrides,
  };
}

function renderAuthorization(input: {
  readonly suiClient: AuthorizationChainClient;
  readonly walletAccount?: AuthorizationWalletAccount;
  readonly confirmationTimeoutMs?: number;
  readonly eventPollingIntervalMs?: number;
  readonly resolveAuthorizationTargetFn?: (input: { readonly turretObjectId: string }) => Promise<{ readonly characterId: string; readonly ownerCapId: string }>;
  readonly signTransactionFn?: ReturnType<typeof vi.fn<typeof signTransactionFunction>>;
}) {
  const signTransactionFn = input.signTransactionFn ?? vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" }));
  const hook = renderHook(() => useAuthorization({
    deploymentState,
    walletAccount: input.walletAccount ?? account,
    currentWallet: wallet,
    suiClient: input.suiClient,
    buildTransactionFn: vi.fn(() => transaction()),
    confirmationTimeoutMs: input.confirmationTimeoutMs,
    eventPollingIntervalMs: input.eventPollingIntervalMs,
    resolveAuthorizationTargetFn: input.resolveAuthorizationTargetFn ?? (() => Promise.resolve({ characterId: "0xcharacter", ownerCapId: "0xownercap" })),
    signTransactionFn,
  }));
  return { signTransactionFn, result: hook.result };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(async () => {
  await act(async () => { await vi.runOnlyPendingTimersAsync(); });
  vi.useRealTimers();
});

describe("authorization and simulation parity", () => {
  it("keeps each turret outcome when one authorization aborts on-chain", async () => {
    const executeSigned = vi.fn()
      .mockResolvedValueOnce({ digest: "0xok" })
      .mockResolvedValueOnce({ digest: "0xabort" });
    const readEvents = vi.fn((digest: string) => Promise.resolve(digest === "0xok"
      ? [{ packageId: deploymentState.packageId, module: deploymentState.moduleName, parsedJson: { turretObjectId: "0x1111" } }]
      : []));
    const client = chainClient({
      executeSigned,
      waitForEffects: vi.fn((digest: string) => Promise.resolve({ success: digest === "0xok" })),
      readEvents,
    });
    const { result, signTransactionFn } = renderAuthorization({ suiClient: client });

    await act(async () => { await result.current.startAuthorization(["0x1111", "0x2222"]); });

    expect(result.current.progress?.targets.map((target) => [target.turretObjectId, target.status])).toEqual([
      ["0x1111", "confirmed"],
      ["0x2222", "failed"],
    ]);
    expect(result.current.progress?.targets[1]?.errorMessage).toContain("failed on-chain");
    expect(result.current.summary).toMatchObject({ confirmed: 1, failed: 1, pending: 0, warnings: 0, total: 2 });
    expect(signTransactionFn.mock.calls).toHaveLength(2);
    expect(executeSigned.mock.calls).toHaveLength(2);
    expect(readEvents.mock.calls).toHaveLength(1);
  });

  it("does not treat a missing authorization event as success", async () => {
    const client = chainClient({
      executeSigned: vi.fn().mockResolvedValueOnce({ digest: "0xok" }).mockResolvedValueOnce({ digest: "0xmissing" }),
      readEvents: vi.fn((digest: string) => Promise.resolve(digest === "0xok"
        ? [{ type: `${deploymentState.packageId}::${deploymentState.moduleName}::Authorized`, parsedJson: {} }]
        : [])),
    });
    const { result } = renderAuthorization({ suiClient: client, confirmationTimeoutMs: 200, eventPollingIntervalMs: 50 });

    await act(async () => {
      const pending = result.current.startAuthorization(["0x1111", "0x2222"]);
      await vi.advanceTimersByTimeAsync(250);
      await pending;
    });

    expect(result.current.progress?.targets.map((target) => target.status)).toEqual(["confirmed", "warning"]);
    expect(result.current.progress?.targets[1]?.errorMessage).toContain("event was not observed");
    expect(result.current.summary.confirmed).toBe(1);
    expect(result.current.summary.warnings).toBe(1);
  });

  it("rejects an unowned turret without signing it and continues the batch", async () => {
    const signTransactionFn = vi.fn<typeof signTransactionFunction>(() => Promise.resolve({ bytes: "dGVzdA==", signature: "0xsig" }));
    const executeSigned = vi.fn(() => Promise.resolve({ digest: "0xowned" }));
    const client = chainClient({
      executeSigned,
      readEvents: vi.fn(() => Promise.resolve([{ module: deploymentState.moduleName }])),
    });
    const { result } = renderAuthorization({
      suiClient: client,
      signTransactionFn,
      resolveAuthorizationTargetFn: ({ turretObjectId }) => {
        if (turretObjectId === "0xunowned") return Promise.reject(new Error("Could not find ownership capability for this turret."));
        return Promise.resolve({ characterId: "0xcharacter", ownerCapId: "0xownercap" });
      },
    });

    await act(async () => { await result.current.startAuthorization(["0xunowned", "0xowned"]); });

    expect(result.current.progress?.targets.map((target) => [target.turretObjectId, target.status, target.errorMessage])).toEqual([
      ["0xunowned", "failed", "Could not find ownership capability for this turret."],
      ["0xowned", "confirmed", null],
    ]);
    expect(signTransactionFn.mock.calls).toHaveLength(1);
    expect(executeSigned.mock.calls).toHaveLength(1);
  });

  it("rejects every turret when the wallet network does not match the deployment", async () => {
    const executeSigned = vi.fn(() => Promise.resolve({ digest: "0xunused" }));
    const waitForEffects = vi.fn(() => Promise.resolve({ success: true as const }));
    const client = chainClient({ executeSigned, waitForEffects });
    const { result, signTransactionFn } = renderAuthorization({
      suiClient: client,
      walletAccount: { address: "0x1234", chains: ["sui:localnet"] },
    });

    await act(async () => { await result.current.startAuthorization(["0x1111", "0x2222"]); });

    expect(result.current.progress?.targets.every((target) => target.status === "failed" && target.errorMessage?.includes("sui:testnet") === true)).toBe(true);
    expect(signTransactionFn.mock.calls).toHaveLength(0);
    expect(executeSigned.mock.calls).toHaveLength(0);
    expect(waitForEffects.mock.calls).toHaveLength(0);
  });
});
