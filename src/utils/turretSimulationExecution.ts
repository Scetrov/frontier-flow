import type { useSuiClient as useSuiClientHook } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";

import { getPackageReferenceBundle } from "../data/packageReferences";
import type { StoredDeploymentState } from "../types/authorization";
import type { SimulationCandidateDraft, SimulationPriorityEntry } from "../types/turretSimulation";
import {
  decodeReturnedMoveBytes,
  decodeSimulationPriorityEntries,
  encodeSimulationCandidates,
} from "./turretSimulationCodec";

type SuiClient = ReturnType<typeof useSuiClientHook>;

export interface RunTurretSimulationInput {
  readonly candidate: SimulationCandidateDraft;
  readonly deploymentState: StoredDeploymentState;
  readonly ownerCharacterId: string;
  readonly sender: string;
  readonly suiClient: Pick<SuiClient, "devInspectTransactionBlock">;
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

interface SimulationExecutionPayload {
  readonly kind: "payload";
  readonly rawBytes: number[];
}

type SimulationExecutionError = Extract<RunTurretSimulationResult, { readonly kind: "execution-error" }>;

function createExecutionError(message: string, details?: string): SimulationExecutionError {
  return {
    kind: "execution-error",
    ...(details === undefined ? {} : { details }),
    message,
  };
}

function createSimulationTransaction(input: RunTurretSimulationInput): Transaction {
  const referenceBundle = getPackageReferenceBundle(input.deploymentState.targetId);
  const tx = new Transaction();
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

function getExecutionReturnValue(result: Awaited<ReturnType<SuiClient["devInspectTransactionBlock"]>>) {
  const execution = result.results?.at(-1);
  return execution?.returnValues?.[0];
}

function getExecutionPayload(result: Awaited<ReturnType<SuiClient["devInspectTransactionBlock"]>>): SimulationExecutionPayload | SimulationExecutionError {
  const returnValue = getExecutionReturnValue(result);

  if (returnValue === undefined) {
    return createExecutionError("Simulation execution did not return a result payload.");
  }

  const [rawBytes, rawType] = returnValue;

  if (rawType !== "vector<u8>") {
    return createExecutionError("Simulation execution returned an unexpected Move type.", rawType);
  }

  return {
    kind: "payload",
    rawBytes,
  };
}

function decodeExecutionPayload(rawBytes: number[]): RunTurretSimulationResult {
  const returnedBytes = decodeReturnedMoveBytes(Uint8Array.from(rawBytes));

  return {
    kind: "success",
    entries: decodeSimulationPriorityEntries(returnedBytes),
    rawReturnedBytes: returnedBytes,
  };
}

function parseSimulationResult(result: Awaited<ReturnType<SuiClient["devInspectTransactionBlock"]>>): RunTurretSimulationResult {
  if (result.error !== null && result.error !== undefined) {
    return createExecutionError("Simulation execution failed in dev-inspect.", result.error);
  }

  const payload = getExecutionPayload(result);

  if (payload.kind !== "payload") {
    return payload;
  }

  return decodeExecutionPayload(payload.rawBytes);
}

/**
 * Build and dev-inspect the deployed turret extension call path without mutating chain state.
 */
export async function runTurretSimulation(input: RunTurretSimulationInput): Promise<RunTurretSimulationResult> {
  if (input.deploymentState.targetId === "local") {
    return createExecutionError("Turret simulation is only available for published testnet deployments.");
  }

  try {
    const tx = createSimulationTransaction(input);
    const result = await input.suiClient.devInspectTransactionBlock({
      sender: input.sender,
      transactionBlock: tx,
    });
    return parseSimulationResult(result);
  } catch (error: unknown) {
    return createExecutionError(
      "Simulation execution could not be completed.",
      error instanceof Error ? error.message : "Unknown execution error.",
    );
  }
}