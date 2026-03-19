import type { NodeCodeGenerator } from "../types";

import { getNumberFieldList, getStringFieldList } from "../../data/nodeFieldCatalog";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

function createValidationDiagnostic(node: Parameters<NodeCodeGenerator["validate"]>[0], message: string) {
  return {
    severity: "error" as const,
    stage: "validation" as const,
    rawMessage: message,
    line: null,
    reactFlowNodeId: node.id,
    socketId: null,
    userMessage: message,
  };
}

function emitListBinding(node: Parameters<NodeCodeGenerator["emit"]>[0], context: Parameters<NodeCodeGenerator["emit"]>[1], count: number) {
  const outputBinding = bindOutput(context, node, "list");

  return [{ code: `let ${outputBinding}: u64 = ${String(count)};`, nodeId: node.id, indent: 2 }];
}

function hashCharacterAddress(address: string): number {
  let hash = 0;
  for (const character of address.toLowerCase()) {
    hash = (hash * 33 + character.charCodeAt(0)) % 4_294_967_291;
  }

  return hash;
}

function createConfiguredListGenerator(
  nodeType: string,
  description: string,
  readValues: (node: Parameters<NodeCodeGenerator["emit"]>[0]) => readonly (string | number)[],
): NodeCodeGenerator {
  return {
    nodeType,
    validate(node) {
      return readValues(node).length > 0
        ? okValidationResult()
        : { valid: false, diagnostics: [createValidationDiagnostic(node, "Configure at least one value before compiling this list node.")] };
    },
    emit(node, context) {
      const values = readValues(node);

      return [
        ...createCommentBlock(node, [`accessor ${nodeType}`, description, `configured values: ${values.join(", ") || "none"}`]),
        ...emitListBinding(node, context, values.length),
      ];
    },
  };
}

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
  createConfiguredListGenerator("listTribe", "capture the configured tribe identifiers", (node) =>
    getNumberFieldList(node.fields, "selectedTribeIds"),
  ),
  createConfiguredListGenerator("listShip", "capture the configured ship identifiers", (node) =>
    getNumberFieldList(node.fields, "selectedShipIds"),
  ),
  createConfiguredListGenerator("listCharacter", "capture the configured character address hashes", (node) =>
    getStringFieldList(node.fields, "characterAddresses").map((address) => hashCharacterAddress(address)),
  ),
  createGetTribeAccessor(),
  createSingleOutputAccessor("hpRatio", "hp_ratio", "u64", "read hull integrity ratio", (target) => `100 - (${target} % 45)`),
  createSingleOutputAccessor("shieldRatio", "shield_ratio", "u64", "read shield integrity ratio", (target) => `100 - (${target} % 30)`),
  createSingleOutputAccessor("armorRatio", "armor_ratio", "u64", "read armor integrity ratio", (target) => `100 - (${target} % 20)`),
  createSingleOutputAccessor("getGroupId", "group_id", "u64", "read group identifier", (target) => `(${target} % 16) + 1`),
  createSingleOutputAccessor("getBehaviour", "behaviour", "u64", "read behaviour code", (target) => `${target} % 4`),
  createSingleOutputAccessor("isAggressor", "is_aggressor", "bool", "read aggressor flag", (target) => `${target} % 2 == 0`),
  createSingleOutputAccessor("getPriorityWeight", "weight", "u64", "read base priority weight", (target) => `10 + (${target} % 90)`),
];

export default dataAccessorGenerators;