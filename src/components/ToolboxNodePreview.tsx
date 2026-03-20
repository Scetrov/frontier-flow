import type { DragEvent as ReactDragEvent } from "react";

import { createFlowNodeData } from "../data/node-definitions";
import type { NodeDefinition } from "../types/nodes";
import { iconByNodeType } from "../nodes/createNode";
import NodeShell from "../nodes/NodeShell";

interface ToolboxNodePreviewProps {
  readonly definition: NodeDefinition;
  readonly onDragStart: (event: ReactDragEvent<HTMLButtonElement>, definition: NodeDefinition) => void;
}

function ToolboxNodePreview({ definition, onDragStart }: ToolboxNodePreviewProps) {
  return (
    <button
      aria-label={definition.label}
      className="ff-toolbox__node-button"
      draggable="true"
      onDragStart={(event) => {
        onDragStart(event, definition);
      }}
      type="button"
    >
      <NodeShell
        icon={iconByNodeType[definition.type]}
        mode="toolbox"
        nodeData={createFlowNodeData(definition)}
        nodeId={`toolbox-${definition.type}`}
      />
    </button>
  );
}

export default ToolboxNodePreview;