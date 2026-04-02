import type { DeploymentStage, PublishPayloadReadinessResult } from "../compiler/types";
import { PublishPayloadEmptyError } from "../compiler/types";

type PublishPayloadSource = "artifact" | "deploy-grade";

export interface PublishPayloadValidationContext {
  readonly stage: DeploymentStage;
  readonly targetLabel: string;
  readonly source: PublishPayloadSource;
}

function hasEmptyModule(modules: readonly Uint8Array[]): boolean {
  return modules.some((module) => module.length === 0);
}

function createBlockedMessage(context: PublishPayloadValidationContext, modules: readonly Uint8Array[]): string {
  if (modules.length === 0) {
    if (context.source === "artifact") {
      return `Deployment package for ${context.targetLabel} did not produce any publishable Move modules because the current artifact does not contain compiled contract bytecode. The graph was never built successfully, the compiled artifact went stale, or the compiled module set was lost before publish.`;
    }

    return `Deployment package for ${context.targetLabel} did not produce any publishable Move modules because deploy-grade compilation left only dependency or world modules in the final package. There is no contract-specific bytecode left to publish.`;
  }

  return `Deployment package for ${context.targetLabel} did not produce any publishable Move modules because at least one compiled module was emitted as empty bytes. The final package is malformed and cannot be published.`;
}

function createBlockedResult(
  modules: readonly Uint8Array[],
  context: PublishPayloadValidationContext,
): PublishPayloadReadinessResult {
  return {
    ready: false,
    stage: context.stage,
    message: createBlockedMessage(context, modules),
    remediation: "Rebuild or refresh the deployment package so the final publish payload contains compiled Move modules, then retry deployment.",
    errorCode: "publish-payload-empty",
  };
}

/**
 * Validate the final publish payload before any wallet signing or transaction submission starts.
 */
export function validatePublishPayloadReadiness(
  modules: readonly Uint8Array[],
  context: PublishPayloadValidationContext,
): PublishPayloadReadinessResult {
  if (modules.length === 0 || hasEmptyModule(modules)) {
    return createBlockedResult(modules, context);
  }

  return {
    ready: true,
    stage: context.stage,
    message: `Deployment package for ${context.targetLabel} is ready to publish.`,
    remediation: "",
  };
}

/**
 * Throw a typed validation error when the final publish payload is empty or malformed.
 */
export function assertPublishPayloadReadiness(
  modules: readonly Uint8Array[],
  context: PublishPayloadValidationContext,
): void {
  const result = validatePublishPayloadReadiness(modules, context);

  if (!result.ready) {
    throw new PublishPayloadEmptyError(result);
  }
}