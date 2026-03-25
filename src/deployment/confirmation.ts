import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type { SuiTransactionBlockResponse } from "@mysten/sui/jsonRpc";
import type { DeploymentStage, DeploymentTarget, GeneratedContractArtifact } from "../compiler/types";

export interface DeploymentConfirmationRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly packageId?: string;
  readonly target: DeploymentTarget;
  readonly transactionDigest?: string;
  readonly signal?: AbortSignal;
}

export interface DeploymentConfirmationResult {
  readonly confirmed: boolean;
  readonly confirmationReference?: string;
  readonly packageId?: string;
  readonly finalStage: DeploymentStage;
}

export interface DeploymentConfirmationOptions {
  readonly retries?: number;
  readonly retryDelayMs?: number;
}

const DEPLOYMENT_INTERFACE_TIMEOUT_MS = 30_000;
const DEPLOYMENT_INTERFACE_POLL_INTERVAL_MS = 1_000;

function getPublishedPackageId(result: SuiTransactionBlockResponse): string | undefined {
  return result.objectChanges?.find((change) => change.type === "published")?.packageId;
}

/**
 * Confirm a published package by waiting for the transaction to settle on a specific RPC target.
 */
export async function confirmPublishedPackageWithClient(
  request: DeploymentConfirmationRequest,
  client: SuiJsonRpcClient,
): Promise<DeploymentConfirmationResult> {
  if (request.transactionDigest === undefined) {
    return {
      confirmed: false,
      confirmationReference: undefined,
      packageId: request.packageId,
      finalStage: "confirming",
    };
  }

  const result = await client.waitForTransaction({
    digest: request.transactionDigest,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
    signal: request.signal,
    timeout: 20_000,
  });
  const packageId = getPublishedPackageId(result) ?? request.packageId;

  if (result.effects?.status.status === "success" && packageId !== undefined) {
    const interfaceReady = await waitForPublishedExtensionInterface({
      client,
      moduleName: request.artifact.moduleName,
      packageId,
      signal: request.signal,
      timeoutMs: DEPLOYMENT_INTERFACE_TIMEOUT_MS,
    });

    if (!interfaceReady) {
      return {
        confirmed: false,
        confirmationReference: result.digest,
        packageId,
        finalStage: "confirming",
      };
    }
  }

  return {
    confirmed: result.effects?.status.status === "success",
    confirmationReference: result.digest,
    packageId,
    finalStage: "confirming",
  };
}

async function waitForPublishedExtensionInterface(input: {
  readonly client: SuiJsonRpcClient;
  readonly moduleName: string;
  readonly packageId: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
}): Promise<boolean> {
  const deadline = Date.now() + input.timeoutMs;

  while (Date.now() <= deadline) {
    try {
      await input.client.getNormalizedMoveStruct({
        package: input.packageId,
        module: input.moduleName,
        struct: "TurretAuth",
        signal: input.signal,
      });
      return true;
    } catch {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        break;
      }

      await sleep(Math.min(DEPLOYMENT_INTERFACE_POLL_INTERVAL_MS, remainingMs), input.signal);
    }
  }

  return false;
}

function createAbortError(): Error {
  return new Error("Deployment confirmation was aborted.");
}

async function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  await new Promise<void>((resolve, reject) => {
    function handleAbort(): void {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      reject(createAbortError());
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    signal?.addEventListener(
      "abort",
      handleAbort,
      { once: true },
    );
  });
}

/**
 * Poll for deployment confirmation using a caller-provided verification function.
 */
export async function confirmPublishedPackage(
  request: DeploymentConfirmationRequest,
  verify: (request: DeploymentConfirmationRequest) => Promise<DeploymentConfirmationResult | null>,
  options: DeploymentConfirmationOptions = {},
): Promise<DeploymentConfirmationResult> {
  const retries = options.retries ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 1_000;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = await verify(request);
    if (result !== null) {
      return result;
    }

    if (attempt < retries) {
      await sleep(retryDelayMs, request.signal);
    }
  }

  return {
    confirmed: false,
    confirmationReference: request.transactionDigest,
    packageId: request.packageId,
    finalStage: "confirming",
  };
}