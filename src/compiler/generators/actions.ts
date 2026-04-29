import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

const actionGenerators: readonly NodeCodeGenerator[] = [
  {
    nodeType: "addToQueue",
    validate: () => okValidationResult(),
    emit(node, context) {
      const priorityInBinding = resolveInput(context, node, "priority_in", "0");
      const predicateBinding = resolveInput(context, node, "predicate", "true");
      const normalizedWeight = typeof node.fields.weight === "number" ? String(node.fields.weight) : "100";
      const weightBinding = resolveInput(context, node, "weight", normalizedWeight);
      const resultWeightBinding = bindOutput(context, node, "result_weight");
      const includeBinding = bindOutput(context, node, "include_result");
      const resultWeightExpression = node.inputs.weight === undefined && typeof node.fields.weight !== "number"
        ? priorityInBinding
        : weightBinding;

      return [
        ...createCommentBlock(node, ["action addToQueue", "append candidate to the outgoing priority queue"]),
        {
          code: `let ${includeBinding}: bool = ${predicateBinding};`,
          nodeId: node.id,
          indent: 2,
        },
        {
          code: `let ${resultWeightBinding}: u64 = ${resultWeightExpression};`,
          nodeId: node.id,
          indent: 2,
        },
      ];
    },
  },
];

export default actionGenerators;