import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

import type { DeploymentTargetId } from "../compiler/types";
import { getLocalEnvironmentConfigSnapshot, subscribeToLocalEnvironmentChanges } from "../data/localEnvironment";
import { getDeploymentTarget } from "../data/deploymentTargets";

interface TargetBalanceResult {
  readonly totalBalance: string | null;
}

/**
 * Query the connected wallet balance against the currently selected deployment target RPC.
 */
export function useTargetBalance(ownerAddress: string | null, targetId: DeploymentTargetId) {
  const localEnvironmentSnapshot = useSyncExternalStore(
    subscribeToLocalEnvironmentChanges,
    () => getLocalEnvironmentConfigSnapshot() ?? "",
    () => "",
  );
  const target = getDeploymentTarget(targetId);

  return useQuery<TargetBalanceResult>({
    enabled: ownerAddress !== null,
    queryKey: ["target-balance", target.id, target.rpcUrl, ownerAddress, localEnvironmentSnapshot],
    queryFn: async () => {
      if (ownerAddress === null) {
        return { totalBalance: null };
      }

      const client = new SuiJsonRpcClient({
        url: target.rpcUrl,
        network: target.networkFamily === "local" ? "localnet" : "testnet",
      });
      const balance = await client.getBalance({ owner: ownerAddress });

      return {
        totalBalance: balance.totalBalance,
      };
    },
    staleTime: 15_000,
  });
}