import { Transaction } from "@mysten/sui/transactions";
import { fromBase64, toBase64 } from "@mysten/sui/utils";

import { getPackageReferenceBundle } from "../data/packageReferences";
import type { StoredDeploymentState } from "../types/authorization";
import type { SimulationCandidateDraft, SimulationPriorityEntry } from "../types/turretSimulation";
import { getSuiTargetClient } from "./suiTargetClient";
import {
  decodeReturnedMoveBytes,
  decodeSimulationPriorityEntries,
  encodeSimulationCandidates,
} from "./turretSimulationCodec";

/** Narrow injectable read-only boundary; no signing or execution method is available. */
export interface TurretSimulationClient {
  readonly simulateTransaction: (input: {
    readonly transaction: Transaction;
    readonly checksEnabled: false;
    readonly include: { readonly effects: true; readonly commandResults: true; readonly protoJson: true };
    readonly signal: AbortSignal;
  }) => Promise<unknown>;
}

export interface RunTurretSimulationInput {
  readonly candidate: SimulationCandidateDraft;
  readonly deploymentState: StoredDeploymentState;
  readonly ownerCharacterId: string;
  readonly sender: string;
  readonly suiClient?: TurretSimulationClient;
  readonly signal?: AbortSignal;
  readonly turretObjectId: string;
}

export type RunTurretSimulationResult =
  | {
      readonly kind: "success";
      readonly entries: readonly SimulationPriorityEntry[];
      readonly rawReturnedBytes: Uint8Array;
    }
  | {
      readonly kind: "execution-error";
      readonly details?: string;
      readonly message: string;
    };

type SimulationExecutionError = Extract<RunTurretSimulationResult, { readonly kind: "execution-error" }>;

function createExecutionError(message: string, details?: string): SimulationExecutionError {
  return { kind: "execution-error", ...(details === undefined ? {} : { details }), message };
}

function createSimulationTransaction(input: RunTurretSimulationInput): Transaction {
  const referenceBundle = getPackageReferenceBundle(input.deploymentState.targetId);
  const tx = new Transaction();
  tx.setSender(input.sender);
  const candidateBytes = encodeSimulationCandidates([input.candidate]);
  const receipt = tx.moveCall({
    target: `${referenceBundle.worldPackageId}::turret::verify_online`,
    arguments: [tx.object(input.turretObjectId)],
  });
  tx.moveCall({
    target: `${input.deploymentState.packageId}::${input.deploymentState.moduleName}::get_target_priority_list`,
    arguments: [
      tx.object(input.turretObjectId),
      tx.object(input.ownerCharacterId),
      tx.pure.vector("u8", Array.from(candidateBytes)),
      receipt,
    ],
  });
  return tx;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function arrayRecord(value: unknown, index: number, length: number): Record<string, unknown> | null {
  return Array.isArray(value) && value.length === length ? record(value[index]) : null;
}

function property(value: unknown, key: string): unknown {
  return record(value)?.[key];
}

function validateSuccessfulEffects(result: Record<string, unknown> | null): SimulationExecutionError | null {
  const proto = property(result, "protoJson");
  const status = property(property(property(proto, "transaction"), "effects"), "status");
  // SDK normalization alone may default omitted fields. Require explicit native evidence.
  const normalizedStatus = property(property(result, "Transaction"), "status");
  if (property(result, "$kind") === "Transaction" && property(status, "success") === true
    && property(normalizedStatus, "success") === true) return null;
  const description = property(property(status, "error"), "description");
  return createExecutionError("Simulation execution failed or omitted successful effects.",
    typeof description === "string" ? description : undefined);
}

function getNativeReturnValue(result: Record<string, unknown> | null): Record<string, unknown> | null {
  const outputs = record(result?.protoJson)?.commandOutputs;
  const returns = arrayRecord(outputs, 1, 2)?.returnValues;
  return record(arrayRecord(returns, 0, 1)?.value);
}

function normalizedBytesMatch(result: Record<string, unknown> | null, nativeValue: string): boolean {
  const returns = arrayRecord(result?.commandResults, 1, 2)?.returnValues;
  const bytes = arrayRecord(returns, 0, 1)?.bcs;
  return bytes instanceof Uint8Array && toBase64(bytes) === nativeValue;
}

function parseSimulationResult(response: unknown): RunTurretSimulationResult {
  const result = record(response);
  const effectsError = validateSuccessfulEffects(result);
  if (effectsError) return effectsError;
  const value = getNativeReturnValue(result);
  if (value?.name !== "vector<u8>") {
    return createExecutionError("Simulation execution returned a missing or unexpected Move type.");
  }
  if (typeof value.value !== "string" || value.value.length === 0) {
    return createExecutionError("Simulation execution did not return a result payload.");
  }
  const rawBytes = fromBase64(value.value);
  if (toBase64(rawBytes) !== value.value) {
    return createExecutionError("Simulation execution returned malformed result bytes.");
  }
  if (!normalizedBytesMatch(result, value.value)) {
    return createExecutionError("Simulation execution returned inconsistent result bytes.");
  }
  const returnedBytes = decodeReturnedMoveBytes(rawBytes);
  return { kind: "success", entries: decodeSimulationPriorityEntries(returnedBytes), rawReturnedBytes: returnedBytes };
}

/** Simulate once with disabled validation checks, never sign or submit a transaction. */
export async function runTurretSimulation(input: RunTurretSimulationInput): Promise<RunTurretSimulationResult> {
  if (input.deploymentState.targetId === "local") {
    return createExecutionError("Turret simulation is only available for published testnet deployments.");
  }
  const deadline = AbortSignal.timeout(8_000);
  const signal = input.signal ? AbortSignal.any([input.signal, deadline]) : deadline;
  try {
    signal.throwIfAborted();
    const client = input.suiClient ?? getSuiTargetClient(input.deploymentState.targetId, { timeout: 8_000, abort: signal });
    const result = await client.simulateTransaction({
      transaction: createSimulationTransaction(input),
      checksEnabled: false,
      include: { effects: true, commandResults: true, protoJson: true },
      signal,
    });
    signal.throwIfAborted();
    return parseSimulationResult(result);
  } catch (error: unknown) {
    return createExecutionError("Simulation execution could not be completed.",
      error instanceof Error ? error.message : "Unknown execution error.");
  }
}
