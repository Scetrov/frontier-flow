import type { NodeCodeGenerator } from "../types";

import { getNumberFieldList, getStringFieldList } from "../../data/nodeFieldCatalog";

import { hashCharacterAddress } from "./listHash";
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

function emitListBinding(
  node: Parameters<NodeCodeGenerator["emit"]>[0],
  context: Parameters<NodeCodeGenerator["emit"]>[1],
  values: readonly number[],
) {
  const outputBinding = bindOutput(context, node, "list");
  const vectorLiteral = values.length === 0
    ? "vector::empty<u64>()"
    : `vector[${values.map((value) => `${String(value)}u64`).join(", ")}]`;

  return [{ code: `let ${outputBinding}: vector<u64> = ${vectorLiteral};`, nodeId: node.id, indent: 2 }];
}

function requiresConfiguredValues(node: Parameters<NodeCodeGenerator["validate"]>[0], graph: Parameters<NodeCodeGenerator["validate"]>[1]): boolean {
  void graph;
  return (node.outputs.list ?? []).length > 0;
}

function createConfiguredListGenerator(
  nodeType: string,
  description: string,
  readValues: (node: Parameters<NodeCodeGenerator["emit"]>[0]) => readonly (string | number)[],
): NodeCodeGenerator {
  return {
    nodeType,
    validate(node, graph) {
      if (!requiresConfiguredValues(node, graph)) {
        return okValidationResult();
      }

      return readValues(node).length > 0
        ? okValidationResult()
        : { valid: false, diagnostics: [createValidationDiagnostic(node, "Configure at least one value before compiling this list node.")] };
    },
    emit(node, context) {
      const values = readValues(node).map((value) => Number(value));

      return [
        ...createCommentBlock(node, [`accessor ${nodeType}`, description, `configured values: ${values.join(", ") || "none"}`]),
        ...emitListBinding(node, context, values),
      ];
    },
  };
}

function createGetTribeAccessor(): NodeCodeGenerator {
  return {
    nodeType: "getTribe",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const tribeBinding = bindOutput(context, node, "tribe");
      const ownerTribeBinding = bindOutput(context, node, "owner_tribe");

      return [
        ...createCommentBlock(node, ["accessor getTribe", "extract tribe and owner tribe"]),
        { code: `let ${tribeBinding}: u32 = ${targetBinding}.character_tribe;`, nodeId: node.id, indent: 2 },
        { code: `let ${ownerTribeBinding}: u32 = owner_tribe;`, nodeId: node.id, indent: 2 },
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
  {
    nodeType: "hpRatio",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const outputBinding = bindOutput(context, node, "hp_ratio");

      return [
        ...createCommentBlock(node, ["accessor hpRatio", "read hull integrity ratio"]),
        { code: `let ${outputBinding}: u64 = ${targetBinding}.hp_ratio;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "shieldRatio",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const outputBinding = bindOutput(context, node, "shield_ratio");

      return [
        ...createCommentBlock(node, ["accessor shieldRatio", "read shield integrity ratio"]),
        { code: `let ${outputBinding}: u64 = ${targetBinding}.shield_ratio;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "armorRatio",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const outputBinding = bindOutput(context, node, "armor_ratio");

      return [
        ...createCommentBlock(node, ["accessor armorRatio", "read armor integrity ratio"]),
        { code: `let ${outputBinding}: u64 = ${targetBinding}.armor_ratio;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "getGroupId",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const outputBinding = bindOutput(context, node, "group_id");

      return [
        ...createCommentBlock(node, ["accessor getGroupId", "read group identifier"]),
        { code: `let ${outputBinding}: u64 = ${targetBinding}.group_id;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "getBehaviour",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const outputBinding = bindOutput(context, node, "behaviour");

      return [
        ...createCommentBlock(node, ["accessor getBehaviour", "read behaviour code"]),
        { code: `let ${outputBinding}: u8 = ${targetBinding}.behaviour_change;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "isAggressor",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const outputBinding = bindOutput(context, node, "is_aggressor");

      return [
        ...createCommentBlock(node, ["accessor isAggressor", "read aggressor flag"]),
        { code: `let ${outputBinding}: bool = ${targetBinding}.is_aggressor;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "getPriorityWeight",
    validate: () => okValidationResult(),
    emit(node, context) {
      const targetBinding = resolveInput(context, node, "target", "candidate");
      const outputBinding = bindOutput(context, node, "weight");

      return [
        ...createCommentBlock(node, ["accessor getPriorityWeight", "read base priority weight"]),
        { code: `let ${outputBinding}: u64 = ${targetBinding}.priority_weight;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
];

export default dataAccessorGenerators;