import { normalizeStructTag, normalizeSuiAddress } from "@mysten/sui/utils";
import type { DeploymentStage, DeploymentTarget, GeneratedContractArtifact } from "../compiler/types";
import { createSuiTargetClient } from "../utils/suiTargetClient";
import { extractPublishedPackageId, readSuccessfulSuiTransaction } from "../utils/suiTransactionResult";

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

export interface DeploymentConfirmationClient {
  readonly getTransaction: (input: {
    readonly digest: string;
    readonly include: { readonly effects: true; readonly protoJson: true };
    readonly signal: AbortSignal;
  }) => Promise<unknown>;
  readonly getDatatype: (input: { readonly packageId: string; readonly moduleName: string; readonly name: string },
    options: { readonly abort: AbortSignal; readonly timeout: number }) => { readonly response: Promise<unknown> };
}

interface GrpcConfirmationOptions {
  readonly transactionTimeoutMs?: number;
  readonly interfaceTimeoutMs?: number;
  readonly pollIntervalMs?: number;
}

function createConfirmationClient(target: DeploymentTarget, signal: AbortSignal): DeploymentConfirmationClient {
  const client = createSuiTargetClient(target, { timeout: 8_000, abort: signal });
  return {
    getTransaction: client.getTransaction.bind(client),
    getDatatype: client.movePackageService.getDatatype.bind(client.movePackageService),
  };
}

/** Confirm explicit transaction effects and the actual TurretAuth identity on one captured endpoint. */
export async function confirmPublishedPackageWithClient(
  request: DeploymentConfirmationRequest,
  providedClient?: DeploymentConfirmationClient,
  options: GrpcConfirmationOptions = {},
): Promise<DeploymentConfirmationResult> {
  const unresolved = { confirmed: false, confirmationReference: request.transactionDigest, packageId: request.packageId, finalStage: "confirming" as const };
  if (request.transactionDigest === undefined) return unresolved;
  request.signal?.throwIfAborted();
  const client = providedClient ?? createConfirmationClient(request.target, request.signal ?? AbortSignal.timeout(50_000));
  const result = await waitForTransactionEvidence(client, request.transactionDigest, request.signal, options);
  if (result === null) return unresolved;
  const evidence = readPublicationEvidence(result, request);
  const confirmed = await waitForPublishedExtensionInterface({ client, moduleName: request.artifact.moduleName,
    packageId: evidence.packageId, signal: request.signal, timeoutMs: options.interfaceTimeoutMs ?? 30_000, pollIntervalMs: options.pollIntervalMs ?? 1_000 });
  return { confirmed, confirmationReference: evidence.digest, packageId: evidence.packageId, finalStage: "confirming" };
}

function readPublicationEvidence(result: unknown, request: DeploymentConfirmationRequest) {
  const { digest, transaction } = readSuccessfulSuiTransaction(result, request.transactionDigest);
  const packageId = extractPublishedPackageId(transaction);
  assertSubmittedPackage(request.packageId, packageId);
  return { digest, packageId };
}

function assertSubmittedPackage(submitted: string | undefined, observed: string): void {
  if (submitted !== undefined && normalizeSuiAddress(submitted) !== observed) {
    throw new Error("Confirmed publication package does not match the submitted package identity.");
  }
}

async function waitForTransactionEvidence(client: DeploymentConfirmationClient, digest: string, abort: AbortSignal | undefined,
  options: GrpcConfirmationOptions): Promise<unknown> {
  const timeoutMs = options.transactionTimeoutMs ?? 20_000;
  const deadline = Date.now() + timeoutMs;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = abort ? AbortSignal.any([abort, timeout]) : timeout;
  while (Date.now() < deadline) {
    abort?.throwIfAborted();
    try {
      const result = await client.getTransaction({ digest, include: { effects: true, protoJson: true }, signal });
      signal.throwIfAborted();
      return result;
    } catch {
      abort?.throwIfAborted();
      const remaining = deadline - Date.now();
      if (remaining <= 0 || timeout.aborted) break;
      await sleep(Math.min(options.pollIntervalMs ?? 1_000, remaining), abort);
    }
  }
  return null;
}

function hasExpectedDatatype(response: unknown, packageId: string, moduleName: string): boolean {
  const fields = datatypeFields(response);
  return fields !== null && matchesTurretAuthIdentity(fields, packageId, moduleName);
}

function datatypeFields(response: unknown): Record<string, unknown> | null {
  if (typeof response !== "object" || response === null || !("datatype" in response)) return null;
  const datatype = response.datatype;
  return typeof datatype === "object" && datatype !== null ? datatype as Record<string, unknown> : null;
}

function matchesTurretAuthIdentity(fields: Record<string, unknown>, packageId: string, moduleName: string): boolean {
  return fields.module === moduleName && fields.name === "TurretAuth"
    && typeof fields.definingId === "string" && normalizeSuiAddress(fields.definingId) === packageId
    && typeof fields.typeName === "string" && normalizeStructTag(fields.typeName) === `${packageId}::${moduleName}::TurretAuth`;
}

async function waitForPublishedExtensionInterface(input: {
  readonly client: DeploymentConfirmationClient;
  readonly moduleName: string;
  readonly packageId: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
  readonly pollIntervalMs: number;
}): Promise<boolean> {
  const deadline = Date.now() + input.timeoutMs;
  const timeout = AbortSignal.timeout(input.timeoutMs);
  const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  while (Date.now() < deadline) {
    input.signal?.throwIfAborted();
    try {
      const response = await input.client.getDatatype({ packageId: input.packageId, moduleName: input.moduleName, name: "TurretAuth" },
        { abort: signal, timeout: Math.min(8_000, deadline - Date.now()) }).response;
      signal.throwIfAborted();
      if (hasExpectedDatatype(response, input.packageId, input.moduleName)) return true;
    } catch { input.signal?.throwIfAborted(); }
    const remaining = deadline - Date.now();
    if (remaining <= 0 || timeout.aborted) break;
    await sleep(Math.min(input.pollIntervalMs, remaining), input.signal);
  }
  return false;
}

function createAbortError(): Error {
  return new Error("Deployment confirmation was aborted.");
}

function assertConfirmationActive(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw createAbortError();
}

async function sleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted === true) throw createAbortError();
  await new Promise<void>((resolve, reject) => {
    function handleAbort(): void {
      clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
      reject(createAbortError());
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

/** Poll a caller-provided read-only verifier; never sign or submit again. */
export async function confirmPublishedPackage(request: DeploymentConfirmationRequest,
  verify: (request: DeploymentConfirmationRequest) => Promise<DeploymentConfirmationResult | null>,
  options: DeploymentConfirmationOptions = {}): Promise<DeploymentConfirmationResult> {
  const retries = options.retries ?? 5;
  const retryDelayMs = options.retryDelayMs ?? 1_000;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    assertConfirmationActive(request.signal);
    const result = await verify(request);
    assertConfirmationActive(request.signal);
    if (result !== null) return result;
    if (attempt < retries) await sleep(retryDelayMs, request.signal);
  }
  return { confirmed: false, confirmationReference: request.transactionDigest, packageId: request.packageId, finalStage: "confirming" };
}
