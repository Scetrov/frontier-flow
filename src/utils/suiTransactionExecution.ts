import { fromBase64 } from "@mysten/sui/utils";

import { extractPublishedPackageId, readSuccessfulSuiTransaction } from "./suiTransactionResult";

export class AmbiguousSubmissionError extends Error {
  readonly digest?: string;

  constructor(message: string, digest?: string) {
    super(message);
    this.name = "AmbiguousSubmissionError";
    this.digest = digest;
  }
}

interface SignedExecutionClient {
  executeTransaction(input: {
    readonly transaction: Uint8Array;
    readonly signatures: string[];
    readonly include: { readonly effects: true; readonly protoJson: true };
    readonly signal?: AbortSignal;
  }): Promise<unknown>;
}

export interface SignedExecutionResult {
  readonly digest: string;
  readonly packageId?: string;
}

/** Submit already-signed bytes once. Never signs, retries, or treats a digest as success. */
export async function executeSignedGrpcTransaction(
  client: SignedExecutionClient,
  transaction: Uint8Array | string,
  signature: string,
  signal?: AbortSignal,
): Promise<SignedExecutionResult> {
  const bytes = typeof transaction === "string" ? fromBase64(transaction) : transaction;
  let response: unknown;
  try {
    response = await client.executeTransaction({
      transaction: bytes,
      signatures: [signature],
      include: { effects: true, protoJson: true },
      signal,
    });
  } catch (error: unknown) {
    signal?.throwIfAborted();
    throw new AmbiguousSubmissionError(
      "Submission outcome is unresolved. Nothing will be signed or submitted again automatically.",
      digestFromError(error),
    );
  }
  const { digest, transaction: evidence } = readSuccessfulSuiTransaction(response);
  return { digest, packageId: publishedPackageId(evidence) };
}

function publishedPackageId(transaction: Record<string, unknown>): string | undefined {
  try {
    return extractPublishedPackageId(transaction);
  } catch {
    return undefined;
  }
}

function digestFromError(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("digest" in error)) return undefined;
  return typeof error.digest === "string" ? error.digest : undefined;
}
