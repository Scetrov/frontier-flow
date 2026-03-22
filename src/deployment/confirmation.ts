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

  return {
    confirmed: result.effects?.status.status === "success",
    confirmationReference: result.digest,
    packageId,
    finalStage: "confirming",
  };
}

function createAbortError(): Error {
  return new Error("Deployment confirmation was aborted.");
}

async function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, delayMs);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(createAbortError());
      },
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