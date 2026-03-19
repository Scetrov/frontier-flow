import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

function createBooleanGateGenerator(
  nodeType: string,
  description: string,
  outputHandle: string,
  expression: (node: Parameters<NodeCodeGenerator["emit"]>[0], context: Parameters<NodeCodeGenerator["emit"]>[1]) => string,
): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      const includeBinding = bindOutput(context, node, outputHandle);

      return [
        ...createCommentBlock(node, [`logic gate ${nodeType}`, description]),
        { code: `let ${includeBinding}: bool = ${expression(node, context)};`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

const logicGateGenerators: readonly NodeCodeGenerator[] = [
  createBooleanGateGenerator("excludeOwner", "exclude the owner entity", "include", (node, context) => {
    const targetBinding = resolveInput(context, node, "target", "0");
    return `${targetBinding} != 1`;
  }),
  createBooleanGateGenerator("excludeSameTribe", "exclude same-tribe non-aggressors", "include", (node, context) => {
    const tribeBinding = resolveInput(context, node, "tribe", "0");
    const ownerTribeBinding = resolveInput(context, node, "owner_tribe", "1");
    const aggressorBinding = resolveInput(context, node, "is_aggressor", "false");
    return `${tribeBinding} != ${ownerTribeBinding} || ${aggressorBinding}`;
  }),
  createBooleanGateGenerator("excludeStoppedAttack", "exclude stopped attacks", "include", (node, context) => {
    const behaviourBinding = resolveInput(context, node, "behaviour", "0");
    return `${behaviourBinding} != 0`;
  }),
  createBooleanGateGenerator("excludeNpc", "exclude npc targets", "include", (node, context) => {
    const targetBinding = resolveInput(context, node, "target", "0");
    return `${targetBinding} >= 100`;
  }),
  createBooleanGateGenerator("isOwner", "check whether the candidate target is the owner", "matches", (node, context) => {
    const targetBinding = resolveInput(context, node, "target", "0");
    return `${targetBinding} == 1`;
  }),
  createBooleanGateGenerator("isSameTribe", "check whether the candidate tribe matches the owner tribe", "matches", (node, context) => {
    const tribeBinding = resolveInput(context, node, "tribe", "0");
    const ownerTribeBinding = resolveInput(context, node, "owner_tribe", "1");
    return `${tribeBinding} == ${ownerTribeBinding}`;
  }),
  createBooleanGateGenerator("hasStoppedAttack", "check whether the target stopped attacking", "matches", (node, context) => {
    const behaviourBinding = resolveInput(context, node, "behaviour", "0");
    return `${behaviourBinding} == 0`;
  }),
  createBooleanGateGenerator("isNpc", "check whether the candidate target is an npc", "matches", (node, context) => {
    const targetBinding = resolveInput(context, node, "target", "0");
    return `${targetBinding} < 100`;
  }),
  createBooleanGateGenerator("booleanNot", "invert the incoming boolean signal", "result", (node, context) => {
    const inputBinding = resolveInput(context, node, "input", "false");
    return `!${inputBinding}`;
  }),
  createBooleanGateGenerator("booleanAnd", "combine two booleans with logical and", "result", (node, context) => {
    const leftBinding = resolveInput(context, node, "left", "false");
    const rightBinding = resolveInput(context, node, "right", "false");
    return `${leftBinding} && ${rightBinding}`;
  }),
  createBooleanGateGenerator("booleanOr", "combine two booleans with logical or", "result", (node, context) => {
    const leftBinding = resolveInput(context, node, "left", "false");
    const rightBinding = resolveInput(context, node, "right", "false");
    return `${leftBinding} || ${rightBinding}`;
  }),
  createBooleanGateGenerator("booleanXor", "combine two booleans with logical xor", "result", (node, context) => {
    const leftBinding = resolveInput(context, node, "left", "false");
    const rightBinding = resolveInput(context, node, "right", "false");
    return `${leftBinding} != ${rightBinding}`;
  }),
];

export default logicGateGenerators;