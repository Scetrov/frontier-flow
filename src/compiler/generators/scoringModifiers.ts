import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

function getDamageBonusStrategy(node: Parameters<NodeCodeGenerator["emit"]>[0]): "weighted-break" | "remaining-total" {
  return node.fields.damageStrategy === "remaining-total" ? "remaining-total" : "weighted-break";
}

function getBehaviourBonusStrategy(node: Parameters<NodeCodeGenerator["emit"]>[0]): "behaviour-only" | "player-target" {
  return node.fields.bonusStrategy === "player-target" ? "player-target" : "behaviour-only";
}

function createScoringGenerator(
  nodeType: string,
  expression: (node: Parameters<NodeCodeGenerator["emit"]>[0], context: Parameters<NodeCodeGenerator["emit"]>[1], weightBinding: string) => string,
): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      const weightInBinding = resolveInput(context, node, "weight_in", "0");
      const weightOutBinding = bindOutput(context, node, "weight_out");

      return [
        ...createCommentBlock(node, [`scoring modifier ${nodeType}`, "mutate running candidate weight"]),
        { code: `let ${weightOutBinding}: u64 = ${expression(node, context, weightInBinding)};`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

const scoringModifierGenerators: readonly NodeCodeGenerator[] = [
  createScoringGenerator("behaviourBonus", (node, context, weightInBinding) => {
    const behaviourBinding = resolveInput(context, node, "behaviour", "0");
    const baseWeightBinding = getBehaviourBonusStrategy(node) === "player-target"
      ? `(${weightInBinding} + PLAYER_TARGET_BONUS)`
      : weightInBinding;
    return `if (${behaviourBinding} == BEHAVIOUR_STARTED_ATTACK) { ${baseWeightBinding} + STARTED_ATTACK_BONUS } else if (${behaviourBinding} == BEHAVIOUR_ENTERED) { ${baseWeightBinding} + ENTERED_BONUS } else { ${baseWeightBinding} }`;
  }),
  createScoringGenerator("aggressorBonus", (node, context, weightInBinding) => {
    const aggressorBinding = resolveInput(context, node, "is_aggressor", "false");
    return `if (${aggressorBinding}) { ${weightInBinding} + AGGRESSOR_BONUS } else { ${weightInBinding} }`;
  }),
  {
    nodeType: "damageBonus",
    validate: () => okValidationResult(),
    emit(node, context) {
      const weightInBinding = resolveInput(context, node, "weight_in", "0");
      const weightOutBinding = bindOutput(context, node, "weight_out");
      const hpBinding = resolveInput(context, node, "hp_ratio", "100");
      const shieldBinding = resolveInput(context, node, "shield_ratio", "100");
      const armorBinding = resolveInput(context, node, "armor_ratio", "100");

      if (getDamageBonusStrategy(node) === "remaining-total") {
        const remainingTotalBinding = `${weightOutBinding}_remaining_total`;
        const damageTotalBinding = `${weightOutBinding}_damage_total`;

        return [
          ...createCommentBlock(node, ["scoring modifier damageBonus", "mutate running candidate weight"]),
          { code: `let ${remainingTotalBinding}: u64 = ${hpBinding} + ${shieldBinding} + ${armorBinding};`, nodeId: node.id, indent: 2 },
          { code: `let ${damageTotalBinding}: u64 = if (${remainingTotalBinding} <= 300) { 300 - ${remainingTotalBinding} } else { 0 };`, nodeId: node.id, indent: 2 },
          { code: `let ${weightOutBinding}: u64 = ${weightInBinding} + (${damageTotalBinding} * 100);`, nodeId: node.id, indent: 2 },
        ];
      }

      return [
        ...createCommentBlock(node, ["scoring modifier damageBonus", "mutate running candidate weight"]),
        {
          code: `let ${weightOutBinding}: u64 = ${weightInBinding} + ((100 - ${shieldBinding}) * SHIELD_BREAK_BONUS_MULTIPLIER) + ((100 - ${armorBinding}) * ARMOR_BREAK_BONUS_MULTIPLIER) + ((100 - ${hpBinding}) * HULL_BREAK_BONUS_MULTIPLIER);`,
          nodeId: node.id,
          indent: 2,
        },
      ];
    },
  },
  createScoringGenerator("sizeTierBonus", (node, context, weightInBinding) => {
    const groupIdBinding = resolveInput(context, node, "group_id", "0");
    return `${weightInBinding} + (tier_for_group(${groupIdBinding}) * TIER_WEIGHT)`;
  }),
];

export default scoringModifierGenerators;