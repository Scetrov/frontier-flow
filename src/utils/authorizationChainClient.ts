import { normalizeSuiAddress } from "@mysten/sui/utils";

import type { DeploymentTargetId } from "../compiler/types";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { createSuiTargetClient } from "./suiTargetClient";
import { readSuccessfulSuiTransaction } from "./suiTransactionResult";
import { AmbiguousSubmissionError, executeSignedGrpcTransaction } from "./suiTransactionExecution";

export interface AuthorizationEventEvidence {
  readonly packageId?: string;
  readonly module?: string;
  readonly type?: string;
  readonly parsedJson?: unknown;
}

export interface AuthorizationChainClient {
  executeSigned(bytes: string, signature: string, signal?: AbortSignal): Promise<{ readonly digest: string }>;
  waitForEffects(digest: string, timeoutMs: number, signal?: AbortSignal): Promise<{ readonly success: boolean } | "timeout">;
  readEvents(digest: string, signal?: AbortSignal): Promise<readonly AuthorizationEventEvidence[]>;
  isTurretAuthReady(packageId: string, moduleName: string, signal?: AbortSignal): Promise<boolean>;
}

/** Authoritative gRPC execution and transaction-scoped evidence for one captured target. */
export function createAuthorizationChainClient(targetId: DeploymentTargetId, signal?: AbortSignal): AuthorizationChainClient {
  const target = getDeploymentTarget(targetId);
  const client = createSuiTargetClient(target, { timeout: 8_000, abort: signal });
  return {
    async executeSigned(bytes, signature, callSignal) {
      try {
        const result = await executeSignedGrpcTransaction(client, bytes, signature, callSignal ?? signal);
        return { digest: result.digest };
      } catch (error: unknown) {
        if (error instanceof AmbiguousSubmissionError) throw error;
        throw new AmbiguousSubmissionError("Submission outcome is unresolved. Nothing will be signed or submitted again automatically.");
      }
    },
    async waitForEffects(digest, timeoutMs, callSignal) {
      const deadlineAt = Date.now() + timeoutMs;
      const signals = [signal, callSignal].filter((item): item is AbortSignal => item !== undefined);
      while (Date.now() <= deadlineAt) {
        const outcome = await readEffectsOnce(client, digest, deadlineAt, signals);
        if (outcome !== "retry") return outcome;
        await delay(Math.min(200, Math.max(0, deadlineAt - Date.now())));
      }
      return "timeout";
    },
    async readEvents(digest, callSignal) {
      const response = await client.getTransaction({
        digest,
        include: { effects: true, events: true, protoJson: true },
        signal: callSignal ?? signal,
      });
      const { transaction } = readSuccessfulSuiTransaction(response, digest);
      return normalizeEvents(transaction.events);
    },
    async isTurretAuthReady(packageId, moduleName, callSignal) {
      const response = await client.movePackageService.getDatatype({
        packageId,
        moduleName,
        name: "TurretAuth",
      }, { abort: callSignal ?? signal ?? AbortSignal.timeout(8_000), timeout: 8_000 }).response;
      return hasTurretAuth(response, packageId, moduleName);
    },
  };
}

async function readEffectsOnce(
  client: ReturnType<typeof createSuiTargetClient>,
  digest: string,
  deadlineAt: number,
  signals: readonly AbortSignal[],
): Promise<{ readonly success: boolean } | "timeout" | "retry"> {
  const deadline = AbortSignal.timeout(Math.min(8_000, Math.max(1, deadlineAt - Date.now())));
  try {
    const response = await client.getTransaction({
      digest,
      include: { effects: true, protoJson: true },
      signal: AbortSignal.any([deadline, ...signals]),
    });
    readSuccessfulSuiTransaction(response, digest);
    return { success: true };
  } catch (error: unknown) {
    return classifyEffectsReadError(error, deadline, deadlineAt, signals);
  }
}

function classifyEffectsReadError(
  error: unknown,
  deadline: AbortSignal,
  deadlineAt: number,
  signals: readonly AbortSignal[],
): { readonly success: false } | "timeout" | "retry" {
  if (signals.some((item) => item.aborted)) throw error;
  if (error instanceof Error && error.message.startsWith("Sui transaction execution failed")) return { success: false };
  const delayed = error instanceof Error && /not found/i.test(error.message);
  if (!delayed && !deadline.aborted) throw error;
  return Date.now() >= deadlineAt ? "timeout" : "retry";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEvents(events: unknown): readonly AuthorizationEventEvidence[] {
  if (!Array.isArray(events)) return [];
  return events.flatMap((event) => {
    if (typeof event !== "object" || event === null) return [];
    const fields = event as Record<string, unknown>;
    return [{
      packageId: typeof fields.packageId === "string" ? fields.packageId : undefined,
      module: typeof fields.module === "string" ? fields.module : undefined,
      type: typeof fields.eventType === "string" ? fields.eventType : undefined,
      parsedJson: fields.json,
    }];
  });
}

function hasTurretAuth(response: unknown, packageId: string, moduleName: string): boolean {
  if (typeof response !== "object" || response === null || !("datatype" in response)) return false;
  const datatype = response.datatype;
  if (typeof datatype !== "object" || datatype === null) return false;
  const fields = datatype as Record<string, unknown>;
  return fields.module === moduleName && fields.name === "TurretAuth"
    && typeof fields.definingId === "string" && normalizeSuiAddress(fields.definingId) === normalizeSuiAddress(packageId);
}
