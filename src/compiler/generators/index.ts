import type { GenerationContext, NodeCodeGenerator } from "../types";

import actionGenerators from "./actions";
import dataAccessorGenerators from "./dataAccessors";
import dataSourceGenerators from "./dataSources";
import eventTriggerGenerators from "./eventTriggers";
import logicGateGenerators from "./logicGates";
import scoringModifierGenerators from "./scoringModifiers";

const generators = [
  ...eventTriggerGenerators,
  ...dataAccessorGenerators,
  ...scoringModifierGenerators,
  ...logicGateGenerators,
  ...dataSourceGenerators,
  ...actionGenerators,
] as const;

const generatorRegistry = new Map<string, NodeCodeGenerator>(generators.map((generator) => [generator.nodeType, generator]));

/**
 * Create the mutable generation context shared by all code generators.
 */
export function createGenerationContext(moduleName: string): GenerationContext {
  return {
    imports: new Set<string>(),
    bindings: new Map<string, string>(),
    structs: [],
    entryFunctions: [],
    moduleName,
    sourceMap: [],
    currentLine: 1,
  };
}

/**
 * Return the code generator registered for a specific node type.
 */
export function getGenerator(nodeType: string): NodeCodeGenerator | undefined {
  return generatorRegistry.get(nodeType);
}

export function getRegisteredGenerators(): ReadonlyMap<string, NodeCodeGenerator> {
  return generatorRegistry;
}