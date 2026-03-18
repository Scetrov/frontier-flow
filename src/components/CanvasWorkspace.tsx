import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";
import { flowNodeTypes } from "../nodes";
import type { FlowEdge, FlowNode } from "../types/nodes";
import type { CompilationStatus, CompilerDiagnostic } from "../compiler/types";
import {
  createNamedFlowContract,
  createUniqueContractName,
  loadContractLibrary,
  sanitizeContractName,
  saveContractLibrary,
  type ContractLibrary,
} from "../utils/contractStorage";
import { autoArrangeFlow } from "../utils/layoutFlow";
import { getEdgeColor, getEdgeStrokeWidth, isValidFlowConnection } from "../utils/socketTypes";
import { useAutoCompile } from "../hooks/useAutoCompile";

import { restoreSavedFlow } from "./restoreSavedFlow";

interface CanvasWorkspaceProps {
  readonly initialContractName?: string;
  readonly initialNodes?: readonly FlowNode[];
  readonly initialEdges?: readonly FlowEdge[];
  readonly focusedDiagnosticNodeId?: string | null;
  readonly focusedDiagnosticRequestKey?: number;
  readonly onCompilationStateChange?: (
    status: CompilationStatus,
    diagnostics: readonly CompilerDiagnostic[],
    sourceCode: string | null,
    artifactMoveSource?: string | null,
  ) => void;
  readonly onTriggerCompileChange?: (triggerCompile: () => void) => void;
}

interface ContextMenuState {
  readonly x: number;
  readonly y: number;
}

const desktopMediaQuery = "(min-width: 768px)";

function getIdleMsOverride(): number | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const value = new URLSearchParams(window.location.search).get("ff_idle_ms");
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function getIsDesktop() {
  if (typeof window === "undefined") {
    return true;
  }

  if (typeof window.matchMedia !== "function") {
    return true;
  }

  return window.matchMedia(desktopMediaQuery).matches;
}

/**
 * Restores saved nodes from the canonical catalogue and drops edges that no longer point to valid handles.
 */
function FlowEditor({
  initialContractName = "Starter Contract",
  initialNodes = [],
  initialEdges = [],
  focusedDiagnosticNodeId,
  focusedDiagnosticRequestKey = 0,
  onCompilationStateChange,
  onTriggerCompileChange,
}: CanvasWorkspaceProps) {
  const [contractLibrary, setContractLibrary] = useState<ContractLibrary>(() => {
    const fallbackContract = createNamedFlowContract(initialContractName, initialNodes, initialEdges);
    const loadedLibrary = loadContractLibrary(typeof window === "undefined" ? undefined : window.localStorage, fallbackContract);

    return {
      ...loadedLibrary,
      contracts: loadedLibrary.contracts.map((contract) => hydrateContract(contract.name, contract.nodes, contract.edges)),
    };
  });
  const activeContract =
    contractLibrary.contracts.find((contract) => contract.name === contractLibrary.activeContractName) ?? contractLibrary.contracts[0];
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(activeContract.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(activeContract.edges);
  const [draftContractName, setDraftContractName] = useState(activeContract.name);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [isContractPanelOpen, setIsContractPanelOpen] = useState(getIsDesktop);
  const nodeCounterRef = useRef(0);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const reactFlow = useReactFlow<FlowNode, FlowEdge>();
  const idleMsOverride = getIdleMsOverride();
  const compilation = useAutoCompile(nodes, edges, draftContractName, idleMsOverride);

  const diagnosticsByNodeId = useMemo(() => {
    const nextDiagnosticsByNodeId = new Map<string, readonly CompilerDiagnostic[]>();

    for (const diagnostic of compilation.diagnostics) {
      if (diagnostic.reactFlowNodeId === null) {
        continue;
      }

      const currentDiagnostics = nextDiagnosticsByNodeId.get(diagnostic.reactFlowNodeId) ?? [];
      nextDiagnosticsByNodeId.set(diagnostic.reactFlowNodeId, currentDiagnostics.concat(diagnostic));
    }

    return nextDiagnosticsByNodeId;
  }, [compilation.diagnostics]);

  const renderedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const nodeDiagnostics = diagnosticsByNodeId.get(node.id) ?? [];
        const validationState = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error")
          ? "error"
          : nodeDiagnostics.some((diagnostic) => diagnostic.severity === "warning")
            ? "warning"
            : undefined;

        return {
          ...node,
          data: {
            ...node.data,
            diagnosticMessages: nodeDiagnostics.map((diagnostic) => diagnostic.userMessage),
            validationState,
          },
        };
      }),
    [diagnosticsByNodeId, nodes],
  );

  const handleDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setContextMenu(null);

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
      setContextMenu(null);

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

  const handlePaneContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const handleAutoArrange = useCallback(() => {
    setNodes((currentNodes) => autoArrangeFlow(currentNodes, edges));
    setContextMenu(null);
    requestAnimationFrame(() => {
      void reactFlow.fitView({ duration: 240, padding: 0.24 });
    });
  }, [edges, reactFlow, setNodes]);

  const handleSelectContract = useCallback(
    (contractName: string) => {
      const nextContract = withActiveContractSnapshot(contractLibrary, nodes, edges).contracts.find(
        (contract) => contract.name === contractName,
      );
      if (nextContract === undefined) {
        return;
      }

      setContractLibrary((currentLibrary) => ({
        ...withActiveContractSnapshot(currentLibrary, nodes, edges),
        activeContractName: contractName,
      }));
      setDraftContractName(contractName);
      setNodes(nextContract.nodes);
      setEdges(nextContract.edges);
      setContextMenu(null);
      requestAnimationFrame(() => {
        void reactFlow.fitView({ duration: 200, padding: 0.24 });
      });
    },
    [contractLibrary, edges, nodes, reactFlow, setEdges, setNodes],
  );

  const handleSaveAsContract = useCallback(() => {
    const normalizedName = sanitizeContractName(draftContractName);
    const nextContract = createNamedFlowContract(normalizedName, nodes, edges);

    setContractLibrary((currentLibrary) => {
      const synchronizedLibrary = withActiveContractSnapshot(currentLibrary, nodes, edges);
      const contractIndex = synchronizedLibrary.contracts.findIndex((contract) => contract.name === normalizedName);
      if (contractIndex === -1) {
        return {
          ...synchronizedLibrary,
          activeContractName: normalizedName,
          contracts: synchronizedLibrary.contracts.concat(nextContract),
        };
      }

      return {
        ...synchronizedLibrary,
        activeContractName: normalizedName,
        contracts: synchronizedLibrary.contracts.map((contract, index) => (index === contractIndex ? nextContract : contract)),
      };
    });
    setDraftContractName(normalizedName);
  }, [draftContractName, edges, nodes]);

  const handleCreateContractCopy = useCallback(() => {
    const uniqueName = createUniqueContractName(draftContractName, contractLibrary.contracts.map((contract) => contract.name));
    const nextContract = createNamedFlowContract(uniqueName, nodes, edges);

    setContractLibrary((currentLibrary) => {
      const synchronizedLibrary = withActiveContractSnapshot(currentLibrary, nodes, edges);

      return {
        ...synchronizedLibrary,
        activeContractName: uniqueName,
        contracts: synchronizedLibrary.contracts.concat(nextContract),
      };
    });
    setDraftContractName(uniqueName);
  }, [contractLibrary.contracts, draftContractName, edges, nodes]);

  const handleDeleteContract = useCallback(() => {
    if (contractLibrary.contracts.length <= 1) {
      return;
    }

    const synchronizedLibrary = withActiveContractSnapshot(contractLibrary, nodes, edges);
    const nextContracts = synchronizedLibrary.contracts.filter((contract) => contract.name !== synchronizedLibrary.activeContractName);
    const nextActiveContract = nextContracts[0];

    setContractLibrary(() => ({
      ...synchronizedLibrary,
      activeContractName: nextActiveContract.name,
      contracts: nextContracts,
    }));
    setDraftContractName(nextActiveContract.name);
    setNodes(nextActiveContract.nodes);
    setEdges(nextActiveContract.edges);
  }, [contractLibrary, edges, nodes, setEdges, setNodes]);

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

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(desktopMediaQuery);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setIsContractPanelOpen(true);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    saveContractLibrary(
      typeof window === "undefined" ? undefined : window.localStorage,
      withActiveContractSnapshot(contractLibrary, nodes, edges),
    );
  }, [contractLibrary, edges, nodes]);

  useEffect(() => {
    onCompilationStateChange?.(
      compilation.status,
      compilation.diagnostics,
      compilation.sourceCode,
      compilation.artifact?.moveSource ?? null,
    );
  }, [compilation.artifact, compilation.diagnostics, compilation.sourceCode, compilation.status, onCompilationStateChange]);

  useEffect(() => {
    onTriggerCompileChange?.(compilation.triggerCompile);
  }, [compilation.triggerCompile, onTriggerCompileChange]);

  useEffect(() => {
    if (focusedDiagnosticNodeId === null || focusedDiagnosticNodeId === undefined) {
      return;
    }

    const targetNode = nodes.find((node) => node.id === focusedDiagnosticNodeId);
    if (targetNode === undefined) {
      return;
    }

    void reactFlow.setCenter(targetNode.position.x + 120, targetNode.position.y + 80, {
      duration: 180,
      zoom: 1,
    });
  }, [focusedDiagnosticNodeId, focusedDiagnosticRequestKey, nodes, reactFlow]);

  useEffect(() => {
    if (contextMenu === null) {
      return undefined;
    }

    const handleWindowPointerDown = (event: PointerEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setContextMenu(null);
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("pointerdown", handleWindowPointerDown);
    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handleWindowPointerDown);
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [contextMenu]);

  return (
    <div className="ff-canvas" data-testid="canvas-workspace" onContextMenu={handlePaneContextMenu}>
      {!isDesktop && isContractPanelOpen ? (
        <button
          aria-label="Close saved contract controls overlay"
          className="ff-canvas__drawer-overlay"
          onClick={() => {
            setIsContractPanelOpen(false);
          }}
          style={{ left: "calc(min(24rem, 88vw) + 2.75rem)" }}
          type="button"
        />
      ) : null}

      <div className="ff-canvas__drawer ff-canvas__drawer--left">
        <div
          className="ff-canvas__drawer-shell"
          style={{
            transform: isContractPanelOpen ? "translateX(0)" : "translateX(calc(-100% + 2.75rem))",
          }}
        >
          <aside
            aria-hidden={!isContractPanelOpen}
            aria-label="Saved contract controls"
            className="ff-contract-panel"
            id="saved-contract-controls"
            inert={!isContractPanelOpen}
            role="region"
          >
            <div className="ff-contract-panel__header">
              <p className="ff-contract-panel__eyebrow">Contracts</p>
              <h2 className="ff-contract-panel__title">Save / Load</h2>
              <p className="ff-contract-panel__copy">Manage local flow snapshots without taking canvas space away from the editor.</p>
            </div>

            <div className="ff-contract-bar">
              <label className="ff-contract-bar__field">
                <span className="ff-contract-bar__label">Saved Contract</span>
                <select
                  aria-label="Saved contract"
                  className="ff-contract-bar__input"
                  value={contractLibrary.activeContractName}
                  onChange={(event) => {
                    handleSelectContract(event.target.value);
                  }}
                >
                  {contractLibrary.contracts.map((contract) => (
                    <option key={contract.name} value={contract.name}>
                      {contract.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ff-contract-bar__field ff-contract-bar__field--name">
                <span className="ff-contract-bar__label">Contract Name</span>
                <input
                  aria-label="Contract name"
                  className="ff-contract-bar__input"
                  type="text"
                  value={draftContractName}
                  onChange={(event) => {
                    setDraftContractName(event.target.value);
                  }}
                />
              </label>

              <div className="ff-contract-bar__actions">
                <button className="ff-contract-bar__button" type="button" onClick={handleSaveAsContract}>
                  Save
                </button>
                <button className="ff-contract-bar__button" type="button" onClick={handleCreateContractCopy}>
                  Save Copy
                </button>
                <button
                  className="ff-contract-bar__button ff-contract-bar__button--danger"
                  type="button"
                  onClick={handleDeleteContract}
                  disabled={contractLibrary.contracts.length <= 1}
                >
                  Delete
                </button>
              </div>

              <p className="ff-contract-bar__meta">Nodes, edges, and positions auto-save locally for the active contract.</p>
            </div>
          </aside>

          <button
            aria-controls="saved-contract-controls"
            aria-expanded={isContractPanelOpen}
            aria-label={isContractPanelOpen ? "Close saved contract controls" : "Open saved contract controls"}
            className="ff-canvas__drawer-handle ff-canvas__drawer-handle--left"
            onClick={() => {
              setIsContractPanelOpen((open) => !open);
            }}
            type="button"
          >
            {isContractPanelOpen ? <ChevronLeft aria-hidden="true" className="h-5 w-5" /> : <ChevronRight aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <ReactFlow<FlowNode, FlowEdge>
        aria-label="Node editor canvas"
        className="ff-canvas__flow"
        defaultEdgeOptions={{ animated: true }}
        edges={edges}
        fitView={true}
        isValidConnection={validateConnection}
        nodeTypes={flowNodeTypes}
        nodes={renderedNodes}
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

      {contextMenu !== null ? (
        <div
          ref={contextMenuRef}
          aria-label="Canvas context menu"
          className="ff-canvas__context-menu"
          role="menu"
          style={{ left: `${String(contextMenu.x)}px`, top: `${String(contextMenu.y)}px` }}
        >
          <button className="ff-canvas__context-action" role="menuitem" type="button" onClick={handleAutoArrange}>
            Auto-arrange contract
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CanvasWorkspace({
  initialContractName,
  initialNodes,
  initialEdges,
  focusedDiagnosticNodeId,
  focusedDiagnosticRequestKey,
  onCompilationStateChange,
  onTriggerCompileChange,
}: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <FlowEditor
        focusedDiagnosticNodeId={focusedDiagnosticNodeId}
        focusedDiagnosticRequestKey={focusedDiagnosticRequestKey}
        initialContractName={initialContractName}
        initialEdges={initialEdges}
        initialNodes={initialNodes}
        onCompilationStateChange={onCompilationStateChange}
        onTriggerCompileChange={onTriggerCompileChange}
      />
    </ReactFlowProvider>
  );
}

export default CanvasWorkspace;

function hydrateContract(name: string, nodes: readonly FlowNode[], edges: readonly FlowEdge[]) {
  const restoredFlow = restoreSavedFlow(nodes, edges);
  return createNamedFlowContract(name, restoredFlow.nodes, restoredFlow.edges);
}

function withActiveContractSnapshot(
  contractLibrary: ContractLibrary,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): ContractLibrary {
  return {
    ...contractLibrary,
    contracts: contractLibrary.contracts.map((contract) =>
      contract.name === contractLibrary.activeContractName ? createNamedFlowContract(contract.name, nodes, edges) : contract,
    ),
  };
}