import type { NodeCodeGenerator } from "../types";

import { addEntryFunction, bindOutput, createCommentBlock, okValidationResult } from "./shared";

function createTriggerGenerator(nodeType: string, targetSeed: number, prioritySeed: number): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      addEntryFunction(context, `on_${node.type}_${node.id.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase()}`);

      const targetBinding = bindOutput(context, node, "target");
      const priorityBinding = bindOutput(context, node, "priority");

      return [
        ...createCommentBlock(node, [`event trigger ${node.type}`]),
        { code: `let ${targetBinding}: u64 = ${String(targetSeed)};`, nodeId: node.id, indent: 2 },
        { code: `let ${priorityBinding}: u64 = ${String(prioritySeed)};`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

const eventTriggerGenerators: readonly NodeCodeGenerator[] = [
  createTriggerGenerator("aggression", 101, 80),
  createTriggerGenerator("proximity", 205, 45),
];

export default eventTriggerGenerators;