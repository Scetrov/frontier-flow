import type { NodeCodeGenerator } from "../types";

import { SHIP_GROUP_OPTIONS, getNumberFieldList, getStringFieldList } from "../../data/nodeFieldCatalog";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

const SUPPORTED_LIST_NODE_TYPES = new Set(["listTribe", "listShip", "listCharacter"]);

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

function hashCharacterAddress(address: string): number {
  let hash = 0;
  for (const character of address.toLowerCase()) {
    hash = (hash * 33 + character.charCodeAt(0)) % 4_294_967_291;
  }

  return hash;
}

function createMembershipExpression(candidate: string, values: readonly number[]): string {
  if (values.length === 0) {
    return "false";
  }

  return values.map((value) => `${candidate} == ${String(value)}`).join(" || ");
}

function getConnectedSourceNode(
  node: Parameters<NodeCodeGenerator["emit"]>[0],
  context: Parameters<NodeCodeGenerator["emit"]>[1],
  socketId: string,
) {
  const connection = node.inputs[socketId];
  if (connection === undefined) {
    return undefined;
  }

  return context.graph?.nodes.get(connection.sourceNodeId);
}

function createTargetDerivedGroupExpression(targetBinding: string): string {
  const groupIds = SHIP_GROUP_OPTIONS.map((option) => option.value);
  const modulus = String(groupIds.length);

  if (groupIds.length === 0) {
    return "0";
  }

  return groupIds.reduce((expression, groupId, index) => {
    const branch = `${targetBinding} % ${modulus} == ${String(index)}`;
    if (index === 0) {
      return `if (${branch}) { ${String(groupId)} }`;
    }

    if (index === groupIds.length - 1) {
      return `${expression} else { ${String(groupId)} }`;
    }

    return `${expression} else if (${branch}) { ${String(groupId)} }`;
  }, "");
}

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
  {
    nodeType: "isInList",
    validate(node, graph) {
      const listConnection = node.inputs.list;
      if (listConnection === undefined) {
        return { valid: false, diagnostics: [createValidationDiagnostic(node, "Connect a list node before compiling Is in List.")] };
      }

      const sourceNode = graph.nodes.get(listConnection.sourceNodeId);
      if (sourceNode === undefined || !SUPPORTED_LIST_NODE_TYPES.has(sourceNode.type)) {
        return {
          valid: false,
          diagnostics: [
            createValidationDiagnostic(
              node,
              "Connect Is in List to a supported list node (List of Tribe, List of Ship, or List of Character) before compiling.",
            ),
          ],
        };
      }

      return okValidationResult();
    },
    emit(node, context) {
      const includeBinding = bindOutput(context, node, "matches");
      const targetBinding = resolveInput(context, node, "target", "0");
      const listNode = getConnectedSourceNode(node, context, "list");

      switch (listNode?.type) {
        case "listTribe":
          return [
            ...createCommentBlock(node, ["logic gate isInList", "check whether the target matches the configured upstream list"]),
            {
              code: `let ${includeBinding}: bool = ${createMembershipExpression(
                `${targetBinding} % 7`,
                getNumberFieldList(listNode.fields, "selectedTribeIds").map((value) => value % 7),
              )};`,
              nodeId: node.id,
              indent: 2,
            },
          ];
        case "listShip":
          return [
            ...createCommentBlock(node, ["logic gate isInList", "check whether the target matches the configured upstream list"]),
            {
              code: `let ${includeBinding}: bool = ${createMembershipExpression(
                `${targetBinding} % 100000`,
                getNumberFieldList(listNode.fields, "selectedShipIds").map((value) => value % 100000),
              )};`,
              nodeId: node.id,
              indent: 2,
            },
          ];
        case "listCharacter":
          return [
            ...createCommentBlock(node, ["logic gate isInList", "check whether the target matches the configured upstream list"]),
            {
              code: `let ${includeBinding}: bool = ${createMembershipExpression(
                targetBinding,
                getStringFieldList(listNode.fields, "characterAddresses").map((value) => hashCharacterAddress(value)),
              )};`,
              nodeId: node.id,
              indent: 2,
            },
          ];
      }

      return [
        ...createCommentBlock(node, ["logic gate isInList", "check whether the target matches the configured upstream list"]),
        { code: `let ${includeBinding}: bool = false;`, nodeId: node.id, indent: 2 },
      ];
    },
  },
  {
    nodeType: "isInGroup",
    validate(node) {
      return getNumberFieldList(node.fields, "selectedGroupIds").length > 0
        ? okValidationResult()
        : { valid: false, diagnostics: [createValidationDiagnostic(node, "Select at least one ship group before compiling Is in Group.")] };
    },
    emit(node, context) {
      const includeBinding = bindOutput(context, node, "matches");
      const targetBinding = resolveInput(context, node, "target", "0");
      const candidateGroupBinding = `${includeBinding}_group_id`;
      const selectedGroupIds = getNumberFieldList(node.fields, "selectedGroupIds");

      return [
        ...createCommentBlock(node, ["logic gate isInGroup", "check whether the target resolves into one of the configured ship groups"]),
        { code: `let ${candidateGroupBinding}: u64 = ${createTargetDerivedGroupExpression(targetBinding)};`, nodeId: node.id, indent: 2 },
        { code: `let ${includeBinding}: bool = ${createMembershipExpression(candidateGroupBinding, selectedGroupIds)};`, nodeId: node.id, indent: 2 },
      ];
    },
  },
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