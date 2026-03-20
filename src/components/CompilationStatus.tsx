import { useState } from "react";

import type { CompilationStatus as CompilationStatusValue, CompilerDiagnostic, DeploymentStatusType } from "../compiler/types";

interface CompilationStatusProps {
  readonly status: CompilationStatusValue;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly onSelectDiagnostic?: (nodeId: string) => void;
}

function getArtifactFromStatus(status: CompilationStatusValue) {
  return status.state === "compiled" || status.state === "error"
    ? status.artifact
    : undefined;
}

function getDeploymentLabel(status: CompilationStatusValue): string | null {
  const deploymentStatus = getArtifactFromStatus(status)?.deploymentStatus;

  if (deploymentStatus === undefined) {
    return null;
  }

  switch (deploymentStatus.status) {
    case "deployed":
      return "Deployment Deployed";
    case "ready":
      return "Deployment Ready";
    case "blocked":
      return "Deployment Blocked";
  }
}

function getDeploymentSummary(status: CompilationStatusValue): string | null {
  return getArtifactFromStatus(status)?.deploymentStatus?.nextActionSummary ?? null;
}

function getDeploymentIndicatorClassName(status: DeploymentStatusType): string {
  return `ff-compilation-status__button ff-compilation-status__button--deployment ff-compilation-status__button--deployment-${status}`;
}

function getStatusLabel(status: CompilationStatusValue): string {
  switch (status.state) {
    case "idle":
      return "Idle";
    case "compiling":
      return "Compiling";
    case "compiled":
      return "Compiled";
    case "error":
      return "Error";
  }
}

function getStatusClassName(status: CompilationStatusValue): string {
  return `ff-compilation-status ff-compilation-status--${status.state}`;
}

interface StatusButtonProps {
  readonly ariaControls: string;
  readonly ariaExpanded: boolean;
  readonly className: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick: () => void;
}

function StatusButton({ ariaControls, ariaExpanded, className, disabled = false, label, onClick }: StatusButtonProps) {
  return (
    <button
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      className={className}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="ff-compilation-status__dot" />
      <span className="ff-compilation-status__label">{label}</span>
    </button>
  );
}

function DiagnosticsPanel({ diagnostics, onSelectDiagnostic }: Pick<CompilationStatusProps, "diagnostics" | "onSelectDiagnostic">) {
  return (
    <div className="ff-compilation-status__panel" id="compilation-diagnostics">
      <ul className="ff-compilation-status__list">
        {diagnostics.map((diagnostic, index) => {
          const canFocusNode = diagnostic.reactFlowNodeId !== null && onSelectDiagnostic !== undefined;

          return (
            <li key={`${diagnostic.userMessage}-${String(index)}`}>
              {canFocusNode ? (
                <button
                  className="ff-compilation-status__diagnostic"
                  onClick={() => {
                    onSelectDiagnostic(diagnostic.reactFlowNodeId ?? "");
                  }}
                  type="button"
                >
                  {diagnostic.userMessage}
                </button>
              ) : (
                <span className="ff-compilation-status__message">{diagnostic.userMessage}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DeploymentPanel({ summary }: { readonly summary: string }) {
  return (
    <div className="ff-compilation-status__panel" id="deployment-status-details">
      <ul className="ff-compilation-status__list">
        <li>
          <span className="ff-compilation-status__message">{summary}</span>
        </li>
      </ul>
    </div>
  );
}

/**
 * Persistent footer status indicator for the graph compilation pipeline.
 */
function CompilationStatus({ status, diagnostics, onSelectDiagnostic }: CompilationStatusProps) {
  const [expandedPanel, setExpandedPanel] = useState<"diagnostics" | "deployment" | null>(null);
  const hasDiagnostics = diagnostics.length > 0;
  const deploymentLabel = getDeploymentLabel(status);
  const deploymentSummary = getDeploymentSummary(status);
  const deploymentStatus = getArtifactFromStatus(status)?.deploymentStatus;

  return (
    <div className={getStatusClassName(status)}>
      <div aria-live="polite" className="ff-compilation-status__summary">
        <StatusButton
          ariaControls="compilation-diagnostics"
          ariaExpanded={hasDiagnostics ? expandedPanel === "diagnostics" : false}
          className="ff-compilation-status__button"
          disabled={!hasDiagnostics}
          label={getStatusLabel(status)}
          onClick={() => {
            if (hasDiagnostics) {
              setExpandedPanel((current) => current === "diagnostics" ? null : "diagnostics");
            }
          }}
        />
        {deploymentStatus !== undefined && deploymentLabel !== null ? (
          <StatusButton
            ariaControls="deployment-status-details"
            ariaExpanded={expandedPanel === "deployment"}
            className={getDeploymentIndicatorClassName(deploymentStatus.status)}
            label={deploymentLabel}
            onClick={() => {
              setExpandedPanel((current) => current === "deployment" ? null : "deployment");
            }}
          />
        ) : null}
      </div>

      {hasDiagnostics && expandedPanel === "diagnostics" ? <DiagnosticsPanel diagnostics={diagnostics} onSelectDiagnostic={onSelectDiagnostic} /> : null}

      {deploymentStatus !== undefined && deploymentSummary !== null && expandedPanel === "deployment" ? <DeploymentPanel summary={deploymentSummary} /> : null}
    </div>
  );
}

export default CompilationStatus;