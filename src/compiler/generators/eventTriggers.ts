import type { NodeCodeGenerator } from "../types";

import { addEntryFunction, bindOutput, createCommentBlock, okValidationResult } from "./shared";

function createTriggerGenerator(nodeType: string): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      addEntryFunction(context, `on_${node.type}_${node.id.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase()}`);

      const targetBinding = bindOutput(context, node, "target");
      const priorityBinding = bindOutput(context, node, "priority");

      return [
        ...createCommentBlock(node, [`event trigger ${node.type}`, "bind the current target candidate into the scoring pipeline"]),
        { code: `let ${targetBinding}: &TargetCandidateArg = candidate;`, nodeId: node.id, indent: 2 },
        { code: `let ${priorityBinding}: u64 = candidate.priority_weight;`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

const eventTriggerGenerators: readonly NodeCodeGenerator[] = [
  createTriggerGenerator("aggression"),
  createTriggerGenerator("proximity"),
];

export default eventTriggerGenerators;