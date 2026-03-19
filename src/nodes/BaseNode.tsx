import { Handle, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import { AlertTriangle, Check, Pencil, Trash2, X, type LucideIcon } from "lucide-react";
import { useContext, useMemo, useState } from "react";

import { getNodeFieldSummary, hasEditableNodeFields, normalizeNodeFields } from "../data/nodeFieldCatalog";
import type { FlowNodeData, SocketDefinition } from "../types/nodes";
import { getHandlePosition, getSocketColor } from "../utils/socketTypes";

import NodeFieldEditor from "./NodeFieldEditor";
import { NodeFieldEditingContext } from "./NodeFieldEditingContext";

interface BaseNodeProps extends NodeProps {
  readonly icon?: LucideIcon;
  readonly shape?: "standard" | "diamond";
}

function getDeprecationMessage(deprecation: NonNullable<FlowNodeData["deprecation"]>): string {
  const statusLabel = deprecation.status === "deprecated" ? "Deprecated node." : "Retired node.";
  const remediationMessage = deprecation.remediationMessage ? ` ${deprecation.remediationMessage}` : "";

  return `${statusLabel} ${deprecation.reason}${remediationMessage}`;
}

function SocketRow({ socket }: { readonly socket: SocketDefinition }) {
  const isOutput = socket.direction === "output";

  return (
    <div className={`ff-node__socket ff-node__socket--${socket.position} ff-node__socket--${socket.direction}`}>
      {isOutput ? <span className="ff-node__socket-label">{socket.label}</span> : null}
      <Handle
        className="ff-node__handle"
        id={socket.id}
        isConnectableEnd={true}
        isConnectableStart={true}
        position={getHandlePosition(socket.position)}
        style={{ backgroundColor: getSocketColor(socket.type) }}
        type={isOutput ? "source" : "target"}
      />
      {!isOutput ? <span className="ff-node__socket-label">{socket.label}</span> : null}
    </div>
  );
}

/**
 * Shared node chrome used by the verified ReactFlow node set.
 */
function BaseNode({ data, id, selected, icon: Icon, shape = "standard" }: BaseNodeProps) {
  const nodeData = data as FlowNodeData & {
    readonly diagnosticMessages?: readonly string[];
    readonly validationState?: "error" | "warning";
    readonly deleteConfirmationState?: FlowNodeData["deleteConfirmationState"];
    readonly onDeleteRequest?: FlowNodeData["onDeleteRequest"];
    readonly onDeleteConfirm?: FlowNodeData["onDeleteConfirm"];
    readonly onDeleteCancel?: FlowNodeData["onDeleteCancel"];
  };
  const handleFieldChange = useContext(NodeFieldEditingContext);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const topSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "top");
  const leftSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "left");
  const rightSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "right");
  const bottomSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "bottom");
  const isEditable = hasEditableNodeFields(nodeData.type);
  const fieldSummary = useMemo(() => getNodeFieldSummary(nodeData.type, nodeData.fields), [nodeData.fields, nodeData.type]);
  const nodeStyle = { "--ff-node-accent": nodeData.color } as CSSProperties;
  const isDeleteConfirming = nodeData.deleteConfirmationState?.mode === "confirm";
  const diagnosticMessage = nodeData.diagnosticMessages?.join(" ") ?? "";
  const shouldShowErrorIndicator = nodeData.validationState === "error" && diagnosticMessage.length > 0;
  const diagnosticTooltipId = `${id}-diagnostics`;

  return (
    <>
      <div
        className={`ff-node ${shape === "diamond" ? "ff-node--diamond" : ""} ${selected ? "is-selected" : ""}`}
        data-validation-error={nodeData.validationState === "error" ? "true" : undefined}
        data-validation-warning={nodeData.validationState === "warning" ? "true" : undefined}
        data-editing={isEditorOpen ? "true" : undefined}
        style={nodeStyle}
      >
        <div className={`ff-node__surface ${shape === "diamond" ? "ff-node__surface--diamond" : ""}`}>
          {topSockets.length > 0 ? (
            <div className="ff-node__row ff-node__row--top">
              {topSockets.map((socket) => (
                <SocketRow key={socket.id} socket={socket} />
              ))}
            </div>
          ) : null}

        <div className="ff-node__header" style={{ backgroundColor: nodeData.color }}>
          {shouldShowErrorIndicator ? (
            <button
              aria-label={`Show errors for ${nodeData.label}`}
              className="ff-node__warning-button nodrag nopan"
              onBlur={() => {
                setIsDiagnosticOpen(false);
              }}
              onFocus={() => {
                setIsDiagnosticOpen(true);
              }}
              onMouseEnter={() => {
                setIsDiagnosticOpen(true);
              }}
              onMouseLeave={() => {
                setIsDiagnosticOpen(false);
              }}
              type="button"
            >
              <AlertTriangle aria-hidden="true" className="ff-node__warning-icon" />
              {isDiagnosticOpen ? (
                <span className="ff-node__diagnostic-tooltip" id={diagnosticTooltipId} role="tooltip">
                  {diagnosticMessage}
                </span>
              ) : null}
            </button>
          ) : Icon !== undefined ? (
            <Icon aria-hidden="true" className="ff-node__icon" />
          ) : null}
          <span className="ff-node__title">{nodeData.label}</span>
          {isEditable || nodeData.onDeleteRequest !== undefined ? (
            <div className="ff-node__actions">
              {isEditable ? (
                <button
                  aria-label={`Edit ${nodeData.label}`}
                  className="ff-node__edit-button nodrag nopan"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsEditorOpen(true);
                  }}
                  type="button"
                >
                  <Pencil aria-hidden="true" className="ff-node__edit-icon" />
                </button>
              ) : null}
              {nodeData.onDeleteRequest !== undefined ? (
                isDeleteConfirming ? (
                  <div aria-label={`Confirm delete ${nodeData.label}`} className="ff-node__delete-confirmation" role="group">
                    <button
                      aria-label={`Confirm delete ${nodeData.label}`}
                      className="ff-node__delete-button ff-node__delete-button--confirm nodrag nopan"
                      onClick={(event) => {
                        event.stopPropagation();
                        nodeData.onDeleteConfirm?.();
                      }}
                      type="button"
                    >
                      <Check aria-hidden="true" className="ff-node__delete-icon" />
                    </button>
                    <button
                      aria-label={`Cancel delete ${nodeData.label}`}
                      className="ff-node__delete-button nodrag nopan"
                      onClick={(event) => {
                        event.stopPropagation();
                        nodeData.onDeleteCancel?.();
                      }}
                      type="button"
                    >
                      <X aria-hidden="true" className="ff-node__delete-icon" />
                    </button>
                  </div>
                ) : (
                  <button
                    aria-label={`Delete ${nodeData.label}`}
                    className="ff-node__delete-button nodrag nopan"
                    onClick={(event) => {
                      event.stopPropagation();
                      nodeData.onDeleteRequest?.({ immediate: event.shiftKey });
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="ff-node__delete-icon" />
                  </button>
                )
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ff-node__description">{nodeData.description}</div>

        {fieldSummary.length > 0 ? (
          <div className="ff-node__field-summary">
            {fieldSummary.map((line) => (
              <p key={line} className="ff-node__field-summary-line">
                {line}
              </p>
            ))}
          </div>
        ) : null}

        {nodeData.deprecation !== undefined ? (
          <div className="ff-node__description">
            {getDeprecationMessage(nodeData.deprecation)}
          </div>
        ) : null}

        {nodeData.remediationNotice !== undefined ? (
          <div className="ff-node__description">
            {nodeData.remediationNotice.message}
          </div>
        ) : null}

        <div className="ff-node__body">
          <div className="ff-node__column ff-node__column--left">
            {leftSockets.map((socket) => (
              <SocketRow key={socket.id} socket={socket} />
            ))}
          </div>

          <div className="ff-node__column ff-node__column--right">
            {rightSockets.map((socket) => (
              <SocketRow key={socket.id} socket={socket} />
            ))}
          </div>
        </div>

        {bottomSockets.length > 0 ? (
          <div className="ff-node__row ff-node__row--bottom">
            {bottomSockets.map((socket) => (
              <SocketRow key={socket.id} socket={socket} />
            ))}
          </div>
        ) : null}
        </div>
      </div>

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