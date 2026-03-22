import { useState } from "react";

import type { CompilationStatus as CompilationStatusValue, CompilerDiagnostic, DeploymentStatus, DeploymentStatusType } from "../compiler/types";

interface CompilationStatusProps {
  readonly deploymentStatus?: DeploymentStatus | null;
  readonly status: CompilationStatusValue;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly onSelectDiagnostic?: (nodeId: string) => void;
}

function getArtifactFromStatus(status: CompilationStatusValue) {
  return status.state === "compiled" || status.state === "error"
    ? status.artifact
    : undefined;
}

function getDeploymentSummary(status: CompilationStatusValue): string | null {
  return getArtifactFromStatus(status)?.deploymentStatus?.nextActionSummary ?? null;
}

function getResolvedDeploymentStatus(
  status: CompilationStatusValue,
  explicitDeploymentStatus: DeploymentStatus | null,
): DeploymentStatus | null {
  return explicitDeploymentStatus ?? getArtifactFromStatus(status)?.deploymentStatus ?? null;
}

function formatDeploymentStage(stage: string | undefined): string | null {
  if (stage === undefined) {
    return null;
  }

  return stage;
}

function formatDeploymentSeverity(severity: string | undefined): string | null {
  if (severity === undefined) {
    return null;
  }

  return severity;
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

function DeploymentPanel({
  status,
  summary,
}: {
  readonly status: DeploymentStatus;
  readonly summary: string;
}) {
  const stageLabel = formatDeploymentStage(status.stage);
  const severityLabel = formatDeploymentSeverity(status.severity);
  const requiredInputs = status.requiredInputs.join(", ");
  const resolvedInputs = status.resolvedInputs.join(", ");
  const previousEntries = (status.reviewHistory ?? []).slice(1);

  return (
    <div aria-label="Deployment status details" className="ff-compilation-status__panel" id="deployment-status-details" role="region">
      <ul className="ff-compilation-status__list">
        <li>
          <span className="ff-compilation-status__message">Artifact ID: {status.artifactId}</span>
        </li>
        {status.headline !== undefined ? (
          <li>
            <span className="ff-compilation-status__message">{status.headline}</span>
          </li>
        ) : null}
        {status.targetId !== undefined ? (
          <li>
            <span className="ff-compilation-status__message">Target: {status.targetId}</span>
          </li>
        ) : null}
        {stageLabel !== null ? (
          <li>
            <span className="ff-compilation-status__message">Stage: {stageLabel}</span>
          </li>
        ) : null}
        {severityLabel !== null ? (
          <li>
            <span className="ff-compilation-status__message">Severity: {severityLabel}</span>
          </li>
        ) : null}
        {status.packageId !== undefined ? (
          <li>
            <span className="ff-compilation-status__message">Package ID: {status.packageId}</span>
          </li>
        ) : null}
        {status.confirmationReference !== undefined ? (
          <li>
            <span className="ff-compilation-status__message">Transaction Digest: {status.confirmationReference}</span>
          </li>
        ) : null}
        {status.blockedReasons.map((reason) => (
          <li key={reason}>
            <span className="ff-compilation-status__message">{reason}</span>
          </li>
        ))}
        {requiredInputs.length > 0 ? (
          <li>
            <span className="ff-compilation-status__message">Required inputs: {requiredInputs}</span>
          </li>
        ) : null}
        {resolvedInputs.length > 0 ? (
          <li>
            <span className="ff-compilation-status__message">Resolved inputs: {resolvedInputs}</span>
          </li>
        ) : null}
        <li>
          <span className="ff-compilation-status__message">{summary}</span>
        </li>
        {previousEntries.length > 0 ? (
          <li>
            <span className="ff-compilation-status__message">Earlier this session</span>
          </li>
        ) : null}
        {previousEntries.map((entry) => (
          <li key={entry.attemptId}>
            <span className="ff-compilation-status__message">{`${entry.headline} - ${entry.targetId}${entry.stage === undefined ? "" : ` - ${entry.stage}`}`}</span>
            <span className="ff-compilation-status__message">{entry.details}</span>
            {entry.confirmationReference !== undefined ? (
              <span className="ff-compilation-status__message">Transaction Digest: {entry.confirmationReference}</span>
            ) : null}
            {entry.historicalOnly ? (
              <span className="ff-compilation-status__message">Historical only</span>
            ) : null}
            {entry.historicalReason !== undefined ? (
              <span className="ff-compilation-status__message">{entry.historicalReason}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Persistent footer status indicator for the graph compilation pipeline.
 */
function CompilationStatus({ deploymentStatus: explicitDeploymentStatus = null, status, diagnostics, onSelectDiagnostic }: CompilationStatusProps) {
  const [expandedPanel, setExpandedPanel] = useState<"diagnostics" | "deployment" | null>(null);
  const hasDiagnostics = diagnostics.length > 0;
  const deploymentStatus = getResolvedDeploymentStatus(status, explicitDeploymentStatus);
  const deploymentLabel = deploymentStatus === null
    ? null
    : deploymentStatus.status === "deployed"
      ? "Deployed"
      : deploymentStatus.status === "ready"
        ? "Deployment Ready"
        : "Deployment Blocked";
  const deploymentSummary = deploymentStatus?.nextActionSummary ?? getDeploymentSummary(status);

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
        {deploymentStatus !== null && deploymentLabel !== null ? (
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

      {deploymentStatus !== null && deploymentSummary !== null && expandedPanel === "deployment" ? <DeploymentPanel status={deploymentStatus} summary={deploymentSummary} /> : null}
    </div>
  );
}

export default CompilationStatus;