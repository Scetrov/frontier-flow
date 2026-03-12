import { Handle, type NodeProps } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";

import type { FlowNodeData, SocketDefinition } from "../types/nodes";
import { getHandlePosition, getSocketColor } from "../utils/socketTypes";

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
function BaseNode({ data, selected, icon: Icon, shape = "standard" }: BaseNodeProps) {
  const nodeData = data as FlowNodeData;
  const topSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "top");
  const leftSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "left");
  const rightSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "right");
  const bottomSockets = nodeData.sockets.filter((socket: SocketDefinition) => socket.position === "bottom");

  return (
    <div className={`ff-node ${shape === "diamond" ? "ff-node--diamond" : ""} ${selected ? "is-selected" : ""}`}>
      <div className={`ff-node__surface ${shape === "diamond" ? "ff-node__surface--diamond" : ""}`}>
        <div className="ff-node__row ff-node__row--top">
          {topSockets.map((socket) => (
            <SocketRow key={socket.id} socket={socket} />
          ))}
        </div>

        <div className="ff-node__header" style={{ backgroundColor: nodeData.color }}>
          {Icon !== undefined ? <Icon aria-hidden="true" className="ff-node__icon" /> : null}
          <span className="ff-node__title">{nodeData.label}</span>
        </div>

        <div className="ff-node__body">
          <div className="ff-node__column ff-node__column--left">
            {leftSockets.map((socket) => (
              <SocketRow key={socket.id} socket={socket} />
            ))}
          </div>

          <div className="ff-node__description">{nodeData.description}</div>

          <div className="ff-node__column ff-node__column--right">
            {rightSockets.map((socket) => (
              <SocketRow key={socket.id} socket={socket} />
            ))}
          </div>
        </div>

        <div className="ff-node__row ff-node__row--bottom">
          {bottomSockets.map((socket) => (
            <SocketRow key={socket.id} socket={socket} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default BaseNode;