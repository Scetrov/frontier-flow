import { expect } from "vitest";

import { createArtifactFingerprint } from "../../compiler/determinism";
import type { GeneratedContractArtifact, PipelineResult } from "../../compiler/types";

import type { ReferenceDagCase } from "./referenceDagFixtures";

export function expectSupportedReferenceArtifact(
  artifact: GeneratedContractArtifact | null,
  referenceCase: ReferenceDagCase,
): GeneratedContractArtifact {
  expect(artifact).not.toBeNull();
  const resolvedArtifact = artifact as GeneratedContractArtifact;

  expect(resolvedArtifact.moduleName).toBe(referenceCase.expectedModuleName);
  expect(resolvedArtifact.sourceFilePath).toBe(`sources/${referenceCase.expectedModuleName}.move`);
  expect(resolvedArtifact.moveSource).toContain(`module builder_extensions::${referenceCase.expectedModuleName}`);
  expect(resolvedArtifact.moveSource).toContain("public fun build_priority_list_for_owner(");
  expect(resolvedArtifact.moveSource).toContain("fun score_candidate(");
  expect(resolvedArtifact.moveSource).toContain("public struct TargetCandidateArg has copy, drop, store");
  expect(resolvedArtifact.moveSource).not.toContain("% 11");
  expect(resolvedArtifact.compileReadiness?.ready ?? true).toBe(true);
  expect(resolvedArtifact.deploymentStatus?.targetMode).toBe("existing-turret");
  expect(resolvedArtifact.deploymentStatus?.status).toBe("blocked");

  switch (referenceCase.id) {
    case "turret_aggressor_first":
      expect(resolvedArtifact.moveSource).toContain("SHIELD_BREAK_BONUS_MULTIPLIER");
      expect(resolvedArtifact.moveSource).toContain("candidate.is_aggressor || candidate.character_tribe != owner_tribe");
      break;
    case "turret_low_hp_finisher":
      expect(resolvedArtifact.moveSource).toContain("EHP_DAMAGE_MULTIPLIER");
      expect(resolvedArtifact.moveSource).toContain("let damage_total = if (remaining_total <= 300)");
      break;
    case "turret_player_screen":
      expect(resolvedArtifact.moveSource).toContain("PLAYER_TARGET_BONUS");
      expect(resolvedArtifact.moveSource).toContain("let is_npc = character_id == 0;");
      break;
    case "turret_size_priority":
      expect(resolvedArtifact.moveSource).toContain("fun tier_for_group(group_id: u64): u64");
      expect(resolvedArtifact.moveSource).toContain("weight = weight + (tier * TIER_WEIGHT);");
      break;
  }

  return resolvedArtifact;
}

export function expectUnsupportedReferenceFailure(result: PipelineResult, referenceCase: ReferenceDagCase): void {
  expect(result.status.state).toBe("error");
  expect(result.artifact).toBeNull();
  expect(
    result.diagnostics.some((diagnostic) => diagnostic.userMessage.includes(referenceCase.expectedBlockingDiagnostic ?? referenceCase.name)),
  ).toBe(true);
}

export function createReferenceFingerprint(artifact: GeneratedContractArtifact): string {
  return createArtifactFingerprint({
    artifactId: artifact.artifactId,
    moduleName: artifact.moduleName,
    sourceFilePath: artifact.sourceFilePath,
    moveToml: artifact.moveToml,
    moveSource: artifact.moveSource,
    dependencies: artifact.dependencies,
  });
}