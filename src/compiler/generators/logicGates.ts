import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

function createBooleanGateGenerator(
  nodeType: string,
  description: string,
  expression: (node: Parameters<NodeCodeGenerator["emit"]>[0], context: Parameters<NodeCodeGenerator["emit"]>[1]) => string,
): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      const includeBinding = bindOutput(context, node, "include");

      return [
        ...createCommentBlock(node, [`logic gate ${nodeType}`, description]),
        { code: `let ${includeBinding}: bool = ${expression(node, context)};`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

const logicGateGenerators: readonly NodeCodeGenerator[] = [
  createBooleanGateGenerator("excludeOwner", "exclude the owner entity", (node, context) => {
    const targetBinding = resolveInput(context, node, "target", "0");
    return `${targetBinding} != 1`;
  }),
  createBooleanGateGenerator("excludeSameTribe", "exclude same-tribe non-aggressors", (node, context) => {
    const tribeBinding = resolveInput(context, node, "tribe", "0");
    const ownerTribeBinding = resolveInput(context, node, "owner_tribe", "1");
    const aggressorBinding = resolveInput(context, node, "is_aggressor", "false");
    return `${tribeBinding} != ${ownerTribeBinding} || ${aggressorBinding}`;
  }),
  createBooleanGateGenerator("excludeStoppedAttack", "exclude stopped attacks", (node, context) => {
    const behaviourBinding = resolveInput(context, node, "behaviour", "0");
    return `${behaviourBinding} != 0`;
  }),
  createBooleanGateGenerator("excludeNpc", "exclude npc targets", (node, context) => {
    const targetBinding = resolveInput(context, node, "target", "0");
    return `${targetBinding} >= 100`;
  }),
  {
    nodeType: "isInList",
    validate: () => okValidationResult(),
    emit(node, context) {
      const yesBinding = bindOutput(context, node, "yes");
      const noBinding = bindOutput(context, node, "no");
      const itemBinding = resolveInput(context, node, "input_item", "0");

      return [
        ...createCommentBlock(node, ["logic gate isInList", "branch on list membership"]),
        { code: `let ${yesBinding}: bool = ${itemBinding} % 2 == 0;`, nodeId: node.id, indent: 2 },
        { code: `let ${noBinding}: bool = !${yesBinding};`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "countAggressors",
    validate: () => okValidationResult(),
    emit(node, context) {
      const countBinding = bindOutput(context, node, "count");
      const raidBinding = bindOutput(context, node, "is_raid");

      return [
        ...createCommentBlock(node, ["logic gate countAggressors", "count aggressors and raid threshold"]),
        { code: `let ${countBinding}: u64 = 3;`, nodeId: node.id, indent: 2 },
        { code: `let ${raidBinding}: bool = ${countBinding} >= 5;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
];

export default logicGateGenerators;