import { useState } from "react";

import type { CompilationStatus as CompilationStatusValue, CompilerDiagnostic, DeploymentReviewEntry, DeploymentStatus, DeploymentStatusType } from "../compiler/types";

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

function toLabeledValue(label: string, value: string | undefined): string | null {
  return value === undefined ? null : `${label}: ${value}`;
}

function getDeploymentButtonLabel(status: DeploymentStatus | null): string | null {
  if (status === null) {
    return null;
  }

  switch (status.status) {
    case "deployed":
      return "Deployed";
    case "ready":
      return "Deployment Ready";
    case "blocked":
      return "Deployment Blocked";
  }
}

function getDeploymentDetailLines(status: DeploymentStatus, summary: string): string[] {
  const requiredInputs = status.requiredInputs.join(", ");
  const resolvedInputs = status.resolvedInputs.join(", ");

  return [
    `Artifact ID: ${status.artifactId}`,
    status.headline,
    toLabeledValue("Target", status.targetId),
    toLabeledValue("Stage", formatDeploymentStage(status.stage) ?? undefined),
    toLabeledValue("Severity", formatDeploymentSeverity(status.severity) ?? undefined),
    toLabeledValue("Package ID", status.packageId),
    toLabeledValue("Transaction Digest", status.confirmationReference),
    ...status.blockedReasons,
    requiredInputs.length > 0 ? `Required inputs: ${requiredInputs}` : null,
    resolvedInputs.length > 0 ? `Resolved inputs: ${resolvedInputs}` : null,
    summary,
  ].filter((value): value is string => value !== null && value !== undefined);
}

function getReviewEntryLines(entry: DeploymentReviewEntry): string[] {
  return [
    `${entry.headline} - ${entry.targetId}${entry.stage === undefined ? "" : ` - ${entry.stage}`}`,
    entry.details,
    toLabeledValue("Transaction Digest", entry.confirmationReference),
    entry.historicalOnly ? "Historical only" : null,
    entry.historicalReason,
  ].filter((value): value is string => value !== null && value !== undefined);
}

function createPanelToggleHandler(
  enabled: boolean,
  panel: "deployment" | "diagnostics",
  setExpandedPanel: React.Dispatch<React.SetStateAction<"diagnostics" | "deployment" | null>>,
): () => void {
  return () => {
    if (!enabled) {
      return;
    }

    setExpandedPanel((current) => current === panel ? null : panel);
  };
}

function CompilationStatusSummary({
  deploymentLabel,
  deploymentStatus,
  expandedPanel,
  handleDeploymentToggle,
  handleDiagnosticsToggle,
  hasDiagnostics,
  status,
}: {
  readonly deploymentLabel: string | null;
  readonly deploymentStatus: DeploymentStatus | null;
  readonly expandedPanel: "diagnostics" | "deployment" | null;
  readonly handleDeploymentToggle: () => void;
  readonly handleDiagnosticsToggle: () => void;
  readonly hasDiagnostics: boolean;
  readonly status: CompilationStatusValue;
}) {
  return (
    <div aria-live="polite" className="ff-compilation-status__summary">
      <StatusButton
        ariaControls="compilation-diagnostics"
        ariaExpanded={hasDiagnostics ? expandedPanel === "diagnostics" : false}
        className="ff-compilation-status__button"
        disabled={!hasDiagnostics}
        label={getStatusLabel(status)}
        onClick={handleDiagnosticsToggle}
      />
      {deploymentStatus !== null && deploymentLabel !== null ? (
        <StatusButton
          ariaControls="deployment-status-details"
          ariaExpanded={expandedPanel === "deployment"}
          className={getDeploymentIndicatorClassName(deploymentStatus.status)}
          label={deploymentLabel}
          onClick={handleDeploymentToggle}
        />
      ) : null}
    </div>
  );
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
  const detailLines = getDeploymentDetailLines(status, summary);
  const previousEntries = (status.reviewHistory ?? []).slice(1);

  return (
    <div aria-label="Deployment status details" className="ff-compilation-status__panel" id="deployment-status-details" role="region">
      <ul className="ff-compilation-status__list">
        {detailLines.map((line) => (
          <li key={line}>
            <span className="ff-compilation-status__message">{line}</span>
          </li>
        ))}
        {previousEntries.length > 0 ? (
          <li>
            <span className="ff-compilation-status__message">Earlier this session</span>
          </li>
        ) : null}
        {previousEntries.map((entry) => (
          <li key={entry.attemptId}>
            {getReviewEntryLines(entry).map((line) => (
              <span className="ff-compilation-status__message" key={`${entry.attemptId}-${line}`}>{line}</span>
            ))}
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
  const deploymentLabel = getDeploymentButtonLabel(deploymentStatus);
  const deploymentSummary = deploymentStatus?.nextActionSummary ?? getDeploymentSummary(status);
  const handleDiagnosticsToggle = createPanelToggleHandler(hasDiagnostics, "diagnostics", setExpandedPanel);
  const handleDeploymentToggle = createPanelToggleHandler(deploymentStatus !== null && deploymentLabel !== null, "deployment", setExpandedPanel);

  return (
    <div className={getStatusClassName(status)}>
      <CompilationStatusSummary
        deploymentLabel={deploymentLabel}
        deploymentStatus={deploymentStatus}
        expandedPanel={expandedPanel}
        handleDeploymentToggle={handleDeploymentToggle}
        handleDiagnosticsToggle={handleDiagnosticsToggle}
        hasDiagnostics={hasDiagnostics}
        status={status}
      />

      {hasDiagnostics && expandedPanel === "diagnostics" ? <DiagnosticsPanel diagnostics={diagnostics} onSelectDiagnostic={onSelectDiagnostic} /> : null}

      {deploymentStatus !== null && deploymentSummary !== null && expandedPanel === "deployment" ? <DeploymentPanel status={deploymentStatus} summary={deploymentSummary} /> : null}
    </div>
  );
}

export default CompilationStatus;