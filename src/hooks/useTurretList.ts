import { useEffect, useMemo, useState } from "react";

import type { StoredDeploymentState, TurretInfo } from "../types/authorization";
import { fetchTurrets } from "../utils/turretQueries";

export type TurretListStatus = "idle" | "loading" | "success" | "error";

interface UseTurretListOptions {
  readonly deploymentState: StoredDeploymentState | null;
  readonly walletAddress: string | null;
  readonly fetchTurretsFn?: typeof fetchTurrets;
}

interface TurretListQueryState {
  readonly requestKey: string | null;
  readonly status: Exclude<TurretListStatus, "idle" | "loading">;
  readonly turrets: readonly TurretInfo[];
  readonly errorMessage: string | null;
}

export interface UseTurretListResult {
  readonly status: TurretListStatus;
  readonly turrets: readonly TurretInfo[];
  readonly errorMessage: string | null;
  readonly refresh: () => Promise<void>;
}

/**
 * Load the connected wallet's turrets for the active deployment target.
 */
export function useTurretList({ deploymentState, walletAddress, fetchTurretsFn = fetchTurrets }: UseTurretListOptions): UseTurretListResult {
  const [refreshToken, setRefreshToken] = useState(0);
  const [queryState, setQueryState] = useState<TurretListQueryState>({
    requestKey: null,
    status: "success",
    turrets: [],
    errorMessage: null,
  });
  const requestKey = useMemo(() => {
    if (deploymentState === null || walletAddress === null) {
      return null;
    }

    return [deploymentState.targetId, deploymentState.packageId, walletAddress, String(refreshToken)].join(":");
  }, [deploymentState, refreshToken, walletAddress]);

  useEffect(() => {
    if (requestKey === null || deploymentState === null || walletAddress === null) {
      return;
    }

    const abortController = new AbortController();

    void fetchTurretsFn({
      deploymentState,
      walletAddress,
      signal: abortController.signal,
    }).then((nextTurrets) => {
      if (abortController.signal.aborted) {
        return;
      }

      setQueryState({
        requestKey,
        status: "success",
        turrets: nextTurrets,
        errorMessage: null,
      });
    }).catch((error: unknown) => {
      if (abortController.signal.aborted || isAbortError(error)) {
        return;
      }

      setQueryState({
        requestKey,
        status: "error",
        turrets: [],
        errorMessage: error instanceof Error ? error.message : "Failed to load turrets.",
      });
    });

    return () => {
      abortController.abort();
    };
  }, [deploymentState, fetchTurretsFn, requestKey, walletAddress]);

  const result = useMemo<UseTurretListResult>(() => {
    if (deploymentState === null) {
      return {
        status: "idle",
        turrets: [],
        errorMessage: null,
        refresh: () => Promise.resolve(),
      };
    }

    if (walletAddress === null) {
      return {
        status: "error",
        turrets: [],
        errorMessage: "Connect a Sui wallet to load owned turrets.",
        refresh: () => Promise.resolve(),
      };
    }

    if (queryState.requestKey !== requestKey) {
      return {
        status: "loading",
        turrets: [],
        errorMessage: null,
        refresh: () => Promise.resolve(),
      };
    }

    return {
      status: queryState.status,
      turrets: queryState.turrets,
      errorMessage: queryState.errorMessage,
      refresh: () => Promise.resolve(),
    };
  }, [deploymentState, queryState, requestKey, walletAddress]);

  return {
    ...result,
    refresh: () => {
      setRefreshToken((value) => value + 1);
      return Promise.resolve();
    },
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}