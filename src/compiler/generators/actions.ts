import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

const actionGenerators: readonly NodeCodeGenerator[] = [
  {
    nodeType: "addToQueue",
    validate: () => okValidationResult(),
    emit(node, context) {
      const priorityInBinding = resolveInput(context, node, "priority_in", "0");
      const predicateBinding = resolveInput(context, node, "predicate", "true");
      const weightBinding = resolveInput(context, node, "weight", "0");
      const priorityOutBinding = bindOutput(context, node, "priority_out");
      const includeBinding = bindOutput(context, node, "include_result");
      const resultWeightExpression = node.inputs.weight === undefined ? priorityInBinding : weightBinding;

      return [
        ...createCommentBlock(node, ["action addToQueue", "append candidate to the outgoing priority queue"]),
        {
          code: `let ${includeBinding}: bool = ${predicateBinding};`,
          nodeId: node.id,
          indent: 2,
        },
        {
          code: `let ${priorityOutBinding}: u64 = ${resultWeightExpression};`,
          nodeId: node.id,
          indent: 2,
        },
      ];
    },
  },
];

export default actionGenerators;