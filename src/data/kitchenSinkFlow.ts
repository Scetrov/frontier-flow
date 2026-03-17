import { createFlowNodeData, nodeDefinitions } from "./node-definitions";

import type { FlowNode } from "../types/nodes";

const GRID_COLUMNS = 4;
const GRID_START_X = 96;
const GRID_START_Y = 128;
const GRID_COLUMN_GAP = 360;
const GRID_ROW_GAP = 264;

/**
 * Creates a deterministic preview layout containing every available node definition.
 */
export function createKitchenSinkNodes(): FlowNode[] {
  return nodeDefinitions.map((definition, index) => {
    const column = index % GRID_COLUMNS;
    const row = Math.floor(index / GRID_COLUMNS);

    return {
      id: `kitchen-sink_${definition.type}`,
      type: definition.type,
      position: {
        x: GRID_START_X + column * GRID_COLUMN_GAP,
        y: GRID_START_Y + row * GRID_ROW_GAP,
      },
      data: createFlowNodeData(definition),
    };
  });
}