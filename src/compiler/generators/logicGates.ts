import type { NodeCodeGenerator } from "../types";

import { createCommentBlock, okValidationResult } from "./shared";

function createLogicGenerator(nodeType: string, description: string): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node) {
      return createCommentBlock(node, [`logic gate ${nodeType}`, description]);
    },
  };
}

const logicGateGenerators: readonly NodeCodeGenerator[] = [
  createLogicGenerator("excludeOwner", "exclude the owner entity"),
  createLogicGenerator("excludeSameTribe", "exclude same-tribe non-aggressors"),
  createLogicGenerator("excludeStoppedAttack", "exclude stopped attacks"),
  createLogicGenerator("excludeNpc", "exclude npc targets"),
  createLogicGenerator("isInList", "branch on list membership"),
  createLogicGenerator("countAggressors", "count aggressors and raid threshold"),
];

export default logicGateGenerators;