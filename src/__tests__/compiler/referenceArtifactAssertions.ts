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
  expect(resolvedArtifact.moveSource).toContain("public fun get_target_priority_list(");
  expect(resolvedArtifact.moveSource).toContain("public(package) fun build_priority_list_for_owner(");
  expect(resolvedArtifact.moveSource).toContain("fun score_candidate(");
  expect(resolvedArtifact.moveSource).toContain("public struct TargetCandidateArg has copy, drop, store");
  expect(resolvedArtifact.moveSource).toContain("public struct TurretAuth has drop {}");
  expect(resolvedArtifact.moveSource).toContain("world_turret::destroy_online_receipt(receipt, TurretAuth {})");
  expect(resolvedArtifact.moveSource).toContain("fun unpack_candidate_list(candidate_list_bytes: vector<u8>)");
  expect(resolvedArtifact.moveSource).not.toContain("% 11");
  expect(resolvedArtifact.compileReadiness?.ready ?? true).toBe(true);
  expect(resolvedArtifact.deploymentStatus?.targetMode).toBe("existing-turret");
  expect(resolvedArtifact.deploymentStatus?.status).toBe("blocked");

  switch (referenceCase.id) {
    case "turret_aggressor_first":
      expect(resolvedArtifact.moveSource).toContain("SHIELD_BREAK_BONUS_MULTIPLIER");
      expect(resolvedArtifact.moveSource).toContain("let excludeowner_aggressor_first_exclude_owner_include: bool = aggression_aggressor_first_aggression_target.character_id != owner_character_id;");
      expect(resolvedArtifact.moveSource).toContain("let excludestoppedattack_aggressor_first_exclude_stopped_attack_include: bool = getbehaviour_aggressor_first_get_behaviour_behaviour != BEHAVIOUR_STOPPED_ATTACK;");
      expect(resolvedArtifact.moveSource).toContain("let excludesametribe_aggressor_first_exclude_same_tribe_include: bool = gettribe_aggressor_first_get_tribe_tribe != gettribe_aggressor_first_get_tribe_owner_tribe || isaggressor_aggressor_first_is_aggressor_is_aggressor;");
      expect(resolvedArtifact.moveSource).toContain("let booleanand_aggressor_first_boolean_and_2_result: bool = booleanand_aggressor_first_boolean_and_1_result && excludesametribe_aggressor_first_exclude_same_tribe_include;");
      expect(resolvedArtifact.moveSource).toContain("let aggressorbonus_aggressor_first_aggressor_bonus_weight_out: u64 = if (isaggressor_aggressor_first_is_aggressor_is_aggressor)");
      expect(resolvedArtifact.moveSource).toContain("let damagebonus_aggressor_first_damage_bonus_weight_out: u64 = aggressorbonus_aggressor_first_aggressor_bonus_weight_out + ((100 - shieldratio_aggressor_first_shield_ratio_shield_ratio) * SHIELD_BREAK_BONUS_MULTIPLIER)");
      expect(resolvedArtifact.moveSource).not.toContain("candidate.is_aggressor || candidate.character_tribe != owner_tribe");
      break;
    case "turret_low_hp_finisher":
      expect(resolvedArtifact.moveSource).toContain("let damagebonus_low_hp_damage_bonus_weight_out_remaining_total: u64 = hpratio_low_hp_hp_ratio_hp_ratio + shieldratio_low_hp_shield_ratio_shield_ratio + armorratio_low_hp_armor_ratio_armor_ratio;");
      expect(resolvedArtifact.moveSource).toContain("let damagebonus_low_hp_damage_bonus_weight_out_damage_total: u64 = if (damagebonus_low_hp_damage_bonus_weight_out_remaining_total <= 300) { 300 - damagebonus_low_hp_damage_bonus_weight_out_remaining_total } else { 0 };");
      expect(resolvedArtifact.moveSource).toContain("let damagebonus_low_hp_damage_bonus_weight_out: u64 = getpriorityweight_low_hp_get_priority_weight_weight + (damagebonus_low_hp_damage_bonus_weight_out_damage_total * 100);");
      expect(resolvedArtifact.moveSource).toContain("let addtoqueue_low_hp_add_to_queue_include_result: bool = true;");
      expect(resolvedArtifact.moveSource).not.toContain(".character_id == owner_character_id");
      expect(resolvedArtifact.moveSource).not.toContain(".character_id != owner_character_id");
      break;
    case "turret_player_screen":
      expect(resolvedArtifact.moveSource).toContain("PLAYER_TARGET_BONUS");
      expect(resolvedArtifact.moveSource).toContain("let excludenpc_player_screen_exclude_npc_include: bool = aggression_player_screen_aggression_target.character_id != 0;");
      expect(resolvedArtifact.moveSource).toContain("let excludeowner_player_screen_exclude_owner_include: bool = aggression_player_screen_aggression_target.character_id != owner_character_id;");
      expect(resolvedArtifact.moveSource).toContain("let excludestoppedattack_player_screen_exclude_stopped_attack_include: bool = getbehaviour_player_screen_get_behaviour_behaviour != BEHAVIOUR_STOPPED_ATTACK;");
      expect(resolvedArtifact.moveSource).toContain("let excludesametribe_player_screen_exclude_same_tribe_include: bool = gettribe_player_screen_get_tribe_tribe != gettribe_player_screen_get_tribe_owner_tribe || isaggressor_player_screen_is_aggressor_is_aggressor;");
      expect(resolvedArtifact.moveSource).toContain("let booleanand_player_screen_boolean_and_3_result: bool = booleanand_player_screen_boolean_and_2_result && excludesametribe_player_screen_exclude_same_tribe_include;");
      expect(resolvedArtifact.moveSource).toContain("let behaviourbonus_player_screen_behaviour_bonus_weight_out: u64 = if (getbehaviour_player_screen_get_behaviour_behaviour == BEHAVIOUR_STARTED_ATTACK) { (getpriorityweight_player_screen_get_priority_weight_weight + PLAYER_TARGET_BONUS) + STARTED_ATTACK_BONUS }");
      expect(resolvedArtifact.moveSource).toContain("let aggressorbonus_player_screen_aggressor_bonus_weight_out: u64 = if (isaggressor_player_screen_is_aggressor_is_aggressor) { behaviourbonus_player_screen_behaviour_bonus_weight_out + AGGRESSOR_BONUS } else { behaviourbonus_player_screen_behaviour_bonus_weight_out };");
      expect(resolvedArtifact.moveSource).not.toContain("let is_npc = character_id == 0;");
      break;
    case "turret_size_priority":
      expect(resolvedArtifact.moveSource).toContain("fun tier_for_group(group_id: u64): u64");
      expect(resolvedArtifact.moveSource).toContain("let sizetierbonus_size_priority_size_tier_bonus_weight_out: u64 = getpriorityweight_size_priority_get_priority_weight_weight + (tier_for_group(getgroupid_size_priority_get_group_id_group_id) * TIER_WEIGHT);");
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