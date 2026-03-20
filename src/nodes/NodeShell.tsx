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

function SocketRow({
  sockets,
  mode,
  position,
}: {
  readonly sockets: readonly SocketDefinition[];
  readonly mode: "canvas" | "toolbox";
  readonly position: "top" | "bottom";
}) {
  if (sockets.length === 0) {
    return null;
  }

  return (
    <div className={`ff-node__row ff-node__row--${position}`}>
      {sockets.map((socket) => (
        <SocketGlyph key={socket.id} mode={mode} socket={socket} />
      ))}
    </div>
  );
}

function SocketColumn({ sockets, mode, side }: { readonly sockets: readonly SocketDefinition[]; readonly mode: "canvas" | "toolbox"; readonly side: "left" | "right" }) {
  return (
    <div className={`ff-node__column ff-node__column--${side}`}>
      {sockets.map((socket) => (
        <SocketGlyph key={socket.id} mode={mode} socket={socket} />
      ))}
    </div>
  );
}

function DiagnosticButton({
  diagnosticMessage,
  diagnosticTooltipId,
  isDiagnosticOpen,
  label,
  onOpenChange,
}: {
  readonly diagnosticMessage: string;
  readonly diagnosticTooltipId: string;
  readonly isDiagnosticOpen: boolean;
  readonly label: string;
  readonly onOpenChange: (open: boolean) => void;
}) {
  return (
    <button
      aria-describedby={isDiagnosticOpen ? diagnosticTooltipId : undefined}
      aria-expanded={isDiagnosticOpen}
      aria-label={`Show errors for ${label}`}
      className="ff-node__warning-button nodrag nopan"
      onBlur={() => {
        onOpenChange(false);
      }}
      onFocus={() => {
        onOpenChange(true);
      }}
      onMouseEnter={() => {
        onOpenChange(true);
      }}
      onMouseLeave={() => {
        onOpenChange(false);
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
  );
}

function DeleteConfirmationButtons({
  buttonRef,
  label,
  onCancel,
  onConfirm,
}: {
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
  readonly label: string;
  readonly onCancel?: () => void;
  readonly onConfirm?: () => void;
}) {
  return (
    <div aria-label={`Confirm delete ${label}`} className="ff-node__delete-confirmation" role="group">
      <button
        aria-label={`Confirm delete ${label}`}
        className="ff-node__delete-button ff-node__delete-button--confirm nodrag nopan"
        onClick={(event) => {
          event.stopPropagation();
          onConfirm?.();
        }}
        ref={buttonRef}
        type="button"
      >
        <Check aria-hidden="true" className="ff-node__delete-icon" />
      </button>
      <button
        aria-label={`Cancel delete ${label}`}
        className="ff-node__delete-button nodrag nopan"
        onClick={(event) => {
          event.stopPropagation();
          onCancel?.();
        }}
        type="button"
      >
        <X aria-hidden="true" className="ff-node__delete-icon" />
      </button>
    </div>
  );
}

function NodeActions({
  isDeleteConfirming,
  isEditable,
  label,
  nodeData,
  onEdit,
  confirmDeleteButtonRef,
}: {
  readonly isDeleteConfirming: boolean;
  readonly isEditable: boolean;
  readonly label: string;
  readonly nodeData: RenderableNodeData;
  readonly onEdit?: () => void;
  readonly confirmDeleteButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  if (!isEditable && nodeData.onDeleteRequest === undefined) {
    return null;
  }

  return (
    <div className="ff-node__actions">
      {isEditable ? (
        <button
          aria-label={`Edit ${label}`}
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
          <DeleteConfirmationButtons
            buttonRef={confirmDeleteButtonRef}
            label={label}
            onCancel={nodeData.onDeleteCancel}
            onConfirm={nodeData.onDeleteConfirm}
          />
        ) : (
          <button
            aria-label={`Delete ${label}`}
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
  );
}

function splitSockets(sockets: readonly SocketDefinition[]) {
  return {
    bottomSockets: sockets.filter((socket) => socket.position === "bottom"),
    leftSockets: sockets.filter((socket) => socket.position === "left"),
    rightSockets: sockets.filter((socket) => socket.position === "right"),
    topSockets: sockets.filter((socket) => socket.position === "top"),
  };
}

function getNodeClassName(shape: NodeShellProps["shape"], selected: boolean, mode: NodeShellProps["mode"]): string {
  return `ff-node ${shape === "diamond" ? "ff-node--diamond" : ""} ${selected ? "is-selected" : ""} ${mode === "toolbox" ? "ff-node--toolbox" : ""}`;
}

function getNodeSurfaceClassName(shape: NodeShellProps["shape"]): string {
  return `ff-node__surface ${shape === "diamond" ? "ff-node__surface--diamond" : ""}`;
}

function getNodeValidationAttributes(nodeData: RenderableNodeData, editing: boolean, mode: NodeShellProps["mode"]) {
  return {
    "data-editing": editing ? "true" : undefined,
    "data-node-mode": mode,
    "data-validation-error": nodeData.validationState === "error" ? "true" : undefined,
    "data-validation-warning": nodeData.validationState === "warning" ? "true" : undefined,
  };
}

function getIsEditable(mode: NodeShellProps["mode"], nodeType: string): boolean {
  return mode === "canvas" && hasEditableNodeFields(nodeType);
}

function getShouldShowErrorIndicator(
  mode: NodeShellProps["mode"],
  validationState: RenderableNodeData["validationState"],
  diagnosticMessage: string,
): boolean {
  return mode === "canvas" && validationState === "error" && diagnosticMessage.length > 0;
}

function NodeHeaderIcon({
  diagnosticMessage,
  diagnosticTooltipId,
  icon: Icon,
  isDiagnosticOpen,
  label,
  shouldShowErrorIndicator,
  onOpenChange,
}: {
  readonly diagnosticMessage: string;
  readonly diagnosticTooltipId: string;
  readonly icon?: LucideIcon;
  readonly isDiagnosticOpen: boolean;
  readonly label: string;
  readonly shouldShowErrorIndicator: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  if (shouldShowErrorIndicator) {
    return (
      <DiagnosticButton
        diagnosticMessage={diagnosticMessage}
        diagnosticTooltipId={diagnosticTooltipId}
        isDiagnosticOpen={isDiagnosticOpen}
        label={label}
        onOpenChange={onOpenChange}
      />
    );
  }

  return Icon !== undefined ? <Icon aria-hidden="true" className="ff-node__icon" /> : null;
}

function NodeFieldSummary({ lines }: { readonly lines: readonly string[] }) {
  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="ff-node__field-summary">
      {lines.map((line) => (
        <p key={line} className="ff-node__field-summary-line">
          {line}
        </p>
      ))}
    </div>
  );
}

function NodeSupplementalDescriptions({ nodeData }: { readonly nodeData: RenderableNodeData }) {
  return (
    <>
      {nodeData.deprecation !== undefined ? (
        <div className="ff-node__description">{getDeprecationMessage(nodeData.deprecation)}</div>
      ) : null}

      {nodeData.remediationNotice !== undefined ? (
        <div className="ff-node__description">{nodeData.remediationNotice.message}</div>
      ) : null}
    </>
  );
}

function NodeHeader({
  confirmDeleteButtonRef,
  diagnosticMessage,
  diagnosticTooltipId,
  icon,
  isDeleteConfirming,
  isDiagnosticOpen,
  isEditable,
  label,
  mode,
  nodeColor,
  nodeData,
  onEdit,
  onOpenChange,
  shouldShowErrorIndicator,
}: {
  readonly confirmDeleteButtonRef: React.RefObject<HTMLButtonElement | null>;
  readonly diagnosticMessage: string;
  readonly diagnosticTooltipId: string;
  readonly icon?: LucideIcon;
  readonly isDeleteConfirming: boolean;
  readonly isDiagnosticOpen: boolean;
  readonly isEditable: boolean;
  readonly label: string;
  readonly mode: "canvas" | "toolbox";
  readonly nodeColor: string;
  readonly nodeData: RenderableNodeData;
  readonly onEdit?: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly shouldShowErrorIndicator: boolean;
}) {
  return (
    <div className="ff-node__header" style={{ backgroundColor: nodeColor }}>
      <NodeHeaderIcon
        diagnosticMessage={diagnosticMessage}
        diagnosticTooltipId={diagnosticTooltipId}
        icon={icon}
        isDiagnosticOpen={isDiagnosticOpen}
        label={label}
        onOpenChange={onOpenChange}
        shouldShowErrorIndicator={shouldShowErrorIndicator}
      />
      <span className="ff-node__title">{label}</span>
      {mode === "canvas" ? (
        <NodeActions
          confirmDeleteButtonRef={confirmDeleteButtonRef}
          isDeleteConfirming={isDeleteConfirming}
          isEditable={isEditable}
          label={label}
          nodeData={nodeData}
          onEdit={onEdit}
        />
      ) : null}
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
  const { bottomSockets, leftSockets, rightSockets, topSockets } = useMemo(() => splitSockets(nodeData.sockets), [nodeData.sockets]);
  const isEditable = getIsEditable(mode, nodeData.type);
  const fieldSummary = useMemo(() => getNodeFieldSummary(nodeData.type, nodeData.fields), [nodeData.fields, nodeData.type]);
  const nodeStyle = { "--ff-node-accent": nodeData.color } as CSSProperties;
  const isDeleteConfirming = nodeData.deleteConfirmationState?.mode === "confirm";
  const diagnosticMessage = nodeData.diagnosticMessages?.join(" ") ?? "";
  const shouldShowErrorIndicator = getShouldShowErrorIndicator(mode, nodeData.validationState, diagnosticMessage);
  const diagnosticTooltipId = `${nodeId}-diagnostics`;
  const nodeValidationAttributes = getNodeValidationAttributes(nodeData, editing, mode);

  useEffect(() => {
    if (!isDeleteConfirming) {
      return;
    }

    confirmDeleteButtonRef.current?.focus();
  }, [isDeleteConfirming]);

  return (
    <div className={getNodeClassName(shape, selected, mode)} style={nodeStyle} {...nodeValidationAttributes}>
      <div className={getNodeSurfaceClassName(shape)}>
        <SocketRow mode={mode} position="top" sockets={topSockets} />

        <NodeHeader
          confirmDeleteButtonRef={confirmDeleteButtonRef}
          diagnosticMessage={diagnosticMessage}
          diagnosticTooltipId={diagnosticTooltipId}
          icon={Icon}
          isDeleteConfirming={isDeleteConfirming}
          isDiagnosticOpen={isDiagnosticOpen}
          isEditable={isEditable}
          label={nodeData.label}
          mode={mode}
          nodeColor={nodeData.color}
          nodeData={nodeData}
          onEdit={onEdit}
          onOpenChange={setIsDiagnosticOpen}
          shouldShowErrorIndicator={shouldShowErrorIndicator}
        />

        <div className="ff-node__description">{nodeData.description}</div>

        <NodeFieldSummary lines={fieldSummary} />
        <NodeSupplementalDescriptions nodeData={nodeData} />

        <div className="ff-node__body">
          <SocketColumn mode={mode} side="left" sockets={leftSockets} />
          <SocketColumn mode={mode} side="right" sockets={rightSockets} />
        </div>

        <SocketRow mode={mode} position="bottom" sockets={bottomSockets} />
      </div>
    </div>
  );
}

export default NodeShell;