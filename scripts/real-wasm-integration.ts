import { compilePipeline } from "../src/compiler/pipeline";
import { compileableSmartTurretExtensions, type GraphFixture } from "../src/__fixtures__/graphs/smartTurretExtensionFixtures";
import { createFlowNodeData, getNodeDefinition } from "../src/data/node-definitions";

import type { FlowEdge, FlowNode } from "../src/types/nodes";

function createFlowNode(id: string, type: string, position: { readonly x: number; readonly y: number }): FlowNode {
  const definition = getNodeDefinition(type);
  if (definition === undefined) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    id,
    type,
    position,
    data: createFlowNodeData(definition),
  };
}

function createFlowFromFixture(fixture: GraphFixture): { readonly nodes: FlowNode[]; readonly edges: FlowEdge[] } {
  return {
    nodes: fixture.nodes.map((node) => createFlowNode(node.id, node.type, node.position)),
    edges: fixture.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
    })),
  };
}

async function main(): Promise<void> {
  for (const extension of compileableSmartTurretExtensions) {
    const fixture = extension.fixture;
    const flow = createFlowFromFixture(fixture);
    const result = await compilePipeline({
      nodes: flow.nodes,
      edges: flow.edges,
      moduleName: fixture.moduleName,
    });

    if (result.status.state !== "compiled") {
      const diagnostics = result.diagnostics.map((diagnostic) => diagnostic.rawMessage).join("\n");
      throw new Error(`Real WASM compile failed for ${fixture.moduleName}\n${diagnostics}`);
    }

    if (result.artifact?.sourceFilePath !== `sources/${fixture.moduleName}.move`) {
      throw new Error(`Unexpected source file path for ${fixture.moduleName}: ${result.artifact?.sourceFilePath ?? "<missing>"}`);
    }

    if (!result.artifact.moveSource.includes(`module builder_extensions::${fixture.moduleName}`)) {
      throw new Error(`Generated module header mismatch for ${fixture.moduleName}`);
    }

    if (result.artifact.bytecodeModules.length === 0) {
      throw new Error(`No bytecode modules were produced for ${fixture.moduleName}`);
    }

    console.log(`compiled ${extension.extensionId} -> ${fixture.moduleName} (${result.artifact.bytecodeModules.length} module(s))`);
  }
}

await main();