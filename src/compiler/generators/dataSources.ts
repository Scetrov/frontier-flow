import type { NodeCodeGenerator } from "../types";

import { bindOutput, createCommentBlock, okValidationResult } from "./shared";

function createSourceGenerator(
  nodeType: string,
  structDeclaration: string,
  configSeed: number,
  description: string,
): NodeCodeGenerator {
  return {
    nodeType,
    validate: () => okValidationResult(),
    emit(node, context) {
      const configBinding = bindOutput(context, node, "config");

      context.structs.push(structDeclaration);
      return [
        ...createCommentBlock(node, [`data source ${nodeType}`, description]),
        { code: `let ${configBinding}: u64 = ${String(configSeed)};`, nodeId: node.id, indent: 2 },
      ];
    },
  };
}

const dataSourceGenerators: readonly NodeCodeGenerator[] = [
  createSourceGenerator(
    "groupBonusConfig",
    "struct GroupBonusConfig has copy, drop { default_bonus: u64, specialist_bonus: u64 }",
    12,
    "emit reusable group bonus config",
  ),
  createSourceGenerator(
    "roundRobinConfig",
    "struct RoundRobinConfig has copy, drop { repeat_window: u64, penalty: u64 }",
    6,
    "emit reusable round robin config",
  ),
  createSourceGenerator(
    "threatLedgerConfig",
    "struct ThreatLedgerConfig has copy, drop { tribe_bonus: u64, aggressor_bonus: u64 }",
    18,
    "emit reusable threat ledger config",
  ),
  createSourceGenerator(
    "typeBlocklistConfig",
    "struct TypeBlocklistConfig has copy, drop { blocked_type: u64, blocked_tribe: u64 }",
    3,
    "emit reusable type blocklist config",
  ),
];

export default dataSourceGenerators;