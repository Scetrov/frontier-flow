import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

function createSingleOutputAccessor(
  nodeType: string,
  outputSocketId: string,
  typeAnnotation: string,
  description: string,
  expression: (targetBinding: string) => string,
): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      const inputBinding = resolveInput(context, node, "target", "0");
      const outputBinding = bindOutput(context, node, outputSocketId);

      return [
        ...createCommentBlock(node, [`accessor ${nodeType}`, description]),
        { code: `let ${outputBinding}: ${typeAnnotation} = ${expression(inputBinding)};`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

function createConfigListAccessor(nodeType: string, description: string): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      const configBinding = resolveInput(context, node, "config", "1");
      const outputBinding = bindOutput(context, node, "items");

      return [
        ...createCommentBlock(node, [`accessor ${nodeType}`, description]),
        {
          code: `let ${outputBinding}: vector<u64> = vector[${configBinding}, ${configBinding} + 1, ${configBinding} + 2];`,
          nodeId: node.id,
          indent: 2,
        },
      ];
    },
  };
}

function createGetTribeAccessor(): NodeCodeGenerator {
  return {
    nodeType: "getTribe",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "0");
      const tribeBinding = bindOutput(context, node, "tribe");
      const ownerTribeBinding = bindOutput(context, node, "owner_tribe");

      return [
        ...createCommentBlock(node, ["accessor getTribe", "extract tribe and owner tribe"]),
        { code: `let ${tribeBinding}: u64 = ${targetBinding} % 7;`, nodeId: node.id, indent: 2 },
        { code: `let ${ownerTribeBinding}: u64 = (${targetBinding} + 3) % 7;`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

const dataAccessorGenerators: readonly NodeCodeGenerator[] = [
  createGetTribeAccessor(),
  createSingleOutputAccessor("hpRatio", "hp_ratio", "u64", "read hull integrity ratio", (target) => `100 - (${target} % 45)`),
  createSingleOutputAccessor("shieldRatio", "shield_ratio", "u64", "read shield integrity ratio", (target) => `100 - (${target} % 30)`),
  createSingleOutputAccessor("armorRatio", "armor_ratio", "u64", "read armor integrity ratio", (target) => `100 - (${target} % 20)`),
  createSingleOutputAccessor("getGroupId", "group_id", "u64", "read group identifier", (target) => `(${target} % 16) + 1`),
  createSingleOutputAccessor("getBehaviour", "behaviour", "u64", "read behaviour code", (target) => `${target} % 4`),
  createSingleOutputAccessor("isAggressor", "is_aggressor", "bool", "read aggressor flag", (target) => `${target} % 2 == 0`),
  createSingleOutputAccessor("getPriorityWeight", "weight", "u64", "read base priority weight", (target) => `10 + (${target} % 90)`),
  createConfigListAccessor("getTribeListFromConfig", "read tribe list from config"),
  createConfigListAccessor("getItemListFromConfig", "read item list from config"),
  createConfigListAccessor("getCharacterListFromConfig", "read character list from config"),
];

export default dataAccessorGenerators;