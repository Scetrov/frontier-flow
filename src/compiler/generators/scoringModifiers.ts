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
    return `${weightInBinding} + (${behaviourBinding} * 5)`;
  }),
  createScoringGenerator("aggressorBonus", (node, context, weightInBinding) => {
    const aggressorBinding = resolveInput(context, node, "is_aggressor", "false");
    return `if (${aggressorBinding}) { ${weightInBinding} + 25 } else { ${weightInBinding} }`;
  }),
  createScoringGenerator("damageBonus", (node, context, weightInBinding) => {
    const hpBinding = resolveInput(context, node, "hp_ratio", "100");
    const shieldBinding = resolveInput(context, node, "shield_ratio", "100");
    const armorBinding = resolveInput(context, node, "armor_ratio", "100");
    return `${weightInBinding} + ((100 - ${hpBinding}) + (100 - ${shieldBinding}) + (100 - ${armorBinding}))`;
  }),
  createScoringGenerator("sizeTierBonus", (node, context, weightInBinding) => {
    const groupIdBinding = resolveInput(context, node, "group_id", "0");
    return `${weightInBinding} + ((${groupIdBinding} % 5) * 10)`;
  }),
  createScoringGenerator("groupBonusLookup", (node, context, weightInBinding) => {
    const groupIdBinding = resolveInput(context, node, "group_id", "0");
    const configBinding = resolveInput(context, node, "config", "0");
    return `${weightInBinding} + ${configBinding} + (${groupIdBinding} % 3)`;
  }),
  createScoringGenerator("threatBonus", (node, context, weightInBinding) => {
    const tribeBinding = resolveInput(context, node, "tribe", "0");
    const configBinding = resolveInput(context, node, "config", "0");
    return `${weightInBinding} + ${configBinding} + (${tribeBinding} % 4)`;
  }),
  createScoringGenerator("historyPenalty", (node, context, weightInBinding) => {
    const targetBinding = resolveInput(context, node, "target", "0");
    return `if (${targetBinding} % 2 == 0 && ${weightInBinding} > 9) { ${weightInBinding} - 10 } else { ${weightInBinding} }`;
  }),
];

export default scoringModifierGenerators;