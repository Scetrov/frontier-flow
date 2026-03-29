import {
  createNamedFlowContract,
  type NamedFlowContract,
  type PublishedGraphProvenance,
} from "./contractStorage";
import { hydrateFlowNode } from "../data/node-definitions";
import { parseGraphYaml } from "./graphYaml";
import type { FlowEdge, FlowNode, NodeFieldMap } from "../types/nodes";

export interface PortableGraphSource {
  readonly channel: "yaml-export" | "walrus-publish" | "walrus-import";
}

export interface GraphSummary {
  readonly nodeCount: number;
  readonly edgeCount: number;
}

export interface PortableGraphNode {
  readonly id: string;
  readonly type: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
  readonly data: {
    readonly fields: NodeFieldMap;
  };
}

export interface PortableGraphEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly sourceHandle?: string;
  readonly targetHandle?: string;
}

export interface PortableGraphDocument {
  readonly version: 1;
  readonly kind: "frontier-flow-graph";
  readonly exportedAt: string;
  readonly appVersion: string;
  readonly contract: {
    readonly name: string;
    readonly description?: string;
    readonly updatedAt: string;
    readonly source: PortableGraphSource;
  };
  readonly graph: {
    readonly nodes: PortableGraphNode[];
    readonly edges: PortableGraphEdge[];
    readonly summary: GraphSummary;
  };
}

export interface CreatePortableGraphDocumentRequest {
  readonly contract: NamedFlowContract;
  readonly appVersion: string;
  readonly source: PortableGraphSource;
}

export interface ParsePortableGraphDocumentRequest {
  readonly rawContent: string;
  readonly sourceLabel: string;
  readonly walrusProvenance?: PublishedGraphProvenance;
}

export interface ParsePortableGraphDocumentResult {
  readonly document: PortableGraphDocument;
  readonly importedContract: NamedFlowContract;
}

export class PortableGraphParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortableGraphParseError";
  }
}

export class PortableGraphValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortableGraphValidationError";
  }
}

/**
 * Creates a versioned transfer document from a local saved contract.
 */
export function createPortableGraphDocument(request: CreatePortableGraphDocumentRequest): PortableGraphDocument {
  const nodes = request.contract.nodes.map(createPortableGraphNode);
  const edges = request.contract.edges.map(createPortableGraphEdge);

  return {
    version: 1,
    kind: "frontier-flow-graph",
    exportedAt: new Date().toISOString(),
    appVersion: request.appVersion,
    contract: {
      name: request.contract.name,
      description: request.contract.description,
      updatedAt: request.contract.updatedAt,
      source: request.source,
    },
    graph: {
      nodes,
      edges,
      summary: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    },
  };
}

function createPortableGraphNode(node: FlowNode): PortableGraphNode {
  const type = typeof node.type === "string" ? node.type : node.data.type;
  if (typeof type !== "string" || type.length === 0) {
    throw new PortableGraphValidationError(`Contract node ${node.id} is missing a valid type.`);
  }

  return {
    id: node.id,
    type,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
    data: {
      fields: node.data.fields,
    },
  };
}

function createPortableGraphEdge(edge: FlowEdge): PortableGraphEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  };
}

/**
 * Parses and validates a portable graph document from YAML content.
 */
export function parsePortableGraphDocument(request: ParsePortableGraphDocumentRequest): ParsePortableGraphDocumentResult {
  const parsedValue = parseGraphYaml({ content: request.rawContent });
  const document = ensurePortableGraphDocument(parsedValue, request.sourceLabel);
  const nodes = document.graph.nodes.map((node) => hydratePortableGraphNode(node, request.sourceLabel));
  const edges = document.graph.edges.map(createFlowEdge);
  validateGraphConsistency(nodes, edges, request.sourceLabel);

  return {
    document,
    importedContract: createNamedFlowContract(document.contract.name, nodes, edges, {
      description: document.contract.description,
      updatedAt: document.contract.updatedAt,
      walrusProvenance: request.walrusProvenance,
    }),
  };
}

interface ValidatedDocumentEnvelope {
  readonly contract: Record<string, unknown>;
  readonly graph: Record<string, unknown>;
  readonly exportedAt: string;
  readonly appVersion: string;
}

interface ValidatedContractSection {
  readonly name: string;
  readonly description: string | undefined;
  readonly updatedAt: string;
  readonly source: { readonly channel: PortableGraphSource["channel"] };
}

interface ValidatedGraphSection {
  readonly nodes: PortableGraphNode[];
  readonly edges: PortableGraphEdge[];
  readonly summary: GraphSummary;
}

function validateDocumentEnvelope(value: unknown, sourceLabel: string): ValidatedDocumentEnvelope {
  if (!isRecord(value)) {
    throw new PortableGraphParseError(`Could not parse ${sourceLabel} as a portable graph document.`);
  }

  if (value.kind !== "frontier-flow-graph") {
    throw new PortableGraphParseError(`${sourceLabel} is not a Frontier Flow graph document.`);
  }

  if (value.version !== 1) {
    throw new PortableGraphParseError(`${sourceLabel} uses an unsupported graph document version.`);
  }

  if (typeof value.exportedAt !== "string" || typeof value.appVersion !== "string") {
    throw new PortableGraphParseError(`${sourceLabel} is missing graph document metadata.`);
  }

  const contract = value.contract;
  const graph = value.graph;
  if (!isRecord(contract) || !isRecord(graph)) {
    throw new PortableGraphParseError(`${sourceLabel} is missing contract or graph sections.`);
  }

  return { contract, graph, exportedAt: value.exportedAt, appVersion: value.appVersion };
}

function validateContractSection(contract: Record<string, unknown>, sourceLabel: string): ValidatedContractSection {
  if (typeof contract.name !== "string" || typeof contract.updatedAt !== "string" || !isRecord(contract.source) || typeof contract.source.channel !== "string") {
    throw new PortableGraphParseError(`${sourceLabel} has invalid contract metadata.`);
  }

  return {
    name: contract.name,
    description: typeof contract.description === "string" ? contract.description : undefined,
    updatedAt: contract.updatedAt,
    source: { channel: parseSourceChannel(contract.source.channel) },
  };
}

function validateGraphSection(graph: Record<string, unknown>, sourceLabel: string): ValidatedGraphSection {
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !isRecord(graph.summary)) {
    throw new PortableGraphParseError(`${sourceLabel} has invalid graph content.`);
  }

  const summary = graph.summary;
  if (typeof summary.nodeCount !== "number" || typeof summary.edgeCount !== "number") {
    throw new PortableGraphParseError(`${sourceLabel} has an invalid graph summary.`);
  }

  const nodes = graph.nodes.map((node, index) => parsePortableGraphNode(node, sourceLabel, index));
  const edges = graph.edges.map((edge, index) => parsePortableGraphEdge(edge, sourceLabel, index));

  if (summary.nodeCount !== nodes.length || summary.edgeCount !== edges.length) {
    throw new PortableGraphValidationError(`${sourceLabel} graph summary does not match the exported node or edge count.`);
  }

  return { nodes, edges, summary: { nodeCount: summary.nodeCount, edgeCount: summary.edgeCount } };
}

function ensurePortableGraphDocument(value: unknown, sourceLabel: string): PortableGraphDocument {
  const envelope = validateDocumentEnvelope(value, sourceLabel);
  const contract = validateContractSection(envelope.contract, sourceLabel);
  const graph = validateGraphSection(envelope.graph, sourceLabel);

  return {
    version: 1,
    kind: "frontier-flow-graph",
    exportedAt: envelope.exportedAt,
    appVersion: envelope.appVersion,
    contract,
    graph,
  };
}

function parsePortableGraphNode(value: unknown, sourceLabel: string, index: number): PortableGraphNode {
  if (!isRecord(value)) {
    throw new PortableGraphParseError(`${sourceLabel} contains an invalid node at index ${String(index)}.`);
  }

  const position = value.position;
  const data = value.data;
  if (
    typeof value.id !== "string"
    || typeof value.type !== "string"
    || !isRecord(position)
    || typeof position.x !== "number"
    || typeof position.y !== "number"
    || !isRecord(data)
  ) {
    throw new PortableGraphParseError(`${sourceLabel} contains an invalid node at index ${String(index)}.`);
  }

  return {
    id: value.id,
    type: value.type,
    position: {
      x: position.x,
      y: position.y,
    },
    data: {
      fields: isRecord(data.fields) ? (data.fields as NodeFieldMap) : {},
    },
  };
}

function parsePortableGraphEdge(value: unknown, sourceLabel: string, index: number): PortableGraphEdge {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.source !== "string" || typeof value.target !== "string") {
    throw new PortableGraphParseError(`${sourceLabel} contains an invalid edge at index ${String(index)}.`);
  }

  return {
    id: value.id,
    source: value.source,
    target: value.target,
    sourceHandle: typeof value.sourceHandle === "string" ? value.sourceHandle : undefined,
    targetHandle: typeof value.targetHandle === "string" ? value.targetHandle : undefined,
  };
}

function hydratePortableGraphNode(node: PortableGraphNode, sourceLabel: string): FlowNode {
  const hydratedNode = hydrateFlowNode({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      type: node.type,
      fields: node.data.fields,
    },
  } as FlowNode);

  if (hydratedNode === undefined) {
    throw new PortableGraphValidationError(`${sourceLabel} contains an unknown node type: ${node.type}.`);
  }

  return hydratedNode;
}

function createFlowEdge(edge: PortableGraphEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  };
}

function parseSourceChannel(channel: string): PortableGraphSource["channel"] {
  if (channel === "yaml-export" || channel === "walrus-publish" || channel === "walrus-import") {
    return channel;
  }

  throw new PortableGraphParseError(`Unsupported graph source channel: ${channel}.`);
}

function validateGraphConsistency(nodes: readonly FlowNode[], edges: readonly FlowEdge[], sourceLabel: string): void {
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (typeof node.id !== "string" || node.id.length === 0) {
      throw new PortableGraphValidationError(`${sourceLabel} contains a node without a valid id.`);
    }

    nodeIds.add(node.id);
  }

  for (const edge of edges) {
    if (typeof edge.id !== "string" || typeof edge.source !== "string" || typeof edge.target !== "string") {
      throw new PortableGraphValidationError(`${sourceLabel} contains an edge with invalid identifiers.`);
    }

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new PortableGraphValidationError(`${sourceLabel} contains an edge that points to a missing node.`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}