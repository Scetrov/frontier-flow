import type { NodeTypes } from "@xyflow/react";

import { nodeDefinitions } from "../data/node-definitions";

import { createNodeComponent, iconByNodeType } from "./createNode";

/**
 * Stable ReactFlow node registry generated from the contract-aligned definitions.
 */
export const flowNodeTypes: NodeTypes = Object.fromEntries(
  nodeDefinitions.map((definition) => [definition.type, createNodeComponent(iconByNodeType[definition.type])]),
);