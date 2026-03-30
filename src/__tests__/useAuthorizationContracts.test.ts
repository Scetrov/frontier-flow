import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAuthorizationContracts } from "../hooks/useAuthorizationContracts";
import type { StoredDeploymentState } from "../types/authorization";

const fallbackDeploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

describe("useAuthorizationContracts", () => {
  it("merges wallet UpgradeCap contracts with the current deployment fallback", async () => {
    const getOwnedObjects = vi.fn(() => Promise.resolve({
      data: [{
        data: {
          content: {
            fields: {
              package: "0xfeedface",
            },
          },
        },
      }, {
        data: {
          content: {
            fields: {
              package: "0xdecafbad",
            },
          },
        },
      }],
      hasNextPage: false,
      nextCursor: null,
    }));
    const getObject = vi.fn(({ id }: { readonly id: string }) => {
      if (id === "0xfeedface") {
        return Promise.resolve({
          data: {
            content: {
              disassembled: {
                starter_contract: `module builder_extensions::starter_contract {
  public struct TurretAuth has drop {}
  public fun get_target_priority_list() {}
}`,
              },
            },
          },
        });
      }

      return Promise.resolve({
        data: {
          content: {
            disassembled: {
              perimeter_watch: `module builder_extensions::perimeter_watch {
  public struct TurretAuth has drop {}
  public fun get_target_priority_list() {}
}`,
            },
          },
        },
      });
    });

    const { result } = renderHook(() => useAuthorizationContracts({
      fallbackDeploymentState,
      suiClient: { getObject, getOwnedObjects },
      targetId: fallbackDeploymentState.targetId,
      walletAddress: "0x1234",
    }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.contracts).toEqual([
      fallbackDeploymentState,
      {
        version: 1,
        packageId: "0xdecafbad",
        moduleName: "perimeter_watch",
        targetId: "testnet:stillness",
        transactionDigest: "0xdecafbad",
        deployedAt: new Date(0).toISOString(),
        contractName: "Perimeter Watch",
      },
    ]);
  });

  it("falls back to the current deployment when wallet contract discovery is unavailable", async () => {
    const { result } = renderHook(() => useAuthorizationContracts({
      fallbackDeploymentState,
      suiClient: {},
      targetId: fallbackDeploymentState.targetId,
      walletAddress: "0x1234",
    }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.contracts).toEqual([fallbackDeploymentState]);
    expect(result.current.errorMessage).toBeNull();
  });

  it("binds Sui client methods before loading wallet UpgradeCaps", async () => {
    const clientState = {
      packageIds: ["0xfeedface", "0xdecafbad"],
    };

    const suiClient = {
      state: clientState,
      getOwnedObjects(this: { readonly state: typeof clientState }) {
        return Promise.resolve({
          data: this.state.packageIds.map((packageId) => ({
            data: {
              content: {
                fields: {
                  package: packageId,
                },
              },
            },
          })),
          hasNextPage: false,
          nextCursor: null,
        });
      },
      getObject(this: { readonly state: typeof clientState }, { id }: { readonly id: string }) {
        return Promise.resolve({
          data: {
            content: {
              disassembled: {
                [id === "0xfeedface" ? "starter_contract" : "perimeter_watch"]: `module builder_extensions::${id === "0xfeedface" ? "starter_contract" : "perimeter_watch"} {
  public struct TurretAuth has drop {}
  public fun get_target_priority_list() {}
}`,
              },
            },
          },
        });
      },
    };

    const { result } = renderHook(() => useAuthorizationContracts({
      fallbackDeploymentState,
      suiClient,
      targetId: fallbackDeploymentState.targetId,
      walletAddress: "0x1234",
    }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.contracts).toHaveLength(2);
    expect(result.current.contracts.map((contract) => contract.packageId)).toEqual(["0xfeedface", "0xdecafbad"]);
  });
});