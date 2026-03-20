import { Handle } from "@xyflow/react";
import type { CSSProperties } from "react";
import { AlertTriangle, Check, Pencil, Trash2, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getNodeFieldSummary, hasEditableNodeFields } from "../data/nodeFieldCatalog";
import type { FlowNodeData, SocketDefinition } from "../types/nodes";
import { getHandlePosition, getSocketColor } from "../utils/socketTypes";

export interface RenderableNodeData extends FlowNodeData {
  readonly diagnosticMessages?: readonly string[];
  readonly validationState?: "error" | "warning";
  readonly deleteConfirmationState?: FlowNodeData["deleteConfirmationState"];
  readonly onDeleteRequest?: FlowNodeData["onDeleteRequest"];
  readonly onDeleteConfirm?: FlowNodeData["onDeleteConfirm"];
  readonly onDeleteCancel?: FlowNodeData["onDeleteCancel"];
}

interface NodeShellProps {
  readonly nodeData: RenderableNodeData;
  readonly nodeId: string;
  readonly selected?: boolean;
  readonly icon?: LucideIcon;
  readonly shape?: "standard" | "diamond";
  readonly mode?: "canvas" | "toolbox";
  readonly editing?: boolean;
  readonly onEdit?: () => void;
}

function getDeprecationMessage(deprecation: NonNullable<FlowNodeData["deprecation"]>): string {
  const statusLabel = deprecation.status === "deprecated" ? "Deprecated node." : "Retired node.";
  const remediationMessage = deprecation.remediationMessage ? ` ${deprecation.remediationMessage}` : "";

  return `${statusLabel} ${deprecation.reason}${remediationMessage}`;
}

function SocketGlyph({ socket, mode }: { readonly socket: SocketDefinition; readonly mode: "canvas" | "toolbox" }) {
  const isOutput = socket.direction === "output";

  return (
    <div className={`ff-node__socket ff-node__socket--${socket.position} ff-node__socket--${socket.direction}`}>
      {isOutput ? <span className="ff-node__socket-label">{socket.label}</span> : null}
      {mode === "canvas" ? (
        <Handle
          className="ff-node__handle"
          id={socket.id}
          isConnectableEnd={true}
          isConnectableStart={true}
          position={getHandlePosition(socket.position)}
          style={{ backgroundColor: getSocketColor(socket.type) }}
          type={isOutput ? "source" : "target"}
        />
      ) : (
        <span
          aria-hidden="true"
          className="ff-node__handle ff-node__handle-indicator"
          style={{ backgroundColor: getSocketColor(socket.type) } as CSSProperties}
        />
      )}
      {!isOutput ? <span className="ff-node__socket-label">{socket.label}</span> : null}
    </div>
  );
}

function NodeShell({
  nodeData,
  nodeId,
  selected = false,
  icon: Icon,
  shape = "standard",
  mode = "canvas",
  editing = false,
  onEdit,
}: NodeShellProps) {
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const confirmDeleteButtonRef = useRef<HTMLButtonElement | null>(null);
  const topSockets = nodeData.sockets.filter((socket) => socket.position === "top");
  const leftSockets = nodeData.sockets.filter((socket) => socket.position === "left");
  const rightSockets = nodeData.sockets.filter((socket) => socket.position === "right");
  const bottomSockets = nodeData.sockets.filter((socket) => socket.position === "bottom");
  const isEditable = mode === "canvas" && hasEditableNodeFields(nodeData.type);
  const fieldSummary = useMemo(() => getNodeFieldSummary(nodeData.type, nodeData.fields), [nodeData.fields, nodeData.type]);
  const nodeStyle = { "--ff-node-accent": nodeData.color } as CSSProperties;
  const isDeleteConfirming = nodeData.deleteConfirmationState?.mode === "confirm";
  const diagnosticMessage = nodeData.diagnosticMessages?.join(" ") ?? "";
  const shouldShowErrorIndicator = mode === "canvas" && nodeData.validationState === "error" && diagnosticMessage.length > 0;
  const diagnosticTooltipId = `${nodeId}-diagnostics`;

  useEffect(() => {
    if (!isDeleteConfirming) {
      return;
    }

    confirmDeleteButtonRef.current?.focus();
  }, [isDeleteConfirming]);

  return (
    <div
      className={`ff-node ${shape === "diamond" ? "ff-node--diamond" : ""} ${selected ? "is-selected" : ""} ${mode === "toolbox" ? "ff-node--toolbox" : ""}`}
      data-validation-error={nodeData.validationState === "error" ? "true" : undefined}
      data-validation-warning={nodeData.validationState === "warning" ? "true" : undefined}
      data-editing={editing ? "true" : undefined}
      data-node-mode={mode}
      style={nodeStyle}
    >
      <div className={`ff-node__surface ${shape === "diamond" ? "ff-node__surface--diamond" : ""}`}>
        {topSockets.length > 0 ? (
          <div className="ff-node__row ff-node__row--top">
            {topSockets.map((socket) => (
              <SocketGlyph key={socket.id} mode={mode} socket={socket} />
            ))}
          </div>
        ) : null}

        <div className="ff-node__header" style={{ backgroundColor: nodeData.color }}>
          {shouldShowErrorIndicator ? (
            <button
              aria-describedby={isDiagnosticOpen ? diagnosticTooltipId : undefined}
              aria-expanded={isDiagnosticOpen}
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
          {mode === "canvas" && (isEditable || nodeData.onDeleteRequest !== undefined) ? (
            <div className="ff-node__actions">
              {isEditable ? (
                <button
                  aria-label={`Edit ${nodeData.label}`}
                  className="ff-node__edit-button nodrag nopan"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit?.();
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
                      ref={confirmDeleteButtonRef}
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
          <div className="ff-node__description">{getDeprecationMessage(nodeData.deprecation)}</div>
        ) : null}

        {nodeData.remediationNotice !== undefined ? (
          <div className="ff-node__description">{nodeData.remediationNotice.message}</div>
        ) : null}

        <div className="ff-node__body">
          <div className="ff-node__column ff-node__column--left">
            {leftSockets.map((socket) => (
              <SocketGlyph key={socket.id} mode={mode} socket={socket} />
            ))}
          </div>

          <div className="ff-node__column ff-node__column--right">
            {rightSockets.map((socket) => (
              <SocketGlyph key={socket.id} mode={mode} socket={socket} />
            ))}
          </div>
        </div>

        {bottomSockets.length > 0 ? (
          <div className="ff-node__row ff-node__row--bottom">
            {bottomSockets.map((socket) => (
              <SocketGlyph key={socket.id} mode={mode} socket={socket} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default NodeShell;