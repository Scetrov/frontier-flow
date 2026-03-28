import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, ReactNode, RefObject, SetStateAction } from "react";
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
import { Check, Copy, Database, Download, FileInput, LayoutGrid, Save, Trash2, Upload, X } from "lucide-react";

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
  mergeImportedContract,
  sanitizeContractName,
  saveContractLibrary,
  type ContractLibrary,
  type NamedFlowContract,
  type PublishedGraphProvenance,
  updateNamedFlowContract,
} from "../utils/contractStorage";
import { autoArrangeFlow } from "../utils/layoutFlow";
import { getEdgeColor, isValidFlowConnection } from "../utils/socketTypes";
import { loadUiState, mergeUiState } from "../utils/uiStateStorage";
import { useAutoCompile } from "../hooks/useAutoCompile";
import { useGraphTransfer, type GraphTransferState, type GraphTransferWalletBridge } from "../hooks/useGraphTransfer";
import { deriveFlowEdgePresentation } from "../utils/socketTypes";

import GraphTransferDialog from "./GraphTransferDialog";
import { restoreSavedFlow } from "./restoreSavedFlow";
import { NodeFieldEditingContext } from "../nodes/NodeFieldEditingContext";
import DrawerHandle from "./DrawerHandle";

interface CanvasWorkspaceProps {
  readonly graphTransferWalletBridge?: GraphTransferWalletBridge;
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
  readonly onRemediationNoticesChange?: (notices: readonly RemediationNotice[]) => void;
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

type SetFlowNodes = ReturnType<typeof useNodesState<FlowNode>>[1];
type SetFlowEdges = ReturnType<typeof useEdgesState<FlowEdge>>[1];

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

interface ContractDrawerProps {
  readonly activeContract: NamedFlowContract;
  readonly activeContractDescription: string;
  readonly activeRemediationNotices: readonly RemediationNotice[];
  readonly contractLibrary: ContractLibrary;
  readonly draftContractName: string;
  readonly isContractPanelOpen: boolean;
  readonly onCreateContractCopy: () => void;
  readonly onDeleteContract: () => void;
  readonly onExportContract: () => void;
  readonly onImportFromFile: () => void;
  readonly onImportFromWalrus: () => void;
  readonly onPublishContract: () => void;
  readonly onSaveAsContract: () => void;
  readonly onSelectContract: (contractName: string) => void;
  readonly onSetDraftContractName: (name: string) => void;
  readonly onTogglePanel: () => void;
  readonly walletConnected: boolean;
}

function ContractDrawerHeader() {
  return (
    <div className="ff-contract-panel__header">
      <p className="ff-contract-panel__eyebrow">Contracts</p>
      <h2 className="ff-contract-panel__title">Save / Load</h2>
      <p className="ff-contract-panel__copy">Manage local flow snapshots without taking canvas space away from the editor.</p>
    </div>
  );
}

function ContractActionButton({
  children,
  className,
  disabled,
  icon: Icon,
  onClick,
}: {
  readonly children: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly icon: typeof Save;
  readonly onClick: () => void;
}) {
  return (
    <button className={className ?? "ff-contract-bar__button"} disabled={disabled} type="button" onClick={onClick}>
      <Icon aria-hidden="true" className="ff-contract-bar__button-icon" />
      <span className="ff-contract-bar__button-label">{children}</span>
    </button>
  );
}

function ContractRemediationNoticeList({ notices }: { readonly notices: readonly RemediationNotice[] }) {
  if (notices.length === 0) {
    return null;
  }

  return (
    <div aria-live="polite" className="ff-contract-bar" role="status">
      <p className="ff-contract-bar__label">Legacy remediation required</p>
      {notices.map((notice) => (
        <p key={`${notice.nodeId}_${notice.legacyType}`} className="ff-contract-bar__meta">
          {notice.message} {notice.suggestedAction}
        </p>
      ))}
    </div>
  );
}

function ContractDrawerControls({
  activeContract,
  activeContractDescription,
  contractLibrary,
  draftContractName,
  onCreateContractCopy,
  onDeleteContract,
  onExportContract,
  onImportFromFile,
  onImportFromWalrus,
  onPublishContract,
  onSaveAsContract,
  onSelectContract,
  onSetDraftContractName,
  walletConnected,
}: Omit<ContractDrawerProps, "activeRemediationNotices" | "isContractPanelOpen" | "onTogglePanel">) {
  return (
    <div className="ff-contract-bar">
      <label className="ff-contract-bar__field">
        <span className="ff-contract-bar__label">Saved Contract</span>
        <select
          aria-label="Saved contract"
          className="ff-contract-bar__input"
          id="saved-contract"
          name="saved-contract"
          value={contractLibrary.activeContractName}
          onChange={(event) => {
            onSelectContract(event.target.value);
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
          id="contract-name"
          name="contract-name"
          type="text"
          value={draftContractName}
          onChange={(event) => {
            onSetDraftContractName(event.target.value);
          }}
        />
      </label>

      <div className="ff-contract-bar__actions">
        <ContractActionButton icon={Save} onClick={onSaveAsContract}>
          Save
        </ContractActionButton>
        <ContractActionButton icon={Copy} onClick={onCreateContractCopy}>
          Save Copy
        </ContractActionButton>
        <ContractActionButton
          className="ff-contract-bar__button ff-contract-bar__button--danger"
          disabled={contractLibrary.contracts.length <= 1}
          icon={Trash2}
          onClick={onDeleteContract}
        >
          Delete
        </ContractActionButton>
      </div>

      <div className="ff-contract-bar__transfer">
        <p className="ff-contract-bar__label">Transfer</p>
        <div className="ff-contract-bar__actions">
          <ContractActionButton icon={FileInput} onClick={onImportFromFile}>
            Import YAML
          </ContractActionButton>
          <ContractActionButton icon={Database} onClick={onImportFromWalrus}>
            Import Walrus
          </ContractActionButton>
          <ContractActionButton icon={Download} onClick={onExportContract}>
            Export YAML
          </ContractActionButton>
          <ContractActionButton disabled={!walletConnected} icon={Upload} onClick={onPublishContract}>
            Export Walrus
          </ContractActionButton>
        </div>
      </div>

      <p className="ff-contract-bar__meta">Nodes, edges, and positions auto-save locally for the active contract.</p>
    </div>
  );
}

function ContractDrawer({
  activeContract,
  activeContractDescription,
  activeRemediationNotices,
  contractLibrary,
  draftContractName,
  isContractPanelOpen,
  onCreateContractCopy,
  onDeleteContract,
  onExportContract,
  onImportFromFile,
  onImportFromWalrus,
  onPublishContract,
  onSaveAsContract,
  onSelectContract,
  onSetDraftContractName,
  onTogglePanel,
  walletConnected,
}: ContractDrawerProps) {
  return (
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
          <ContractDrawerHeader />
          <ContractRemediationNoticeList notices={activeRemediationNotices} />
          <ContractDrawerControls
            activeContract={activeContract}
            activeContractDescription={activeContractDescription}
            contractLibrary={contractLibrary}
            draftContractName={draftContractName}
            onCreateContractCopy={onCreateContractCopy}
            onDeleteContract={onDeleteContract}
            onExportContract={onExportContract}
            onImportFromFile={onImportFromFile}
            onImportFromWalrus={onImportFromWalrus}
            onPublishContract={onPublishContract}
            onSaveAsContract={onSaveAsContract}
            onSelectContract={onSelectContract}
            onSetDraftContractName={onSetDraftContractName}
            walletConnected={walletConnected}
          />
        </aside>

        <DrawerHandle
          closeLabel="Close saved contract controls"
          controls="saved-contract-controls"
          drawerLabel="Contracts"
          expanded={isContractPanelOpen}
          onClick={onTogglePanel}
          openLabel="Open saved contract controls"
          side="left"
        />
      </div>
    </div>
  );
}

function stopEdgeDeleteEvent(event: ReactMouseEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

interface SelectedEdgeDeleteControlsProps {
  readonly activeSelectedEdgeDeleteAnchor: SelectedEdgeDeleteAnchor | null;
  readonly clearSelectedEdgeDeleteState: () => void;
  readonly deleteEdgeById: (edgeId: string) => void;
  readonly handleSelectedEdgeDeleteRequest: (edgeId: string, options?: { readonly immediate?: boolean }) => void;
  readonly selectedEdgeDeleteState: SelectedEdgeDeleteState;
  readonly selectedTarget: CanvasSelectionTarget;
}

function SelectedEdgeDeleteControls({
  activeSelectedEdgeDeleteAnchor,
  clearSelectedEdgeDeleteState,
  deleteEdgeById,
  handleSelectedEdgeDeleteRequest,
  selectedEdgeDeleteState,
  selectedTarget,
}: SelectedEdgeDeleteControlsProps) {
  if (
    selectedTarget.kind !== "edge"
    || selectedTarget.targetId === null
    || activeSelectedEdgeDeleteAnchor === null
    || activeSelectedEdgeDeleteAnchor.edgeId !== selectedTarget.targetId
  ) {
    return null;
  }

  return (
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
              onMouseDown={stopEdgeDeleteEvent}
              onPointerDown={stopEdgeDeleteEvent}
              onClick={(event) => {
                stopEdgeDeleteEvent(event);
                deleteEdgeById(activeSelectedEdgeDeleteAnchor.edgeId);
              }}
              type="button"
            >
              <Check aria-hidden="true" className="ff-edge__midpoint-delete-icon" />
            </button>
            <button
              aria-label="Cancel delete selected edge"
              className="ff-edge__midpoint-delete"
              onMouseDown={stopEdgeDeleteEvent}
              onPointerDown={stopEdgeDeleteEvent}
              onClick={(event) => {
                stopEdgeDeleteEvent(event);
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
            onMouseDown={stopEdgeDeleteEvent}
            onPointerDown={stopEdgeDeleteEvent}
            onClick={(event) => {
              stopEdgeDeleteEvent(event);
              handleSelectedEdgeDeleteRequest(activeSelectedEdgeDeleteAnchor.edgeId, { immediate: event.shiftKey });
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" className="ff-edge__midpoint-delete-icon" />
          </button>
        )}
      </div>
    </ViewportPortal>
  );
}

interface CanvasContextMenuProps {
  readonly contextMenu: ContextMenuState | null;
  readonly contextMenuRef: React.RefObject<HTMLDivElement | null>;
  readonly onAutoArrange: () => void;
  readonly onDeleteFromContextMenu: () => void;
}

function CanvasContextMenu({ contextMenu, contextMenuRef, onAutoArrange, onDeleteFromContextMenu }: CanvasContextMenuProps) {
  if (contextMenu === null) {
    return null;
  }

  return (
    <div
      ref={contextMenuRef}
      aria-label="Canvas context menu"
      className="ff-canvas__context-menu"
      role="menu"
      style={{ left: `${String(contextMenu.x)}px`, top: `${String(contextMenu.y)}px` }}
    >
      {contextMenu.target.kind === "canvas" || contextMenu.target.kind === "node" ? (
        <button className="ff-canvas__context-action" role="menuitem" type="button" onClick={onAutoArrange}>
          <LayoutGrid aria-hidden="true" className="ff-canvas__context-action-icon" />
          <span>Auto-arrange contract</span>
        </button>
      ) : null}
      {contextMenu.target.kind === "node" ? (
        <button
          className="ff-canvas__context-action ff-canvas__context-action--danger"
          role="menuitem"
          type="button"
          onClick={onDeleteFromContextMenu}
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
          onClick={onDeleteFromContextMenu}
        >
          <Trash2 aria-hidden="true" className="ff-canvas__context-action-icon" />
          <span>Delete edge</span>
        </button>
      ) : null}
    </div>
  );
}

function getActiveContractDescription(activeContract: NamedFlowContract): string {
  if (activeContract.description !== undefined) {
    return activeContract.description;
  }

  if (activeContract.isSeeded) {
    return "Curated example contract.";
  }

  if (activeContract.walrusProvenance !== undefined) {
    return `Local contract snapshot · Walrus ${activeContract.walrusProvenance.blobId}`;
  }

  return "Local contract snapshot.";
}

function useInitialLibrarySnapshot({
  initialContractName = "Starter Contract",
  initialEdges = [],
  initialNodes = [],
  mode = "persistent",
}: CanvasWorkspaceProps): HydratedContractLibrarySnapshot {
  return useMemo(
    () => createInitialLibrarySnapshot(initialContractName, initialNodes, initialEdges, mode),
    [initialContractName, initialEdges, initialNodes, mode],
  );
}

function useCanvasViewportState(mode: NonNullable<CanvasWorkspaceProps["mode"]>) {
  const [isDesktop, setIsDesktop] = useState(getIsDesktop);
  const [isContractPanelOpen, setIsContractPanelOpen] = useState(
    () => (mode === "persistent" ? loadUiState(typeof window === "undefined" ? undefined : window.localStorage).isContractPanelOpen : false),
  );

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
    if (mode === "persistent") {
      mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, { isContractPanelOpen });
    }
  }, [isContractPanelOpen, mode]);

  return { isDesktop, isContractPanelOpen, setIsContractPanelOpen };
}

type UseContractManagerOptions = {
  readonly initialLibrarySnapshot: HydratedContractLibrarySnapshot;
  readonly mode: NonNullable<CanvasWorkspaceProps["mode"]>;
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly reactFlow: ReturnType<typeof useReactFlow<FlowNode, FlowEdge>>;
  readonly setEdges: SetFlowEdges;
  readonly setNodes: SetFlowNodes;
};

function useContractManager({
  initialLibrarySnapshot,
  mode,
  nodes,
  edges,
  reactFlow,
  setEdges,
  setNodes,
}: UseContractManagerOptions) {
  const [contractLibrary, setContractLibrary] = useState<ContractLibrary>(() => initialLibrarySnapshot.library);
  const [contractRemediationNotices, setContractRemediationNotices] = useState<Readonly<Record<string, readonly RemediationNotice[]>>>(() => initialLibrarySnapshot.remediationNoticesByContractName);
  const activeContract = contractLibrary.contracts.find((contract) => contract.name === contractLibrary.activeContractName) ?? contractLibrary.contracts[0];
  const activeRemediationNotices = contractRemediationNotices[contractLibrary.activeContractName] ?? [];
  const activeContractDescription = getActiveContractDescription(activeContract);
  const [draftContractName, setDraftContractName] = useState(activeContract.name);
  const handleSelectContract = useCallback((contractName: string) => {
    const currentContractSnapshot = contractLibrary.contracts.find((contract) => contract.name === contractLibrary.activeContractName);
    if (
      contractName !== contractLibrary.activeContractName
      && currentContractSnapshot !== undefined
      && hasUnsavedCanvasChanges(currentContractSnapshot, nodes, edges)
      && typeof window !== "undefined"
      && !window.confirm("Replace the current unsaved canvas changes with the selected contract?")
    ) {
      return;
    }

    const nextContract = withActiveContractSnapshot(contractLibrary, nodes, edges).contracts.find((contract) => contract.name === contractName);
    if (nextContract === undefined) {
      return;
    }

    setContractLibrary((currentLibrary) => ({ ...withActiveContractSnapshot(currentLibrary, nodes, edges), activeContractName: contractName }));
    setDraftContractName(contractName);
    setNodes(nextContract.nodes);
    setEdges(nextContract.edges);
    requestAnimationFrame(() => {
      void reactFlow.fitView({ duration: 200, padding: 0.24 });
    });
  }, [contractLibrary, edges, nodes, reactFlow, setEdges, setNodes]);
  const handleSaveAsContract = useCallback(() => {
    const normalizedName = sanitizeContractName(draftContractName);
    setContractLibrary((currentLibrary) => {
      const synchronizedLibrary = withActiveContractSnapshot(currentLibrary, nodes, edges);
      const contractIndex = synchronizedLibrary.contracts.findIndex((contract) => contract.name === normalizedName);
      const nextContract = contractIndex === -1
        ? createNamedFlowContract(normalizedName, nodes, edges)
        : updateNamedFlowContract(synchronizedLibrary.contracts[contractIndex], nodes, edges);

      return contractIndex === -1
        ? { ...synchronizedLibrary, activeContractName: normalizedName, contracts: synchronizedLibrary.contracts.concat(nextContract) }
        : {
            ...synchronizedLibrary,
            activeContractName: normalizedName,
            contracts: synchronizedLibrary.contracts.map((contract, index) => (index === contractIndex ? nextContract : contract)),
          };
    });
    setDraftContractName(normalizedName);
    setContractRemediationNotices((currentNotices) => ({ ...currentNotices, [normalizedName]: [] }));
  }, [draftContractName, edges, nodes]);
  const handleCreateContractCopy = useCallback(() => {
    const uniqueName = createUniqueContractName(draftContractName, contractLibrary.contracts.map((contract) => contract.name));
    const nextContract = createNamedFlowContract(uniqueName, nodes, edges);
    setContractLibrary((currentLibrary) => {
      const synchronizedLibrary = withActiveContractSnapshot(currentLibrary, nodes, edges);
      return { ...synchronizedLibrary, activeContractName: uniqueName, contracts: synchronizedLibrary.contracts.concat(nextContract) };
    });
    setDraftContractName(uniqueName);
    setContractRemediationNotices((currentNotices) => ({ ...currentNotices, [uniqueName]: [] }));
  }, [contractLibrary.contracts, draftContractName, edges, nodes]);
  const handleDeleteContract = useCallback(() => {
    if (contractLibrary.contracts.length <= 1) {
      return;
    }

    const synchronizedLibrary = withActiveContractSnapshot(contractLibrary, nodes, edges);
    const nextContracts = synchronizedLibrary.contracts.filter((contract) => contract.name !== synchronizedLibrary.activeContractName);
    const nextActiveContract = nextContracts[0];
    setContractLibrary(() => ({ ...synchronizedLibrary, activeContractName: nextActiveContract.name, contracts: nextContracts }));
    setContractRemediationNotices((currentNotices) => Object.fromEntries(
      Object.entries(currentNotices).filter(([contractName]) => contractName !== synchronizedLibrary.activeContractName),
    ));
    setDraftContractName(nextActiveContract.name);
    setNodes(nextActiveContract.nodes);
    setEdges(nextActiveContract.edges);
  }, [contractLibrary, edges, nodes, setEdges, setNodes]);
  const handleImportContract = useCallback((importedContract: NamedFlowContract) => {
    const hydratedImported = hydrateContract(importedContract);
    const synchronizedLibrary = withActiveContractSnapshot(contractLibrary, nodes, edges);
    const currentContractSnapshot = synchronizedLibrary.contracts.find((contract) => contract.name === synchronizedLibrary.activeContractName);
    const shouldActivateImportedContract = currentContractSnapshot === undefined
      || !hasUnsavedCanvasChanges(currentContractSnapshot, nodes, edges)
      || typeof window === "undefined"
      || window.confirm("Replace the current canvas with the imported contract?");
    const merged = mergeImportedContract({
      activateImportedContract: shouldActivateImportedContract,
      importedContract: hydratedImported.contract,
      library: synchronizedLibrary,
    });

    setContractLibrary(merged.library);
    setContractRemediationNotices((currentNotices) => ({
      ...currentNotices,
      [merged.importedContractName]: hydratedImported.remediationNotices,
    }));

    if (shouldActivateImportedContract) {
      setDraftContractName(merged.importedContractName);
      setNodes(merged.importedContract.nodes);
      setEdges(merged.importedContract.edges);
      requestAnimationFrame(() => {
        void reactFlow.fitView({ duration: 200, padding: 0.24 });
      });
    }

    return {
      importedName: merged.importedContractName,
      originalImportedName: merged.originalImportedContractName,
    };
  }, [contractLibrary, edges, nodes, reactFlow, setEdges, setNodes]);
  const handleAttachWalrusProvenance = useCallback((provenance: PublishedGraphProvenance) => {
    setContractLibrary((currentLibrary) => {
      const synchronizedLibrary = withActiveContractSnapshot(currentLibrary, nodes, edges);

      return {
        ...synchronizedLibrary,
        contracts: synchronizedLibrary.contracts.map((contract) =>
          contract.name === synchronizedLibrary.activeContractName
            ? updateNamedFlowContract(contract, nodes, edges, { preserveUpdatedAt: true, walrusProvenance: provenance })
            : contract
        ),
      };
    });
  }, [edges, nodes]);
  useEffect(() => {
    if (mode === "persistent") {
      saveContractLibrary(typeof window === "undefined" ? undefined : window.localStorage, withActiveContractSnapshot(contractLibrary, nodes, edges));
    }
  }, [contractLibrary, edges, mode, nodes]);
  useEffect(() => {
    if (mode !== "persistent") {
      return;
    }

    mergeUiState(typeof window === "undefined" ? undefined : window.localStorage, {
      currentDraftContractName: draftContractName,
    });
  }, [draftContractName, mode]);
  return {
    activeContract,
    activeContractDescription,
    activeRemediationNotices,
    contractLibrary,
    draftContractName,
    handleAttachWalrusProvenance,
    handleCreateContractCopy,
    handleDeleteContract,
    handleImportContract,
    handleSaveAsContract,
    handleSelectContract,
    setContractRemediationNotices,
    setDraftContractName,
  };
}

function useDeleteConfirmationEffects({
  clearNodeDeleteState,
  clearSelectedEdgeDeleteState,
  deleteConfirmationTimersRef,
  edgeDeleteConfirmationTimerRef,
  nodeDeleteStates,
  selectedEdgeDeleteState,
}: {
  readonly clearNodeDeleteState: (nodeId: string) => void;
  readonly clearSelectedEdgeDeleteState: () => void;
  readonly deleteConfirmationTimersRef: RefObject<Map<string, number>>;
  readonly edgeDeleteConfirmationTimerRef: RefObject<number | null>;
  readonly nodeDeleteStates: Readonly<Record<string, DeleteConfirmationState>>;
  readonly selectedEdgeDeleteState: SelectedEdgeDeleteState;
}) {
  useEffect(() => {
    const timerMap = deleteConfirmationTimersRef.current;
    const activeConfirmations = new Set<string>();
    for (const [nodeId, state] of Object.entries(nodeDeleteStates)) {
      if (state.mode === "confirm") {
        activeConfirmations.add(nodeId);
        if (!timerMap.has(nodeId)) {
          timerMap.set(nodeId, window.setTimeout(() => { clearNodeDeleteState(nodeId); timerMap.delete(nodeId); }, deleteConfirmationTimeoutMs));
        }
      }
    }

    for (const [nodeId, timeoutId] of timerMap.entries()) {
      if (!activeConfirmations.has(nodeId)) {
        window.clearTimeout(timeoutId);
        timerMap.delete(nodeId);
      }
    }
  }, [clearNodeDeleteState, deleteConfirmationTimersRef, nodeDeleteStates]);

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

    edgeDeleteConfirmationTimerRef.current = window.setTimeout(() => { clearSelectedEdgeDeleteState(); edgeDeleteConfirmationTimerRef.current = null; }, deleteConfirmationTimeoutMs);
    return () => {
      if (edgeDeleteConfirmationTimerRef.current !== null) {
        window.clearTimeout(edgeDeleteConfirmationTimerRef.current);
        edgeDeleteConfirmationTimerRef.current = null;
      }
    };
  }, [clearSelectedEdgeDeleteState, edgeDeleteConfirmationTimerRef, selectedEdgeDeleteState]);

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
  }, [deleteConfirmationTimersRef, edgeDeleteConfirmationTimerRef]);
}

function useDeleteManager({ setEdges, setNodes }: { readonly setEdges: SetFlowEdges; readonly setNodes: SetFlowNodes }) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [nodeDeleteStates, setNodeDeleteStates] = useState<Readonly<Record<string, DeleteConfirmationState>>>({});
  const [selectedEdgeDeleteAnchor, setSelectedEdgeDeleteAnchor] = useState<SelectedEdgeDeleteAnchor | null>(null);
  const [selectedEdgeDeleteState, setSelectedEdgeDeleteState] = useState<SelectedEdgeDeleteState>({ edgeId: null, confirmationState: idleDeleteConfirmationState });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmationTimersRef = useRef(new Map<string, number>());
  const edgeDeleteConfirmationTimerRef = useRef<number | null>(null);
  const clearNodeDeleteState = useCallback((nodeId: string) => {
    setNodeDeleteStates((currentStates) => nodeId in currentStates
      ? Object.fromEntries(Object.entries(currentStates).filter(([candidateNodeId]) => candidateNodeId !== nodeId))
      : currentStates);
  }, []);
  const deleteNodeById = useCallback((nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    clearNodeDeleteState(nodeId);
    setContextMenu((currentMenu) => currentMenu?.target.kind === "node" && currentMenu.target.targetId === nodeId ? null : currentMenu);
  }, [clearNodeDeleteState, setEdges, setNodes]);
  const deleteEdgeById = useCallback((edgeId: string) => {
    setSelectedEdgeDeleteAnchor((currentAnchor) => (currentAnchor?.edgeId === edgeId ? null : currentAnchor));
    setSelectedEdgeDeleteState((currentState) => currentState.edgeId === edgeId ? { edgeId: null, confirmationState: idleDeleteConfirmationState } : currentState);
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId));
    setContextMenu((currentMenu) => currentMenu?.target.kind === "edge" && currentMenu.target.targetId === edgeId ? null : currentMenu);
  }, [setEdges]);
  const clearSelectedEdgeDeleteState = useCallback(() => {
    setSelectedEdgeDeleteState((currentState) => currentState.confirmationState.mode === "idle" && currentState.edgeId === null
      ? currentState
      : { edgeId: null, confirmationState: idleDeleteConfirmationState });
  }, []);
  const handleSelectedEdgeDeleteRequest = useCallback((edgeId: string, options?: { readonly immediate?: boolean }) => {
    if (options?.immediate === true) {
      deleteEdgeById(edgeId);
      return;
    }

    setSelectedEdgeDeleteState({ edgeId, confirmationState: { mode: "confirm", startedAt: Date.now() } });
  }, [deleteEdgeById]);
  const handleNodeDeleteRequest = useCallback((nodeId: string, options?: { readonly immediate?: boolean }) => {
    if (options?.immediate === true) {
      deleteNodeById(nodeId);
      return;
    }

    const existingTimeoutId = deleteConfirmationTimersRef.current.get(nodeId);
    if (existingTimeoutId !== undefined) {
      window.clearTimeout(existingTimeoutId);
      deleteConfirmationTimersRef.current.delete(nodeId);
    }

    setNodeDeleteStates((currentStates) => ({ ...currentStates, [nodeId]: { mode: "confirm", startedAt: Date.now() } }));
  }, [deleteNodeById]);
  useDeleteConfirmationEffects({
    clearNodeDeleteState,
    clearSelectedEdgeDeleteState,
    deleteConfirmationTimersRef,
    edgeDeleteConfirmationTimerRef,
    nodeDeleteStates,
    selectedEdgeDeleteState,
  });

  return {
    clearNodeDeleteState,
    clearSelectedEdgeDeleteState,
    contextMenu,
    contextMenuRef,
    deleteEdgeById,
    deleteNodeById,
    handleNodeDeleteRequest,
    handleSelectedEdgeDeleteRequest,
    nodeDeleteStates,
    selectedEdgeDeleteAnchor,
    selectedEdgeDeleteState,
    setContextMenu,
    setSelectedEdgeDeleteAnchor,
  };
}

function useCanvasCompilationState({
  draftContractName,
  edges,
  handleNodeDeleteRequest,
  nodes,
  nodeDeleteStates,
  onCompilationStateChange,
  clearNodeDeleteState,
  deleteNodeById,
  setNodes,
}: {
  readonly draftContractName: string;
  readonly edges: readonly FlowEdge[];
  readonly handleNodeDeleteRequest: (nodeId: string, options?: { readonly immediate?: boolean }) => void;
  readonly nodes: readonly FlowNode[];
  readonly nodeDeleteStates: Readonly<Record<string, DeleteConfirmationState>>;
  readonly onCompilationStateChange?: CanvasWorkspaceProps["onCompilationStateChange"];
  readonly clearNodeDeleteState: (nodeId: string) => void;
  readonly deleteNodeById: (nodeId: string) => void;
  readonly setNodes: SetFlowNodes;
}) {
  const idleMsOverride = getIdleMsOverride();
  const compilation = useAutoCompile(nodes, edges, draftContractName, idleMsOverride);
  const diagnosticsByNodeId = useMemo(() => {
    const nextDiagnosticsByNodeId = new Map<string, readonly CompilerDiagnostic[]>();
    for (const diagnostic of compilation.diagnostics) {
      if (diagnostic.reactFlowNodeId !== null) {
        const currentDiagnostics = nextDiagnosticsByNodeId.get(diagnostic.reactFlowNodeId) ?? [];
        nextDiagnosticsByNodeId.set(diagnostic.reactFlowNodeId, currentDiagnostics.concat(diagnostic));
      }
    }
    return nextDiagnosticsByNodeId;
  }, [compilation.diagnostics]);
  const handleNodeFieldsChange = useCallback((nodeId: string, fields: NodeFieldMap) => {
    setNodes((currentNodes) => currentNodes.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, fields } } : node));
  }, [setNodes]);
  const renderedNodes = useMemo(() => nodes.map((node) => {
    const nodeDiagnostics = diagnosticsByNodeId.get(node.id) ?? [];
    const validationState: FlowNode["data"]["validationState"] = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? "error"
      : nodeDiagnostics.some((diagnostic) => diagnostic.severity === "warning") ? "warning" : undefined;

    return {
      ...node,
      data: {
        ...node.data,
        deleteConfirmationState: nodeDeleteStates[node.id] ?? idleDeleteConfirmationState,
        diagnosticMessages: nodeDiagnostics.map((diagnostic) => diagnostic.userMessage),
        onDeleteCancel: () => { clearNodeDeleteState(node.id); },
        onDeleteConfirm: () => { deleteNodeById(node.id); },
        onDeleteRequest: (options?: { readonly immediate?: boolean }) => { handleNodeDeleteRequest(node.id, options); },
        validationState,
      },
    };
  }), [clearNodeDeleteState, deleteNodeById, diagnosticsByNodeId, handleNodeDeleteRequest, nodeDeleteStates, nodes]);

  useEffect(() => {
    onCompilationStateChange?.(compilation.status, compilation.diagnostics, compilation.sourceCode, compilation.artifact?.moveSource ?? null);
  }, [compilation.artifact, compilation.diagnostics, compilation.sourceCode, compilation.status, onCompilationStateChange]);

  return { compilation, handleNodeFieldsChange, renderedNodes };
}

function useCanvasSelectionState({
  edges,
  nodes,
  selectedEdgeDeleteAnchor,
  setEdges,
  setNodes,
}: {
  readonly edges: readonly FlowEdge[];
  readonly nodes: readonly FlowNode[];
  readonly selectedEdgeDeleteAnchor: SelectedEdgeDeleteAnchor | null;
  readonly setEdges: SetFlowEdges;
  readonly setNodes: SetFlowNodes;
}) {
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
    const fallbackColor = typeof edge.style?.stroke === "string" ? edge.style.stroke : getEdgeColor(sourceNode, edge.sourceHandle ?? null);
    return { edgeId: edge.id, x: fallbackAnchor.x, y: fallbackAnchor.y, color: fallbackColor } satisfies SelectedEdgeDeleteAnchor;
  }, [edges, nodes, selectedTarget]);
  const activeSelectedEdgeDeleteAnchor = useMemo(() => {
    if (selectedTarget.kind !== "edge" || selectedTarget.targetId === null) {
      return null;
    }

    if (selectedEdgeDeleteAnchor?.edgeId === selectedTarget.targetId) {
      return selectedEdgeDeleteAnchor;
    }

    return fallbackSelectedEdgeDeleteAnchor?.edgeId === selectedTarget.targetId ? fallbackSelectedEdgeDeleteAnchor : null;
  }, [fallbackSelectedEdgeDeleteAnchor, selectedEdgeDeleteAnchor, selectedTarget]);
  const selectTarget = useCallback((target: CanvasContextMenuTarget) => {
    setNodes((currentNodes) => currentNodes.map((node) => {
      const selected = target.kind === "node" && target.targetId === node.id;
      return node.selected === selected ? node : { ...node, selected };
    }));
    setEdges((currentEdges) => currentEdges.map((edge) => {
      const selected = target.kind === "edge" && target.targetId === edge.id;
      return edge.selected === selected ? edge : { ...edge, selected };
    }));
  }, [setEdges, setNodes]);

  return { activeSelectedEdgeDeleteAnchor, selectedTarget, selectTarget };
}

type UseCanvasInteractionsOptions = {
  readonly deleteEdgeById: (edgeId: string) => void;
  readonly deleteNodeById: (nodeId: string) => void;
  readonly edges: readonly FlowEdge[];
  readonly nodes: readonly FlowNode[];
  readonly reactFlow: ReturnType<typeof useReactFlow<FlowNode, FlowEdge>>;
  readonly selectTarget: (target: CanvasContextMenuTarget) => void;
  readonly setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  readonly setEdges: SetFlowEdges;
  readonly setNodes: SetFlowNodes;
};

function useCanvasInteractions({
  deleteEdgeById,
  deleteNodeById,
  edges,
  nodes,
  reactFlow,
  selectTarget,
  setContextMenu,
  setEdges,
  setNodes,
}: UseCanvasInteractionsOptions) {
  const nodeCounterRef = useRef(0);
  const handleDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  const handleDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setContextMenu(null);
    const type = event.dataTransfer.getData("application/reactflow");
    const definition = getNodeDefinition(type);
    if (definition === undefined) {
      return;
    }

    nodeCounterRef.current += 1;
    const [rawX = "0", rawY = "0"] = event.dataTransfer.getData("application/x-offset").split(",");
    const position = reactFlow.screenToFlowPosition({ x: event.clientX - Number(rawX || 0), y: event.clientY - Number(rawY || 0) });
    setNodes((currentNodes) => currentNodes.concat({
      id: ["dnd", String(nodeCounterRef.current), String(Date.now())].join("_"),
      type: definition.type,
      position,
      data: createFlowNodeData(definition),
    } satisfies FlowNode));
  }, [reactFlow, setContextMenu, setNodes]);
  const handleConnect = useCallback((connection: Connection) => {
    if (!isValidFlowConnection(connection, nodes, edges)) {
      return;
    }

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const edgePresentation = deriveFlowEdgePresentation({
      ...connection,
      id: [connection.source, connection.sourceHandle ?? "source", connection.target, connection.targetHandle ?? "target", String(Date.now())].join("__"),
      source: connection.source,
      target: connection.target,
    } as FlowEdge, nodesById);
    setContextMenu(null);
    setEdges((currentEdges) => addEdge({ ...connection, ...edgePresentation }, currentEdges));
  }, [edges, nodes, setContextMenu, setEdges]);
  const handlePaneContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const target = { kind: "canvas", targetId: null } satisfies CanvasContextMenuTarget;
    selectTarget(target);
    setContextMenu({ x: event.clientX, y: event.clientY, target });
  }, [selectTarget, setContextMenu]);
  const handleNodeContextMenu = useCallback((event: ReactMouseEvent, node: FlowNode) => {
    event.preventDefault();
    event.stopPropagation();
    const target = { kind: "node", targetId: node.id } satisfies CanvasContextMenuTarget;
    selectTarget(target);
    setContextMenu({ x: event.clientX, y: event.clientY, target });
  }, [selectTarget, setContextMenu]);
  const handleEdgeContextMenu = useCallback((event: ReactMouseEvent, edge: FlowEdge) => {
    event.preventDefault();
    event.stopPropagation();
    const target = { kind: "edge", targetId: edge.id } satisfies CanvasContextMenuTarget;
    selectTarget(target);
    setContextMenu({ x: event.clientX, y: event.clientY, target });
  }, [selectTarget, setContextMenu]);
  const handleAutoArrange = useCallback(() => {
    setNodes((currentNodes) => autoArrangeFlow(currentNodes, edges));
    setContextMenu(null);
    requestAnimationFrame(() => { void reactFlow.fitView({ duration: 240, padding: 0.24 }); });
  }, [edges, reactFlow, setContextMenu, setNodes]);
  const handleDeleteFromContextMenu = useCallback((contextMenu: ContextMenuState | null) => {
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
  }, [deleteEdgeById, deleteNodeById, setContextMenu]);
  const validateConnection = useCallback((connection: Connection | Edge) => isValidFlowConnection({
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? null,
    targetHandle: connection.targetHandle ?? null,
  }, nodes, edges), [edges, nodes]);
  return { handleAutoArrange, handleConnect, handleDeleteFromContextMenu, handleDragOver, handleDrop, handleEdgeContextMenu, handleNodeContextMenu, handlePaneContextMenu, validateConnection };
}

type UseFlowEditorEffectsOptions = {
  readonly contextMenu: ContextMenuState | null;
  readonly contextMenuRef: RefObject<HTMLDivElement | null>;
  readonly deleteEdgeById: (edgeId: string) => void;
  readonly deleteNodeById: (nodeId: string) => void;
  readonly edges: readonly FlowEdge[];
  readonly fallbackSelectedEdgeDeleteAnchor: SelectedEdgeDeleteAnchor | null;
  readonly focusedDiagnosticNodeId?: string | null;
  readonly focusedDiagnosticRequestKey?: number;
  readonly nodes: readonly FlowNode[];
  readonly reactFlow: ReturnType<typeof useReactFlow<FlowNode, FlowEdge>>;
  readonly selectedTarget: CanvasSelectionTarget;
  readonly setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  readonly setSelectedEdgeDeleteAnchor: Dispatch<SetStateAction<SelectedEdgeDeleteAnchor | null>>;
};

function useFlowEditorEffects({
  contextMenu,
  contextMenuRef,
  deleteEdgeById,
  deleteNodeById,
  edges,
  fallbackSelectedEdgeDeleteAnchor,
  focusedDiagnosticNodeId,
  focusedDiagnosticRequestKey,
  nodes,
  reactFlow,
  selectedTarget,
  setContextMenu,
  setSelectedEdgeDeleteAnchor,
}: UseFlowEditorEffectsOptions) {
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
      if (edgePath !== null && typeof edgePath.getTotalLength === "function" && typeof edgePath.getPointAtLength === "function") {
        const midpoint = edgePath.getPointAtLength(edgePath.getTotalLength() / 2);
        const computedStroke = typeof window === "undefined" ? "" : window.getComputedStyle(edgePath).stroke;
        setSelectedEdgeDeleteAnchor({ edgeId: edge.id, x: midpoint.x, y: midpoint.y, color: computedStroke || fallbackColor });
      }
    };

    if (typeof window === "undefined") {
      updateAnchor();
      return;
    }

    const frameId = window.requestAnimationFrame(updateAnchor);
    return () => { window.cancelAnimationFrame(frameId); };
  }, [edges, fallbackSelectedEdgeDeleteAnchor, nodes, selectedTarget, setSelectedEdgeDeleteAnchor]);
  useEffect(() => {
    if (focusedDiagnosticNodeId === null || focusedDiagnosticNodeId === undefined) {
      return;
    }

    const targetNode = nodes.find((node) => node.id === focusedDiagnosticNodeId);
    if (targetNode !== undefined) {
      void reactFlow.setCenter(targetNode.position.x + 120, targetNode.position.y + 80, { duration: 180, zoom: 1 });
    }
  }, [focusedDiagnosticNodeId, focusedDiagnosticRequestKey, nodes, reactFlow]);
  useEffect(() => {
    if (contextMenu === null) {
      return undefined;
    }

    const handleWindowPointerDown = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        setContextMenu(null);
      }
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
  }, [contextMenu, contextMenuRef, setContextMenu]);
  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "Delete" && event.key !== "Backspace") || isTextEntryElement(event.target)) {
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
}

interface FlowEditorViewProps {
  readonly activeContract: NamedFlowContract;
  readonly activeContractDescription: string;
  readonly activeRemediationNotices: readonly RemediationNotice[];
  readonly activeSelectedEdgeDeleteAnchor: SelectedEdgeDeleteAnchor | null;
  readonly clearSelectedEdgeDeleteState: () => void;
  readonly compilationHandleNodeFieldsChange: (nodeId: string, fields: NodeFieldMap) => void;
  readonly contextMenu: ContextMenuState | null;
  readonly contextMenuRef: RefObject<HTMLDivElement | null>;
  readonly contractLibrary: ContractLibrary;
  readonly deleteEdgeById: (edgeId: string) => void;
  readonly draftContractName: string;
  readonly edges: readonly FlowEdge[];
  readonly graphTransferState: GraphTransferState;
  readonly handleAutoArrange: () => void;
  readonly handleConnect: (connection: Connection) => void;
  readonly handleCreateContractCopy: () => void;
  readonly handleDeleteContract: () => void;
  readonly handleDeleteFromContextMenu: () => void;
  readonly handleDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  readonly handleDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  readonly handleEdgeContextMenu: (event: ReactMouseEvent, edge: FlowEdge) => void;
  readonly handleExportContract: () => void;
  readonly handleImportFromFile: () => void;
  readonly handleImportFromWalrus: () => void;
  readonly handleNodeContextMenu: (event: ReactMouseEvent, node: FlowNode) => void;
  readonly handlePaneContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  readonly handlePublishContract: () => void;
  readonly handleSaveAsContract: () => void;
  readonly handleSelectContract: (contractName: string) => void;
  readonly handleSelectedEdgeDeleteRequest: (edgeId: string, options?: { readonly immediate?: boolean }) => void;
  readonly initialMode: NonNullable<CanvasWorkspaceProps["mode"]>;
  readonly isContractPanelOpen: boolean;
  readonly isDesktop: boolean;
  readonly nodes: readonly FlowNode[];
  readonly onEdgesChange: ReturnType<typeof useEdgesState<FlowEdge>>[2];
  readonly onNodesChange: ReturnType<typeof useNodesState<FlowNode>>[2];
  readonly renderedNodes: readonly FlowNode[];
  readonly selectedEdgeDeleteState: SelectedEdgeDeleteState;
  readonly selectedTarget: CanvasSelectionTarget;
  readonly setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  readonly setDraftContractName: (name: string) => void;
  readonly setIsContractPanelOpen: Dispatch<SetStateAction<boolean>>;
  readonly transferDialog: ReactNode;
  readonly validateConnection: (connection: Connection | Edge) => boolean;
  readonly walletConnected: boolean;
}

function FlowEditorView({
  activeContract,
  activeContractDescription,
  activeRemediationNotices,
  activeSelectedEdgeDeleteAnchor,
  clearSelectedEdgeDeleteState,
  compilationHandleNodeFieldsChange,
  contextMenu,
  contextMenuRef,
  contractLibrary,
  deleteEdgeById,
  draftContractName,
  edges,
  graphTransferState,
  handleAutoArrange,
  handleConnect,
  handleCreateContractCopy,
  handleDeleteContract,
  handleDeleteFromContextMenu,
  handleDragOver,
  handleDrop,
  handleEdgeContextMenu,
  handleExportContract,
  handleImportFromFile,
  handleImportFromWalrus,
  handleNodeContextMenu,
  handlePaneContextMenu,
  handlePublishContract,
  handleSaveAsContract,
  handleSelectContract,
  handleSelectedEdgeDeleteRequest,
  initialMode,
  isContractPanelOpen,
  isDesktop,
  nodes,
  onEdgesChange,
  onNodesChange,
  renderedNodes,
  selectedEdgeDeleteState,
  selectedTarget,
  setContextMenu,
  setDraftContractName,
  setIsContractPanelOpen,
  transferDialog,
  validateConnection,
  walletConnected,
}: FlowEditorViewProps) {
  return (
    <NodeFieldEditingContext.Provider value={compilationHandleNodeFieldsChange}>
      <div className="ff-canvas" data-testid="canvas-workspace" onContextMenu={handlePaneContextMenu}>
        {initialMode === "persistent" && !isDesktop && isContractPanelOpen ? (
          <button aria-label="Close saved contract controls overlay" className="ff-canvas__drawer-overlay" onClick={() => { setIsContractPanelOpen(false); }} style={{ left: "calc(min(24rem, 88vw) + 2.75rem)" }} type="button" />
        ) : null}

        {initialMode === "persistent" ? (
          <ContractDrawer
            activeContract={activeContract} activeContractDescription={activeContractDescription} activeRemediationNotices={activeRemediationNotices}
            contractLibrary={contractLibrary} draftContractName={draftContractName} isContractPanelOpen={isContractPanelOpen}
            onCreateContractCopy={handleCreateContractCopy} onDeleteContract={handleDeleteContract} onSaveAsContract={handleSaveAsContract}
            onExportContract={handleExportContract} onImportFromFile={handleImportFromFile} onImportFromWalrus={handleImportFromWalrus}
            onPublishContract={handlePublishContract}
            onSelectContract={handleSelectContract} onSetDraftContractName={setDraftContractName} onTogglePanel={() => { setIsContractPanelOpen((open) => !open); }}
            walletConnected={walletConnected}
          />
        ) : null}
        <ReactFlow<FlowNode, FlowEdge>
          aria-label="Node editor canvas"
          className="ff-canvas__flow"
          defaultEdgeOptions={{ animated: true }}
          edges={[...edges]}
          fitView={true}
          isValidConnection={validateConnection}
          nodeTypes={flowNodeTypes}
          nodes={[...renderedNodes]}
          onConnect={handleConnect}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onEdgeContextMenu={handleEdgeContextMenu}
          onEdgesChange={onEdgesChange}
          onNodeContextMenu={handleNodeContextMenu}
          onNodesChange={onNodesChange}
          onPaneClick={() => { setContextMenu(null); }}
          proOptions={{ hideAttribution: true }}
        >
          <Background className="ff-canvas__background" color="rgba(250, 250, 229, 0.1)" gap={32} variant={BackgroundVariant.Lines} />
          <Controls className="ff-canvas__controls" showInteractive={false} />
          <SelectedEdgeDeleteControls activeSelectedEdgeDeleteAnchor={activeSelectedEdgeDeleteAnchor} clearSelectedEdgeDeleteState={clearSelectedEdgeDeleteState} deleteEdgeById={deleteEdgeById} handleSelectedEdgeDeleteRequest={handleSelectedEdgeDeleteRequest} selectedEdgeDeleteState={selectedEdgeDeleteState} selectedTarget={selectedTarget} />
          {nodes.length === 0 ? (
            <div className="ff-canvas__empty-state">
              <p className="ff-canvas__eyebrow">Contract Canvas</p>
              <p className="ff-canvas__copy">Start with Aggression or Proximity, then layer scoring, filters, and Add to Queue.</p>
            </div>
          ) : null}
        </ReactFlow>
        <CanvasContextMenu contextMenu={contextMenu} contextMenuRef={contextMenuRef} onAutoArrange={handleAutoArrange} onDeleteFromContextMenu={handleDeleteFromContextMenu} />
        {graphTransferState.isOpen ? transferDialog : null}
      </div>
    </NodeFieldEditingContext.Provider>
  );
}

/**
 * Restores saved nodes from the canonical catalogue and drops edges that no longer point to valid handles.
 */
function FlowEditor({
  graphTransferWalletBridge,
  initialContractName = "Starter Contract",
  initialNodes = [],
  initialEdges = [],
  mode = "persistent",
  focusedDiagnosticNodeId,
  focusedDiagnosticRequestKey = 0,
  onCompilationStateChange,
  onRemediationNoticesChange,
}: CanvasWorkspaceProps) {
  const initialLibrarySnapshot = useInitialLibrarySnapshot({ initialContractName, initialEdges, initialNodes, mode });
  const activeInitialContract = initialLibrarySnapshot.library.contracts.find((contract) => contract.name === initialLibrarySnapshot.library.activeContractName) ?? initialLibrarySnapshot.library.contracts[0];
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(activeInitialContract.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(activeInitialContract.edges);
  const { isDesktop, isContractPanelOpen, setIsContractPanelOpen } = useCanvasViewportState(mode);
  const reactFlow = useReactFlow<FlowNode, FlowEdge>();
  const contractManager = useContractManager({ initialLibrarySnapshot, mode, nodes, edges, reactFlow, setEdges, setNodes });
  const graphTransfer = useGraphTransfer({
    activeContract: contractManager.activeContract,
    draftContractName: contractManager.draftContractName,
    edges,
    nodes,
    onImportComplete: contractManager.handleImportContract,
    onPublishComplete: contractManager.handleAttachWalrusProvenance,
    walletBridge: graphTransferWalletBridge,
  });
  const deleteManager = useDeleteManager({ setEdges, setNodes });
  const compilationState = useCanvasCompilationState({ clearNodeDeleteState: deleteManager.clearNodeDeleteState, deleteNodeById: deleteManager.deleteNodeById, draftContractName: contractManager.draftContractName, edges, handleNodeDeleteRequest: deleteManager.handleNodeDeleteRequest, nodeDeleteStates: deleteManager.nodeDeleteStates, nodes, onCompilationStateChange, setNodes });
  const selectionState = useCanvasSelectionState({ edges, nodes, selectedEdgeDeleteAnchor: deleteManager.selectedEdgeDeleteAnchor, setEdges, setNodes });
  const interactionHandlers = useCanvasInteractions({ deleteEdgeById: deleteManager.deleteEdgeById, deleteNodeById: deleteManager.deleteNodeById, edges, nodes, reactFlow, selectTarget: selectionState.selectTarget, setContextMenu: deleteManager.setContextMenu, setEdges, setNodes });
  useFlowEditorEffects({ contextMenu: deleteManager.contextMenu, contextMenuRef: deleteManager.contextMenuRef, deleteEdgeById: deleteManager.deleteEdgeById, deleteNodeById: deleteManager.deleteNodeById, edges, fallbackSelectedEdgeDeleteAnchor: selectionState.activeSelectedEdgeDeleteAnchor, focusedDiagnosticNodeId, focusedDiagnosticRequestKey, nodes, reactFlow, selectedTarget: selectionState.selectedTarget, setContextMenu: deleteManager.setContextMenu, setSelectedEdgeDeleteAnchor: deleteManager.setSelectedEdgeDeleteAnchor });
  useEffect(() => { onRemediationNoticesChange?.(contractManager.activeRemediationNotices); }, [contractManager.activeRemediationNotices, onRemediationNoticesChange]);
  const transferDialog = (
    <GraphTransferDialog
      activeContract={contractManager.activeContract}
      onDismiss={graphTransfer.dismiss}
      onExport={graphTransfer.startExport}
      onImportFromFile={graphTransfer.startImportFromFile}
      onImportFromWalrus={graphTransfer.startImportFromWalrus}
      onPublish={graphTransfer.startPublishToWalrus}
      state={graphTransfer.state}
      walletConnected={graphTransferWalletBridge?.walletConnected === true}
    />
  );
  return (
    <FlowEditorView
      activeContract={contractManager.activeContract} activeContractDescription={contractManager.activeContractDescription}
      activeRemediationNotices={contractManager.activeRemediationNotices} activeSelectedEdgeDeleteAnchor={selectionState.activeSelectedEdgeDeleteAnchor}
      clearSelectedEdgeDeleteState={deleteManager.clearSelectedEdgeDeleteState} compilationHandleNodeFieldsChange={compilationState.handleNodeFieldsChange}
      contextMenu={deleteManager.contextMenu} contextMenuRef={deleteManager.contextMenuRef} contractLibrary={contractManager.contractLibrary}
      deleteEdgeById={deleteManager.deleteEdgeById} draftContractName={contractManager.draftContractName} edges={edges}
      graphTransferState={graphTransfer.state}
      handleAutoArrange={interactionHandlers.handleAutoArrange} handleConnect={interactionHandlers.handleConnect} handleCreateContractCopy={contractManager.handleCreateContractCopy}
      handleDeleteContract={contractManager.handleDeleteContract} handleDeleteFromContextMenu={() => { interactionHandlers.handleDeleteFromContextMenu(deleteManager.contextMenu); }}
      handleDragOver={interactionHandlers.handleDragOver} handleDrop={interactionHandlers.handleDrop} handleEdgeContextMenu={interactionHandlers.handleEdgeContextMenu}
      handleExportContract={() => { graphTransfer.open("export"); }} handleImportFromFile={() => { graphTransfer.open("import-file"); }}
      handleImportFromWalrus={() => { graphTransfer.open("import-walrus"); }}
      handleNodeContextMenu={interactionHandlers.handleNodeContextMenu} handlePaneContextMenu={interactionHandlers.handlePaneContextMenu}
      handlePublishContract={() => { graphTransfer.open("publish"); }}
      handleSaveAsContract={contractManager.handleSaveAsContract} handleSelectContract={contractManager.handleSelectContract}
      handleSelectedEdgeDeleteRequest={deleteManager.handleSelectedEdgeDeleteRequest} initialMode={mode} isContractPanelOpen={isContractPanelOpen}
      isDesktop={isDesktop} nodes={nodes} onEdgesChange={onEdgesChange} onNodesChange={onNodesChange} renderedNodes={compilationState.renderedNodes}
      selectedEdgeDeleteState={deleteManager.selectedEdgeDeleteState} selectedTarget={selectionState.selectedTarget} setContextMenu={deleteManager.setContextMenu}
      setDraftContractName={contractManager.setDraftContractName} setIsContractPanelOpen={setIsContractPanelOpen} transferDialog={transferDialog}
      validateConnection={interactionHandlers.validateConnection} walletConnected={graphTransferWalletBridge?.walletConnected === true}
    />
  );
}

function CanvasWorkspace({
  graphTransferWalletBridge,
  initialContractName,
  initialNodes,
  initialEdges,
  mode,
  focusedDiagnosticNodeId,
  focusedDiagnosticRequestKey,
  onCompilationStateChange,
  onRemediationNoticesChange,
}: CanvasWorkspaceProps) {
  return (
    <ReactFlowProvider>
      <FlowEditor
        focusedDiagnosticNodeId={focusedDiagnosticNodeId}
        focusedDiagnosticRequestKey={focusedDiagnosticRequestKey}
        graphTransferWalletBridge={graphTransferWalletBridge}
        initialContractName={initialContractName}
        initialEdges={initialEdges}
        initialNodes={initialNodes}
        mode={mode}
        onCompilationStateChange={onCompilationStateChange}
        onRemediationNoticesChange={onRemediationNoticesChange}
      />
    </ReactFlowProvider>
  );
}

export default CanvasWorkspace;

function hydrateContract(contract: NamedFlowContract) {
  const restoredFlow = restoreSavedFlow(contract.nodes, contract.edges);
  return {
    contract: createNamedFlowContract(contract.name, restoredFlow.nodes, restoredFlow.edges, {
      description: contract.description,
      id: contract.id,
      isSeeded: contract.isSeeded,
      updatedAt: contract.updatedAt,
      walrusProvenance: contract.walrusProvenance,
    }),
    remediationNotices: restoredFlow.remediationNotices,
  } satisfies HydratedContractSnapshot;
}

function hydrateLibraryContracts(library: ContractLibrary): HydratedContractLibrarySnapshot {
  const remediationNoticesByContractName: Record<string, readonly RemediationNotice[]> = {};
  const contracts = library.contracts.map((contract) => {
    const hydratedContract = hydrateContract(contract);
    remediationNoticesByContractName[contract.name] = hydratedContract.remediationNotices;

    return createNamedFlowContract(contract.name, hydratedContract.contract.nodes, hydratedContract.contract.edges, {
      id: contract.id,
      description: contract.description,
      updatedAt: contract.updatedAt,
      isSeeded: contract.isSeeded,
      walrusProvenance: contract.walrusProvenance,
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
  const hydratedContract = hydrateContract(fallbackContract);

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