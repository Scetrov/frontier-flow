import { useState } from "react";

import type { CompilationStatus as CompilationStatusValue, CompilerDiagnostic, DeploymentStatusType } from "../compiler/types";

interface CompilationStatusProps {
  readonly status: CompilationStatusValue;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly onSelectDiagnostic?: (nodeId: string) => void;
}

function getDeploymentLabel(status: CompilationStatusValue): string | null {
  const artifact = status.state === "compiled" || status.state === "error"
    ? status.artifact
    : undefined;
  const deploymentStatus = artifact?.deploymentStatus;

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
  const artifact = status.state === "compiled" || status.state === "error"
    ? status.artifact
    : undefined;
  return artifact?.deploymentStatus?.nextActionSummary ?? null;
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

/**
 * Persistent footer status indicator for the graph compilation pipeline.
 */
function CompilationStatus({ status, diagnostics, onSelectDiagnostic }: CompilationStatusProps) {
  const [expandedPanel, setExpandedPanel] = useState<"diagnostics" | "deployment" | null>(null);
  const hasDiagnostics = diagnostics.length > 0;
  const deploymentLabel = getDeploymentLabel(status);
  const deploymentSummary = getDeploymentSummary(status);
  const deploymentStatus = (status.state === "compiled" || status.state === "error")
    ? status.artifact?.deploymentStatus
    : undefined;

  return (
    <div className={getStatusClassName(status)}>
      <div aria-live="polite" className="ff-compilation-status__summary">
        <button
          aria-controls="compilation-diagnostics"
          aria-expanded={hasDiagnostics ? expandedPanel === "diagnostics" : false}
          className="ff-compilation-status__button"
          disabled={!hasDiagnostics}
          onClick={() => {
            if (hasDiagnostics) {
              setExpandedPanel((current) => current === "diagnostics" ? null : "diagnostics");
            }
          }}
          type="button"
        >
          <span aria-hidden="true" className="ff-compilation-status__dot" />
          <span className="ff-compilation-status__label">{getStatusLabel(status)}</span>
        </button>
        {deploymentStatus !== undefined && deploymentLabel !== null ? (
          <button
            aria-controls="deployment-status-details"
            aria-expanded={expandedPanel === "deployment"}
            className={getDeploymentIndicatorClassName(deploymentStatus.status)}
            onClick={() => {
              setExpandedPanel((current) => current === "deployment" ? null : "deployment");
            }}
            type="button"
          >
            <span aria-hidden="true" className="ff-compilation-status__dot" />
            <span className="ff-compilation-status__label">{deploymentLabel}</span>
          </button>
        ) : null}
      </div>

      {hasDiagnostics && expandedPanel === "diagnostics" ? (
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
      ) : null}

      {deploymentStatus !== undefined && deploymentSummary !== null && expandedPanel === "deployment" ? (
        <div className="ff-compilation-status__panel" id="deployment-status-details">
          <ul className="ff-compilation-status__list">
            <li>
              <span className="ff-compilation-status__message">{deploymentSummary}</span>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default CompilationStatus;