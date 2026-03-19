import { Handle, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

import type { FlowNodeData, SocketDefinition } from "../types/nodes";
import { summarizeNodeFieldValues } from "../data/node-definitions";
import { getHandlePosition, getSocketColor } from "../utils/socketTypes";

const editNodeFieldsEventName = "frontier-flow:edit-node-fields";

interface BaseNodeProps extends NodeProps {
  readonly icon?: LucideIcon;
  readonly shape?: "standard" | "diamond";
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
  };
  const topSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "top");
  const leftSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "left");
  const rightSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "right");
  const bottomSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "bottom");
  const nodeStyle = { "--ff-node-accent": nodeData.color } as CSSProperties;
  const fieldSummaryLines = summarizeNodeFieldValues(nodeData);

  return (
    <div
      className={`ff-node ${shape === "diamond" ? "ff-node--diamond" : ""} ${selected ? "is-selected" : ""}`}
      data-validation-error={nodeData.validationState === "error" ? "true" : undefined}
      data-validation-warning={nodeData.validationState === "warning" ? "true" : undefined}
      style={nodeStyle}
      title={nodeData.diagnosticMessages?.join("\n")}
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
          {Icon !== undefined ? <Icon aria-hidden="true" className="ff-node__icon" /> : null}
          <span className="ff-node__title">{nodeData.label}</span>
        </div>

        <div className="ff-node__description">{nodeData.description}</div>

        {nodeData.deprecation !== undefined ? (
          <div className="ff-node__description">
            Retired node. {nodeData.deprecation.reason}
          </div>
        ) : null}

        {nodeData.remediationNotice !== undefined ? (
          <div className="ff-node__description">
            {nodeData.remediationNotice.message}
          </div>
        ) : null}

        {fieldSummaryLines.length > 0 ? (
          <div className="ff-node__field-summary">
            {fieldSummaryLines.map((summaryLine) => (
              <p className="ff-node__field-summary-line" key={summaryLine}>
                {summaryLine}
              </p>
            ))}
          </div>
        ) : null}

        {nodeData.fields !== undefined && nodeData.fields.length > 0 ? (
          <div className="ff-node__actions">
            <button
              aria-label={`Edit fields for ${nodeData.label}`}
              className="ff-node__edit-button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent(editNodeFieldsEventName, {
                    detail: {
                      nodeId: id,
                    },
                  }),
                );
              }}
              type="button"
            >
              Edit Fields
            </button>
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
  );
}

export default BaseNode;