import type { NodeCodeGenerator } from "../types";

import { createCommentBlock, okValidationResult } from "./shared";

function createAccessorGenerator(nodeType: string, description: string): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node) {
      return createCommentBlock(node, [`accessor ${nodeType}`, description]);
    },
  };
}

const dataAccessorGenerators: readonly NodeCodeGenerator[] = [
  createAccessorGenerator("getTribe", "extract tribe and owner tribe"),
  createAccessorGenerator("hpRatio", "read hull integrity ratio"),
  createAccessorGenerator("shieldRatio", "read shield integrity ratio"),
  createAccessorGenerator("armorRatio", "read armor integrity ratio"),
  createAccessorGenerator("getGroupId", "read group identifier"),
  createAccessorGenerator("getBehaviour", "read behaviour code"),
  createAccessorGenerator("isAggressor", "read aggressor flag"),
  createAccessorGenerator("getPriorityWeight", "read base priority weight"),
  createAccessorGenerator("behaviourBonus", "apply behaviour bonus"),
  createAccessorGenerator("aggressorBonus", "apply aggressor bonus"),
  createAccessorGenerator("damageBonus", "apply damage ratio bonus"),
  createAccessorGenerator("sizeTierBonus", "apply size tier bonus"),
  createAccessorGenerator("groupBonusLookup", "look up group bonus from config"),
  createAccessorGenerator("threatBonus", "apply threat ledger bonus"),
  createAccessorGenerator("historyPenalty", "apply round robin history penalty"),
  createAccessorGenerator("getTribeListFromConfig", "read tribe list from config"),
  createAccessorGenerator("getItemListFromConfig", "read item list from config"),
  createAccessorGenerator("getCharacterListFromConfig", "read character list from config"),
];

export default dataAccessorGenerators;