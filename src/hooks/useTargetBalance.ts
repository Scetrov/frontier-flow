import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";

import type { DeploymentTargetId } from "../compiler/types";
import { getLocalEnvironmentConfigSnapshot, subscribeToLocalEnvironmentChanges } from "../data/localEnvironment";
import { createSuiTargetClient, targetBalanceQueryKey } from "../utils/suiTargetClient";

interface TargetBalanceResult {
  readonly totalBalance: string;
}

export const TARGET_BALANCE_TIMEOUT_MS = 8_000;

/** Read the selected target through gRPC; unavailable responses are never zero. */
export function useTargetBalance(ownerAddress: string | null, targetId: DeploymentTargetId) {
  useSyncExternalStore(
    subscribeToLocalEnvironmentChanges,
    () => getLocalEnvironmentConfigSnapshot() ?? "",
    () => "",
  );

  const queryKey = targetBalanceQueryKey(targetId, ownerAddress);
  return useQuery<TargetBalanceResult>({
    enabled: ownerAddress !== null,
    queryKey,
    queryFn: async ({ signal }) => {
      if (ownerAddress === null) {
        throw new Error("A connected account is required to query Sui balance.");
      }
      const client = createSuiTargetClient({
        networkFamily: targetId === "local" ? "local" : "testnet",
        rpcUrl: queryKey[2],
      });
      // The high-level SDK defaults omitted balance fields to zero. Read the
      // supported native API to reject malformed/missing authoritative data.
      const { balance } = await client.stateService.getBalance({
        owner: ownerAddress,
        coinType: SUI_TYPE_ARG,
      }, {
        abort: AbortSignal.any([signal, AbortSignal.timeout(TARGET_BALANCE_TIMEOUT_MS)]),
        timeout: TARGET_BALANCE_TIMEOUT_MS,
      }).response;
      if (typeof balance?.balance !== "bigint" || balance.balance < 0n
        || balance.coinType === undefined
        || normalizeStructTag(balance.coinType) !== normalizeStructTag(SUI_TYPE_ARG)) {
        throw new Error(`Sui balance unavailable for ${targetId}: response omitted required balance data.`);
      }
      return { totalBalance: balance.balance.toString() };
    },
    retry: 1,
    retryDelay: 200,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}
