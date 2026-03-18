import type { NodeCodeGenerator } from "../types";

import { createCommentBlock, okValidationResult } from "./shared";

function createScoringGenerator(nodeType: string): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node) {
      return createCommentBlock(node, [`scoring modifier ${nodeType}`, "mutate running candidate weight"]);
    },
  };
}

const scoringModifierGenerators: readonly NodeCodeGenerator[] = [
  createScoringGenerator("behaviourBonus"),
  createScoringGenerator("aggressorBonus"),
  createScoringGenerator("damageBonus"),
  createScoringGenerator("sizeTierBonus"),
  createScoringGenerator("groupBonusLookup"),
  createScoringGenerator("threatBonus"),
  createScoringGenerator("historyPenalty"),
];

export default scoringModifierGenerators;