import { useCallback, useRef } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import {
  Background,
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

function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
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

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
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
        <Background className="ff-canvas__background" color="rgba(250, 250, 229, 0.08)" gap={28} />
        <Controls className="ff-canvas__controls" showInteractive={false} />
        {nodes.length === 0 ? (
          <div className="ff-canvas__empty-state">
            <p className="ff-canvas__eyebrow">Contract Canvas</p>
            <h1 className="ff-canvas__title">Drag verified nodes from the toolbox to start a targeting graph.</h1>
            <p className="ff-canvas__copy">
              Place Proximity, Get Tribe, List of Tribe, Is In List, and Add to Queue to build the canonical flow.
            </p>
          </div>
        ) : null}
      </ReactFlow>
    </div>
  );
}

function CanvasWorkspace() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}

export default CanvasWorkspace;