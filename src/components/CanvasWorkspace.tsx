import { useCallback, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";
import { flowNodeTypes } from "../nodes";
import type { FlowEdge, FlowNode } from "../types/nodes";
import { getEdgeColor, getEdgeStrokeWidth, isValidFlowConnection } from "../utils/socketTypes";

import { restoreSavedFlow } from "./restoreSavedFlow";

interface CanvasWorkspaceProps {
  readonly initialNodes?: readonly FlowNode[];
  readonly initialEdges?: readonly FlowEdge[];
}

/**
 * Restores saved nodes from the canonical catalogue and drops edges that no longer point to valid handles.
 */
function FlowEditor({ initialNodes = [], initialEdges = [] }: CanvasWorkspaceProps) {
  const [restoredFlow] = useState(() => restoreSavedFlow(initialNodes, initialEdges));
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(restoredFlow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(restoredFlow.edges);
  const nodeCounterRef = useRef(0);
  const reactFlow = useReactFlow<FlowNode, FlowEdge>();

  const handleDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const definition = getNodeDefinition(type);
      if (definition === undefined) {
        return;
      }

      nodeCounterRef.current += 1;

      // Subtract the grab offset so the node appears where the user was pointing,
      // not offset by however far into the drag source the pointer was.
      const rawOffset = event.dataTransfer.getData("application/x-offset");
      const parts = rawOffset.split(",");
      const ox = isFinite(Number(parts[0])) ? Number(parts[0]) : 0;
      const oy = isFinite(Number(parts[1])) ? Number(parts[1]) : 0;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX - ox,
        y: event.clientY - oy,
      });

      const nextNode: FlowNode = {
        id: ["dnd", String(nodeCounterRef.current), String(Date.now())].join("_"),
        type: definition.type,
        position,
        data: createFlowNodeData(definition),
      };

      setNodes((currentNodes) => currentNodes.concat(nextNode));
    },
    [reactFlow, setNodes],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isValidFlowConnection(connection, nodes, edges)) {
        return;
      }

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const stroke = getEdgeColor(sourceNode, connection.sourceHandle);
      const strokeWidth = getEdgeStrokeWidth(sourceNode, connection.sourceHandle);

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke, strokeWidth },
          },
          currentEdges,
        ),
      );
    },
    [edges, nodes, setEdges],
  );

  const validateConnection = useCallback(
    (connection: Connection | Edge) =>
      isValidFlowConnection(
        {
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
        },
        nodes,
        edges,
      ),
    [edges, nodes],
  );

  return (
    <div className="ff-canvas" data-testid="canvas-workspace">
      <ReactFlow<FlowNode, FlowEdge>
        aria-label="Node editor canvas"
        className="ff-canvas__flow"
        defaultEdgeOptions={{ animated: true }}
        edges={edges}
        fitView={true}
        isValidConnection={validateConnection}
        nodeTypes={flowNodeTypes}
        nodes={nodes}
        onConnect={handleConnect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
        proOptions={{ hideAttribution: true }}
      >
        <Background className="ff-canvas__background" color="rgba(250, 250, 229, 0.1)" gap={32} variant={BackgroundVariant.Lines} />
        <Controls className="ff-canvas__controls" showInteractive={false} />
        {nodes.length === 0 ? (
          <div className="ff-canvas__empty-state">
            <p className="ff-canvas__eyebrow">Contract Canvas</p>
            <p className="ff-canvas__copy">
              Start with Aggression or Proximity, then layer scoring, filters, config sources, config list accessors, and Add to Queue.
            </p>
          </div>
        ) : null}
      </ReactFlow>
    </div>
  );
}

function CanvasWorkspace({ initialNodes, initialEdges }: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <FlowEditor initialEdges={initialEdges} initialNodes={initialNodes} />
    </ReactFlowProvider>
  );
}

export default CanvasWorkspace;