import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

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
    return `if (${behaviourBinding} == BEHAVIOUR_STARTED_ATTACK) { ${weightInBinding} + STARTED_ATTACK_BONUS } else if (${behaviourBinding} == BEHAVIOUR_ENTERED) { ${weightInBinding} + ENTERED_BONUS } else { ${weightInBinding} }`;
  }),
  createScoringGenerator("aggressorBonus", (node, context, weightInBinding) => {
    const aggressorBinding = resolveInput(context, node, "is_aggressor", "false");
    return `if (${aggressorBinding}) { ${weightInBinding} + AGGRESSOR_BONUS } else { ${weightInBinding} }`;
  }),
  createScoringGenerator("damageBonus", (node, context, weightInBinding) => {
    const hpBinding = resolveInput(context, node, "hp_ratio", "100");
    const shieldBinding = resolveInput(context, node, "shield_ratio", "100");
    const armorBinding = resolveInput(context, node, "armor_ratio", "100");
    return `${weightInBinding} + ((100 - ${shieldBinding}) * SHIELD_BREAK_BONUS_MULTIPLIER) + ((100 - ${armorBinding}) * ARMOR_BREAK_BONUS_MULTIPLIER) + ((100 - ${hpBinding}) * HULL_BREAK_BONUS_MULTIPLIER)`;
  }),
  createScoringGenerator("sizeTierBonus", (node, context, weightInBinding) => {
    const groupIdBinding = resolveInput(context, node, "group_id", "0");
    return `${weightInBinding} + (tier_for_group(${groupIdBinding}) * TIER_WEIGHT)`;
  }),
];

export default scoringModifierGenerators;