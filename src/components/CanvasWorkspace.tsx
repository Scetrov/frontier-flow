import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  Position,
  addEdge,
  getBezierPath,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Check, ChevronLeft, ChevronRight, LayoutGrid, Trash2, X } from "lucide-react";

import { createFlowNodeData, getNodeDefinition } from "../data/node-definitions";
import { seededExampleContracts } from "../data/exampleContracts";
import { flowNodeTypes } from "../nodes";
import type {
  CanvasContextMenuTarget,
  CanvasSelectionTarget,
  DeleteConfirmationState,
  FlowEdge,
  FlowNode,
  RemediationNotice,
} from "../types/nodes";
import type { NodeFieldMap } from "../types/nodes";
import type { CompilationStatus, CompilerDiagnostic } from "../compiler/types";
import {
  createNamedFlowContract,
  createUniqueContractName,
  loadContractLibrary,
  sanitizeContractName,
  saveContractLibrary,
  type ContractLibrary,
  type NamedFlowContract,
  updateNamedFlowContract,
} from "../utils/contractStorage";
import { autoArrangeFlow } from "../utils/layoutFlow";
import { getEdgeColor, getEdgeStrokeWidth, isValidFlowConnection } from "../utils/socketTypes";
import { loadUiState, mergeUiState } from "../utils/uiStateStorage";
import { useAutoCompile } from "../hooks/useAutoCompile";

import { restoreSavedFlow } from "./restoreSavedFlow";
import { NodeFieldEditingContext } from "../nodes/NodeFieldEditingContext";

interface CanvasWorkspaceProps {
  readonly initialContractName?: string;
  readonly initialNodes?: readonly FlowNode[];
  readonly initialEdges?: readonly FlowEdge[];
  readonly mode?: "persistent" | "preview";
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
  readonly target: CanvasContextMenuTarget;
}

interface HydratedContractSnapshot {
  readonly contract: NamedFlowContract;
  readonly remediationNotices: readonly RemediationNotice[];
}

interface HydratedContractLibrarySnapshot {
  readonly library: ContractLibrary;
  readonly remediationNoticesByContractName: Readonly<Record<string, readonly RemediationNotice[]>>;
}

interface SelectedEdgeDeleteAnchor {
  readonly edgeId: string;
  readonly x: number;
  readonly y: number;
  readonly color: string;
}

interface SelectedEdgeDeleteState {
  readonly edgeId: string | null;
  readonly confirmationState: DeleteConfirmationState;
}

const desktopMediaQuery = "(min-width: 768px)";
const deleteConfirmationTimeoutMs = 15_000;
const idleDeleteConfirmationState: DeleteConfirmationState = { mode: "idle", startedAt: null };
const nonTextInputTypes = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);

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

function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || target.closest('[contenteditable="true"], [role="textbox"]') !== null) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target instanceof HTMLInputElement) {
    return !nonTextInputTypes.has(target.type);
  }

  return false;
}

function getNodeCenter(node: FlowNode) {
  const width = node.measured?.width ?? node.width ?? 0;
  const height = node.measured?.height ?? node.height ?? 0;

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

function getFallbackEdgeDeleteAnchor(edge: FlowEdge, nodes: readonly FlowNode[]) {
  const sourceNode = nodes.find((candidate) => candidate.id === edge.source);
  const targetNode = nodes.find((candidate) => candidate.id === edge.target);
  if (sourceNode === undefined || targetNode === undefined) {
    return null;
  }

  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);
  const [, labelX, labelY] = getBezierPath({
    sourceX: sourceCenter.x,
    sourceY: sourceCenter.y,
    targetX: targetCenter.x,
    targetY: targetCenter.y,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  return {
    x: labelX,
    y: labelY,
  };
}

function getSelectedTarget(nodes: readonly FlowNode[], edges: readonly FlowEdge[]): CanvasSelectionTarget {
  const selectedNode = nodes.find((node) => node.selected);
  if (selectedNode !== undefined) {
    return { kind: "node", targetId: selectedNode.id, origin: "programmatic" };
  }

  const selectedEdge = edges.find((edge) => edge.selected);
  if (selectedEdge !== undefined) {
    return { kind: "edge", targetId: selectedEdge.id, origin: "programmatic" };
  }

  return { kind: "none", targetId: null, origin: "programmatic" };
}

/**
 * Restores saved nodes from the canonical catalogue and drops edges that no longer point to valid handles.
 */
function FlowEditor({
  initialContractName = "Starter Contract",
  initialNodes = [],
  initialEdges = [],
  mode = "persistent",
  focusedDiagnosticNodeId,
  focusedDiagnosticRequestKey = 0,
  onCompilationStateChange,
  onTriggerCompileChange,
}: CanvasWorkspaceProps) {
  const initialLibrarySnapshot = useMemo(
    () => createInitialLibrarySnapshot(initialContractName, initialNodes, initialEdges, mode),
    [initialContractName, initialEdges, initialNodes, mode],
  );
  const [contractLibrary, setContractLibrary] = useState<ContractLibrary>(() => {
    return initialLibrarySnapshot.library;
  });
  const [contractRemediationNotices, setContractRemediationNotices] = useState<Readonly<Record<string, readonly RemediationNotice[]>>>(
    () => initialLibrarySnapshot.remediationNoticesByContractName,
  );
  const activeContract =
    contractLibrary.contracts.find((contract) => contract.name === contractLibrary.activeContractName) ?? contractLibrary.contracts[0];
  const activeRemediationNotices = contractRemediationNotices[contractLibrary.activeContractName] ?? [];
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(activeContract.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(activeContract.edges);
  const [draftContractName, setDraftContractName] = useState(activeContract.name);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [nodeDeleteStates, setNodeDeleteStates] = useState<Readonly<Record<string, DeleteConfirmationState>>>({});
  const [selectedEdgeDeleteAnchor, setSelectedEdgeDeleteAnchor] = useState<SelectedEdgeDeleteAnchor | null>(null);
  const [selectedEdgeDeleteState, setSelectedEdgeDeleteState] = useState<SelectedEdgeDeleteState>({
    edgeId: null,
    confirmationState: idleDeleteConfirmationState,
  });
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [isContractPanelOpen, setIsContractPanelOpen] = useState(
    () => (mode === "persistent" ? loadUiState(typeof window === "undefined" ? undefined : window.localStorage).isContractPanelOpen : false),
  );
  const nodeCounterRef = useRef(0);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmationTimersRef = useRef(new Map<string, number>());
  const edgeDeleteConfirmationTimerRef = useRef<number | null>(null);
  const reactFlow = useReactFlow<FlowNode, FlowEdge>();
  const idleMsOverride = getIdleMsOverride();
  const compilation = useAutoCompile(nodes, edges, draftContractName, idleMsOverride);
  const selectedTarget = useMemo(() => getSelectedTarget(nodes, edges), [edges, nodes]);
  const fallbackSelectedEdgeDeleteAnchor = useMemo(() => {
    if (selectedTarget.kind !== "edge" || selectedTarget.targetId === null) {
      return null;
    }

    const edge = edges.find((candidate) => candidate.id === selectedTarget.targetId);
    if (edge === undefined) {
      return null;
    }

    const fallbackAnchor = getFallbackEdgeDeleteAnchor(edge, nodes);
    if (fallbackAnchor === null) {
      return null;
    }

    const sourceNode = nodes.find((candidate) => candidate.id === edge.source);
    const fallbackColor = typeof edge.style?.stroke === "string"
      ? edge.style.stroke
      : getEdgeColor(sourceNode, edge.sourceHandle ?? null);

    return {
      edgeId: edge.id,
      x: fallbackAnchor.x,
      y: fallbackAnchor.y,
      color: fallbackColor,
    } satisfies SelectedEdgeDeleteAnchor;
  }, [edges, nodes, selectedTarget]);
  const activeSelectedEdgeDeleteAnchor = useMemo(() => {
    if (selectedTarget.kind !== "edge" || selectedTarget.targetId === null) {
      return null;
    }

    if (selectedEdgeDeleteAnchor?.edgeId === selectedTarget.targetId) {
      return selectedEdgeDeleteAnchor;
    }

    if (fallbackSelectedEdgeDeleteAnchor?.edgeId === selectedTarget.targetId) {
      return fallbackSelectedEdgeDeleteAnchor;
    }

    return null;
  }, [fallbackSelectedEdgeDeleteAnchor, selectedEdgeDeleteAnchor, selectedTarget]);
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

  const handleNodeFieldsChange = useCallback(
    (nodeId: string, fields: NodeFieldMap) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  fields,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const clearNodeDeleteState = useCallback((nodeId: string) => {
    setNodeDeleteStates((currentStates) => {
      if (!(nodeId in currentStates)) {
        return currentStates;
      }

      return Object.fromEntries(Object.entries(currentStates).filter(([candidateNodeId]) => candidateNodeId !== nodeId));
    });
  }, []);

  const deleteNodeById = useCallback(
    (nodeId: string) => {
      setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      clearNodeDeleteState(nodeId);
      setContextMenu((currentMenu) => {
        if (currentMenu?.target.kind === "node" && currentMenu.target.targetId === nodeId) {
          return null;
        }

        return currentMenu;
      });
    },
    [clearNodeDeleteState, setEdges, setNodes],
  );

  const deleteEdgeById = useCallback(
    (edgeId: string) => {
      setSelectedEdgeDeleteAnchor((currentAnchor) => (currentAnchor?.edgeId === edgeId ? null : currentAnchor));
      setSelectedEdgeDeleteState((currentState) =>
        currentState.edgeId === edgeId
          ? {
              edgeId: null,
              confirmationState: idleDeleteConfirmationState,
            }
          : currentState,
      );
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId));
      setContextMenu((currentMenu) => {
        if (currentMenu?.target.kind === "edge" && currentMenu.target.targetId === edgeId) {
          return null;
        }

        return currentMenu;
      });
    },
    [setEdges],
  );

  const clearSelectedEdgeDeleteState = useCallback(() => {
    setSelectedEdgeDeleteState((currentState) => {
      if (currentState.confirmationState.mode === "idle" && currentState.edgeId === null) {
        return currentState;
      }

      return {
        edgeId: null,
        confirmationState: idleDeleteConfirmationState,
      };
    });
  }, []);

  const handleSelectedEdgeDeleteRequest = useCallback(
    (edgeId: string, options?: { readonly immediate?: boolean }) => {
      if (options?.immediate === true) {
        deleteEdgeById(edgeId);
        return;
      }

      setSelectedEdgeDeleteState({
        edgeId,
        confirmationState: { mode: "confirm", startedAt: Date.now() },
      });
    },
    [deleteEdgeById],
  );

  const selectTarget = useCallback(
    (target: CanvasContextMenuTarget) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const selected = target.kind === "node" && target.targetId === node.id;
          return node.selected === selected ? node : { ...node, selected };
        }),
      );
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          const selected = target.kind === "edge" && target.targetId === edge.id;
          return edge.selected === selected ? edge : { ...edge, selected };
        }),
      );
    },
    [setEdges, setNodes],
  );

  const handleNodeDeleteRequest = useCallback(
    (nodeId: string, options?: { readonly immediate?: boolean }) => {
      if (options?.immediate === true) {
        deleteNodeById(nodeId);
        return;
      }

      const existingTimeoutId = deleteConfirmationTimersRef.current.get(nodeId);
      if (existingTimeoutId !== undefined) {
        window.clearTimeout(existingTimeoutId);
        deleteConfirmationTimersRef.current.delete(nodeId);
      }

      setNodeDeleteStates((currentStates) => ({
        ...currentStates,
        [nodeId]: { mode: "confirm", startedAt: Date.now() },
      }));
    },
    [deleteNodeById],
  );

  const renderedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const nodeDiagnostics = diagnosticsByNodeId.get(node.id) ?? [];
        const validationState: FlowNode["data"]["validationState"] = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error")
          ? "error"
          : nodeDiagnostics.some((diagnostic) => diagnostic.severity === "warning")
            ? "warning"
            : undefined;

        return {
          ...node,
          data: {
            ...node.data,
            deleteConfirmationState: nodeDeleteStates[node.id] ?? idleDeleteConfirmationState,
            diagnosticMessages: nodeDiagnostics.map((diagnostic) => diagnostic.userMessage),
            onDeleteCancel: () => {
              clearNodeDeleteState(node.id);
            },
            onDeleteConfirm: () => {
              deleteNodeById(node.id);
            },
            onDeleteRequest: (options?: { readonly immediate?: boolean }) => {
              handleNodeDeleteRequest(node.id, options);
            },
            validationState,
          },
        };
      }),
    [clearNodeDeleteState, deleteNodeById, diagnosticsByNodeId, handleNodeDeleteRequest, nodeDeleteStates, nodes],
  );

  const activeContractDescription = activeContract.description ?? (activeContract.isSeeded ? "Curated example contract." : "Local contract snapshot.");

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

  const handlePaneContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      const target = { kind: "canvas", targetId: null } satisfies CanvasContextMenuTarget;
      selectTarget(target);
      setContextMenu({ x: event.clientX, y: event.clientY, target });
    },
    [selectTarget],
  );

  const handleNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: FlowNode) => {
      event.preventDefault();
      event.stopPropagation();
      const target = { kind: "node", targetId: node.id } satisfies CanvasContextMenuTarget;
      selectTarget(target);
      setContextMenu({ x: event.clientX, y: event.clientY, target });
    },
    [selectTarget],
  );

  const handleEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: FlowEdge) => {
      event.preventDefault();
      event.stopPropagation();
      const target = { kind: "edge", targetId: edge.id } satisfies CanvasContextMenuTarget;
      selectTarget(target);
      setContextMenu({ x: event.clientX, y: event.clientY, target });
    },
    [selectTarget],
  );

  const handleAutoArrange = useCallback(() => {
    setNodes((currentNodes) => autoArrangeFlow(currentNodes, edges));
    setContextMenu(null);
    requestAnimationFrame(() => {
      void reactFlow.fitView({ duration: 240, padding: 0.24 });
    });
  }, [edges, reactFlow, setNodes]);

  const handleDeleteFromContextMenu = useCallback(() => {
    if (contextMenu === null) {
      return;
    }

    if (contextMenu.target.kind === "node") {
      deleteNodeById(contextMenu.target.targetId);
    }

    if (contextMenu.target.kind === "edge") {
      deleteEdgeById(contextMenu.target.targetId);
    }

    setContextMenu(null);
  }, [contextMenu, deleteEdgeById, deleteNodeById]);

  const handleSelectContract = useCallback(
    (contractName: string) => {
      const currentContractSnapshot = contractLibrary.contracts.find((contract) => contract.name === contractLibrary.activeContractName);
      if (
        contractName !== contractLibrary.activeContractName &&
        currentContractSnapshot !== undefined &&
        hasUnsavedCanvasChanges(currentContractSnapshot, nodes, edges) &&
        typeof window !== "undefined" &&
        !window.confirm("Replace the current unsaved canvas changes with the selected contract?")
      ) {
        return;
      }

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

    setContractLibrary((currentLibrary) => {
      const synchronizedLibrary = withActiveContractSnapshot(currentLibrary, nodes, edges);
      const contractIndex = synchronizedLibrary.contracts.findIndex((contract) => contract.name === normalizedName);
      const nextContract =
        contractIndex === -1
          ? createNamedFlowContract(normalizedName, nodes, edges)
          : updateNamedFlowContract(synchronizedLibrary.contracts[contractIndex], nodes, edges);

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
    setContractRemediationNotices((currentNotices) => ({
      ...currentNotices,
      [normalizedName]: [],
    }));
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
    setContractRemediationNotices((currentNotices) => ({
      ...currentNotices,
      [uniqueName]: [],
    }));
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
    setContractRemediationNotices((currentNotices) => {
      return Object.fromEntries(
        Object.entries(currentNotices).filter(([contractName]) => contractName !== synchronizedLibrary.activeContractName),
      );
    });
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
    if (selectedTarget.kind !== "edge" || selectedTarget.targetId === null) {
      return;
    }

    const edge = edges.find((candidate) => candidate.id === selectedTarget.targetId);
    if (edge === undefined) {
      return;
    }

    const fallbackColor = fallbackSelectedEdgeDeleteAnchor?.edgeId === edge.id
      ? fallbackSelectedEdgeDeleteAnchor.color
      : getEdgeColor(nodes.find((candidate) => candidate.id === edge.source), edge.sourceHandle ?? null);

    const updateAnchor = () => {
      const edgePath = document.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${edge.id}"] .react-flow__edge-path`);
      if (
        edgePath !== null
        && typeof edgePath.getTotalLength === "function"
        && typeof edgePath.getPointAtLength === "function"
      ) {
        const midpoint = edgePath.getPointAtLength(edgePath.getTotalLength() / 2);
        const computedStroke = typeof window === "undefined" ? "" : window.getComputedStyle(edgePath).stroke;

        setSelectedEdgeDeleteAnchor({
          edgeId: edge.id,
          x: midpoint.x,
          y: midpoint.y,
          color: computedStroke || fallbackColor,
        });
      }
    };

    if (typeof window === "undefined") {
      updateAnchor();
      return;
    }

    const frameId = window.requestAnimationFrame(updateAnchor);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [edges, fallbackSelectedEdgeDeleteAnchor, nodes, selectedTarget]);

  useEffect(() => {
    if (selectedEdgeDeleteState.confirmationState.mode !== "confirm" || selectedEdgeDeleteState.edgeId === null) {
      if (edgeDeleteConfirmationTimerRef.current !== null) {
        window.clearTimeout(edgeDeleteConfirmationTimerRef.current);
        edgeDeleteConfirmationTimerRef.current = null;
      }

      return;
    }

    if (edgeDeleteConfirmationTimerRef.current !== null) {
      window.clearTimeout(edgeDeleteConfirmationTimerRef.current);
    }

    edgeDeleteConfirmationTimerRef.current = window.setTimeout(() => {
      clearSelectedEdgeDeleteState();
      edgeDeleteConfirmationTimerRef.current = null;
    }, deleteConfirmationTimeoutMs);

    return () => {
      if (edgeDeleteConfirmationTimerRef.current !== null) {
        window.clearTimeout(edgeDeleteConfirmationTimerRef.current);
        edgeDeleteConfirmationTimerRef.current = null;
      }
    };
  }, [clearSelectedEdgeDeleteState, selectedEdgeDeleteState]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(desktopMediaQuery);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const timerMap = deleteConfirmationTimersRef.current;

    const activeConfirmations = new Set<string>();

    for (const [nodeId, state] of Object.entries(nodeDeleteStates)) {
      if (state.mode !== "confirm") {
        continue;
      }

      activeConfirmations.add(nodeId);
      if (timerMap.has(nodeId)) {
        continue;
      }

      const timeoutId = window.setTimeout(() => {
        clearNodeDeleteState(nodeId);
        timerMap.delete(nodeId);
      }, deleteConfirmationTimeoutMs);

      timerMap.set(nodeId, timeoutId);
    }

    for (const [nodeId, timeoutId] of timerMap.entries()) {
      if (activeConfirmations.has(nodeId)) {
        continue;
      }

      window.clearTimeout(timeoutId);
      timerMap.delete(nodeId);
    }
  }, [clearNodeDeleteState, nodeDeleteStates]);

  useEffect(() => {
    const timerMap = deleteConfirmationTimersRef.current;

    return () => {
      for (const timeoutId of timerMap.values()) {
        window.clearTimeout(timeoutId);
      }

      timerMap.clear();

      if (edgeDeleteConfirmationTimerRef.current !== null) {
        window.clearTimeout(edgeDeleteConfirmationTimerRef.current);
        edgeDeleteConfirmationTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "persistent") {
      return;
    }

    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, {
      isContractPanelOpen,
    });
  }, [isContractPanelOpen, mode]);

  useEffect(() => {
    if (mode !== "persistent") {
      return;
    }

    saveContractLibrary(
      typeof window === "undefined" ? undefined : window.localStorage,
      withActiveContractSnapshot(contractLibrary, nodes, edges),
    );
  }, [contractLibrary, edges, mode, nodes]);

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

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (isTextEntryElement(event.target)) {
        return;
      }

      if (selectedTarget.kind === "node" && selectedTarget.targetId !== null) {
        event.preventDefault();
        deleteNodeById(selectedTarget.targetId);
        return;
      }

      if (selectedTarget.kind === "edge" && selectedTarget.targetId !== null) {
        event.preventDefault();
        deleteEdgeById(selectedTarget.targetId);
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [deleteEdgeById, deleteNodeById, selectedTarget]);

  return (
    <NodeFieldEditingContext.Provider value={handleNodeFieldsChange}>
      <div className="ff-canvas" data-testid="canvas-workspace" onContextMenu={handlePaneContextMenu}>
      {mode === "persistent" && !isDesktop && isContractPanelOpen ? (
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

      {mode === "persistent" ? (
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

            {activeRemediationNotices.length > 0 ? (
              <div aria-live="polite" className="ff-contract-bar" role="status">
                <p className="ff-contract-bar__label">Legacy remediation required</p>
                {activeRemediationNotices.map((notice) => (
                  <p key={`${notice.nodeId}_${notice.legacyType}`} className="ff-contract-bar__meta">
                    {notice.message} {notice.suggestedAction}
                  </p>
                ))}
              </div>
            ) : null}

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
                      {contract.isSeeded === true ? `Example · ${contract.name}` : contract.name}
                    </option>
                  ))}
                </select>
              </label>

              <p className="ff-contract-bar__meta">
                {activeContract.isSeeded === true ? "Seeded example" : "User contract"} · {activeContractDescription}
              </p>

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
      ) : null}

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
        onEdgeContextMenu={handleEdgeContextMenu}
        onEdgesChange={onEdgesChange}
        onNodeContextMenu={handleNodeContextMenu}
        onNodesChange={onNodesChange}
        onPaneClick={() => {
          setContextMenu(null);
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background className="ff-canvas__background" color="rgba(250, 250, 229, 0.1)" gap={32} variant={BackgroundVariant.Lines} />
        <Controls className="ff-canvas__controls" showInteractive={false} />
        {selectedTarget.kind === "edge"
        && selectedTarget.targetId !== null
        && activeSelectedEdgeDeleteAnchor !== null
        && activeSelectedEdgeDeleteAnchor.edgeId === selectedTarget.targetId ? (
          <ViewportPortal>
            <div
              aria-label={selectedEdgeDeleteState.confirmationState.mode === "confirm" ? "Confirm delete selected edge" : undefined}
              className="ff-edge__midpoint-delete-group nodrag nopan"
              role={selectedEdgeDeleteState.confirmationState.mode === "confirm" ? "group" : undefined}
              style={{
                left: `${String(activeSelectedEdgeDeleteAnchor.x)}px`,
                top: `${String(activeSelectedEdgeDeleteAnchor.y)}px`,
                "--ff-edge-delete-accent": activeSelectedEdgeDeleteAnchor.color,
              } as CSSProperties}
            >
              {selectedEdgeDeleteState.confirmationState.mode === "confirm" && selectedEdgeDeleteState.edgeId === activeSelectedEdgeDeleteAnchor.edgeId ? (
                <>
                  <button
                    aria-label="Confirm delete selected edge"
                    className="ff-edge__midpoint-delete ff-edge__midpoint-delete--confirm"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      deleteEdgeById(activeSelectedEdgeDeleteAnchor.edgeId);
                    }}
                    type="button"
                  >
                    <Check aria-hidden="true" className="ff-edge__midpoint-delete-icon" />
                  </button>
                  <button
                    aria-label="Cancel delete selected edge"
                    className="ff-edge__midpoint-delete"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      clearSelectedEdgeDeleteState();
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" className="ff-edge__midpoint-delete-icon" />
                  </button>
                </>
              ) : (
                <button
                  aria-label="Delete selected edge"
                  className="ff-edge__midpoint-delete"
                  data-testid="selected-edge-delete"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleSelectedEdgeDeleteRequest(activeSelectedEdgeDeleteAnchor.edgeId, { immediate: event.shiftKey });
                  }}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="ff-edge__midpoint-delete-icon" />
                </button>
              )}
            </div>
          </ViewportPortal>
        ) : null}
        {nodes.length === 0 ? (
          <div className="ff-canvas__empty-state">
            <p className="ff-canvas__eyebrow">Contract Canvas</p>
            <p className="ff-canvas__copy">
              Start with Aggression or Proximity, then layer scoring, filters, and Add to Queue.
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
          {contextMenu.target.kind === "canvas" || contextMenu.target.kind === "node" ? (
            <button className="ff-canvas__context-action" role="menuitem" type="button" onClick={handleAutoArrange}>
              <LayoutGrid aria-hidden="true" className="ff-canvas__context-action-icon" />
              <span>Auto-arrange contract</span>
            </button>
          ) : null}
          {contextMenu.target.kind === "node" ? (
            <button
              className="ff-canvas__context-action ff-canvas__context-action--danger"
              role="menuitem"
              type="button"
              onClick={handleDeleteFromContextMenu}
            >
              <Trash2 aria-hidden="true" className="ff-canvas__context-action-icon" />
              <span>Delete node</span>
            </button>
          ) : null}
          {contextMenu.target.kind === "edge" ? (
            <button
              className="ff-canvas__context-action ff-canvas__context-action--danger"
              role="menuitem"
              type="button"
              onClick={handleDeleteFromContextMenu}
            >
              <Trash2 aria-hidden="true" className="ff-canvas__context-action-icon" />
              <span>Delete edge</span>
            </button>
          ) : null}
        </div>
      ) : null}

      </div>
    </NodeFieldEditingContext.Provider>
  );
}

function CanvasWorkspace({
  initialContractName,
  initialNodes,
  initialEdges,
  mode,
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
        mode={mode}
        onCompilationStateChange={onCompilationStateChange}
        onTriggerCompileChange={onTriggerCompileChange}
      />
    </ReactFlowProvider>
  );
}

export default CanvasWorkspace;

function hydrateContract(name: string, nodes: readonly FlowNode[], edges: readonly FlowEdge[]) {
  const restoredFlow = restoreSavedFlow(nodes, edges);
  return {
    contract: createNamedFlowContract(name, restoredFlow.nodes, restoredFlow.edges),
    remediationNotices: restoredFlow.remediationNotices,
  } satisfies HydratedContractSnapshot;
}

function hydrateLibraryContracts(library: ContractLibrary): HydratedContractLibrarySnapshot {
  const remediationNoticesByContractName: Record<string, readonly RemediationNotice[]> = {};
  const contracts = library.contracts.map((contract) => {
    const hydratedContract = hydrateContract(contract.name, contract.nodes, contract.edges);
    remediationNoticesByContractName[contract.name] = hydratedContract.remediationNotices;

    return createNamedFlowContract(contract.name, hydratedContract.contract.nodes, hydratedContract.contract.edges, {
      id: contract.id,
      description: contract.description,
      updatedAt: contract.updatedAt,
      isSeeded: contract.isSeeded,
    });
  });

  return {
    library: {
      ...library,
      contracts,
    },
    remediationNoticesByContractName,
  };
}

function createInitialLibrarySnapshot(
  initialContractName: string,
  initialNodes: readonly FlowNode[],
  initialEdges: readonly FlowEdge[],
  mode: NonNullable<CanvasWorkspaceProps["mode"]>,
): HydratedContractLibrarySnapshot {
  const fallbackContract = createNamedFlowContract(initialContractName, initialNodes, initialEdges);

  if (mode === "preview") {
    return createPreviewLibrarySnapshot(fallbackContract);
  }

  const loadedLibrary = loadContractLibrary(
    typeof window === "undefined" ? undefined : window.localStorage,
    fallbackContract,
    seededExampleContracts,
  );

  return hydrateLibraryContracts(loadedLibrary);
}

function createPreviewLibrarySnapshot(fallbackContract: NamedFlowContract): HydratedContractLibrarySnapshot {
  const hydratedContract = hydrateContract(fallbackContract.name, fallbackContract.nodes, fallbackContract.edges);

  return {
    library: {
      version: 2,
      activeContractName: hydratedContract.contract.name,
      contracts: [hydratedContract.contract],
    },
    remediationNoticesByContractName: {
      [hydratedContract.contract.name]: hydratedContract.remediationNotices,
    },
  };
}

function withActiveContractSnapshot(
  contractLibrary: ContractLibrary,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): ContractLibrary {
  return {
    ...contractLibrary,
    contracts: contractLibrary.contracts.map((contract) =>
      contract.name === contractLibrary.activeContractName
        ? updateNamedFlowContract(contract, nodes, edges, { preserveUpdatedAt: true })
        : contract,
    ),
  };
}

function hasUnsavedCanvasChanges(contract: NamedFlowContract, nodes: readonly FlowNode[], edges: readonly FlowEdge[]): boolean {
  return JSON.stringify({ nodes, edges }) !== JSON.stringify({ nodes: contract.nodes, edges: contract.edges });
}