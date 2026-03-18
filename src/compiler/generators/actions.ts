import type { NodeCodeGenerator } from "../types";

import { createCommentBlock, okValidationResult } from "./shared";

const actionGenerators: readonly NodeCodeGenerator[] = [
  {
    nodeType: "addToQueue",
    validate: () => okValidationResult(),
    emit(node) {
      return createCommentBlock(node, ["action addToQueue", "append candidate to the outgoing priority queue"]);
    },
  },
];

export default actionGenerators;