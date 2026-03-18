import type { NodeCodeGenerator } from "../types";

import { createCommentBlock, okValidationResult } from "./shared";

function createSourceGenerator(nodeType: string, description: string): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      context.structs.push(`struct ${node.type}Config has copy, drop {}`);
      return createCommentBlock(node, [`data source ${nodeType}`, description]);
    },
  };
}

const dataSourceGenerators: readonly NodeCodeGenerator[] = [
  createSourceGenerator("groupBonusConfig", "emit reusable group bonus config"),
  createSourceGenerator("roundRobinConfig", "emit reusable round robin config"),
  createSourceGenerator("threatLedgerConfig", "emit reusable threat ledger config"),
  createSourceGenerator("typeBlocklistConfig", "emit reusable type blocklist config"),
];

export default dataSourceGenerators;