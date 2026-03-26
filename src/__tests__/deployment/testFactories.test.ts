import { describe, expect, it } from "vitest";

import {
  createDeploymentProgressFixture,
  createDeploymentReviewEntryFixture,
  createDeploymentStatusFixture,
  createDeploymentStatusMessageFixture,
  DEPLOY_GRADE_LOCAL_STAGE_SEQUENCE,
  DEPLOYMENT_STAGE_SEQUENCE,
} from "./testFactories";
import { getLocalDeploymentTargetLabel } from "../..//data/localEnvironment";

describe("deployment test factories", () => {
  it("derives progress stage count and completed stages from the shared sequence", () => {
    const progress = createDeploymentProgressFixture({
      stage: "submitting",
      stageIndex: 3,
    });

    expect(progress.stageCount).toBe(DEPLOYMENT_STAGE_SEQUENCE.length);
    expect(progress.completedStages).toEqual(["validating", "fetch-world-source", "resolve-dependencies"]);
  });

  it("uses current deployment blocker defaults instead of stale placeholder copy", () => {
    const status = createDeploymentStatusFixture();
    const reviewEntry = createDeploymentReviewEntryFixture();

    expect(status.requiredInputs).toEqual([
      "current compiled bytecode artifact",
      `published package references for ${getLocalDeploymentTargetLabel()}`,
      "available local validator",
    ]);
    expect(status.blockedReasons).toEqual(["The local validator required for local deployment is unavailable."]);
    expect(status.nextActionSummary).toBe("Start or configure the local validator, then retry deployment to local.");
    expect(reviewEntry.blockedReasons).toEqual(["The local validator required for local deployment is unavailable."]);
  });

  it("preserves confirmation references on status-message fixtures", () => {
    const statusMessage = createDeploymentStatusMessageFixture({
      confirmationReference: "0xdigest-42",
    });

    expect(statusMessage.confirmationReference).toBe("0xdigest-42");
  });

  it("uses the deploy-grade local stage sequence for local progress fixtures", () => {
    const progress = createDeploymentProgressFixture({
      targetId: "local",
      stage: "deploy-grade-compile",
      stageIndex: 3,
    });

    expect(progress.stageCount).toBe(DEPLOY_GRADE_LOCAL_STAGE_SEQUENCE.length);
    expect(progress.completedStages).toEqual(["validating", "fetch-world-source", "resolve-dependencies"]);
  });
});