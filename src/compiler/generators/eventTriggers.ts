import type { NodeCodeGenerator } from "../types";

import { addEntryFunction, createCommentBlock, okValidationResult } from "./shared";

const eventTriggerGenerators: readonly NodeCodeGenerator[] = [
  {
    nodeType: "aggression",
    validate: () => okValidationResult(),
    emit(node, context) {
      addEntryFunction(context, `on_${node.type}_${node.id.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase()}`);
      return createCommentBlock(node, [
        `event trigger ${node.type}`,
        "emit priority and target routing",
      ]);
    },
  },
  {
    nodeType: "proximity",
    validate: () => okValidationResult(),
    emit(node, context) {
      addEntryFunction(context, `on_${node.type}_${node.id.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase()}`);
      return createCommentBlock(node, [
        `event trigger ${node.type}`,
        "emit priority and target routing",
      ]);
    },
  },
];

export default eventTriggerGenerators;