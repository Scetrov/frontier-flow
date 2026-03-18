import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult, resolveInput } from "./shared";

const actionGenerators: readonly NodeCodeGenerator[] = [
  {
    nodeType: "addToQueue",
    validate: () => okValidationResult(),
    emit(node, context) {
      const priorityInBinding = resolveInput(context, node, "priority_in", "0");
      const predicateBinding = resolveInput(context, node, "predicate", "true");
      const targetBinding = resolveInput(context, node, "target", "0");
      const weightBinding = resolveInput(context, node, "weight", "0");
      const priorityOutBinding = bindOutput(context, node, "priority_out");

      return [
        ...createCommentBlock(node, ["action addToQueue", "append candidate to the outgoing priority queue"]),
        {
          code: `let ${priorityOutBinding}: u64 = if (${predicateBinding}) { ${priorityInBinding} + ${weightBinding} + (${targetBinding} % 11) } else { ${priorityInBinding} };`,
          nodeId: node.id,
          indent: 2,
        },
      ];
    },
  },
];

export default actionGenerators;