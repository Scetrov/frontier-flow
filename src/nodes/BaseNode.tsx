import type { NodeProps } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import { useContext, useState } from "react";

import { hasEditableNodeFields, normalizeNodeFields } from "../data/nodeFieldCatalog";

import NodeFieldEditor from "./NodeFieldEditor";
import { NodeFieldEditingContext } from "./NodeFieldEditingContext";
import NodeShell, { type RenderableNodeData } from "./NodeShell";

interface BaseNodeProps extends NodeProps {
  readonly icon?: LucideIcon;
  readonly shape?: "standard" | "diamond";
}

/**
 * Shared node chrome used by the verified ReactFlow node set.
 */
function BaseNode({ data, id, selected, icon: Icon, shape = "standard" }: BaseNodeProps) {
  const nodeData = data as RenderableNodeData;
  const handleFieldChange = useContext(NodeFieldEditingContext);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const isEditable = hasEditableNodeFields(nodeData.type);

  return (
    <>
      <NodeShell
        editing={isEditorOpen}
        icon={Icon}
        mode="canvas"
        nodeData={nodeData}
        nodeId={id}
        onEdit={() => {
          setIsEditorOpen(true);
        }}
        selected={selected}
        shape={shape}
      />

      {isEditable && isEditorOpen ? (
        <NodeFieldEditor
          fields={nodeData.fields}
          nodeLabel={nodeData.label}
          nodeType={nodeData.type}
          onClose={() => {
            setIsEditorOpen(false);
          }}
          onSave={(fields) => {
            handleFieldChange?.(id, normalizeNodeFields(nodeData.type, fields));
            setIsEditorOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

export default BaseNode;