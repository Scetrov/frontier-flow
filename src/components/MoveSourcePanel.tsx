import hljs from "highlight.js/lib/core";
import rust from "highlight.js/lib/languages/rust";

import type { CompilationStatus, DeploymentReviewEntry, DeploymentStatus } from "../compiler/types";

hljs.registerLanguage("rust", rust);

interface MoveSourcePanelProps {
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

interface MoveSourceDeploymentDetails {
  readonly blockedReasons: readonly string[];
  readonly headline: string | null;
  readonly label: string | null;
  readonly packageId: string | null;
  readonly reviewHistory: readonly DeploymentReviewEntry[];
  readonly severity: string | null;
  readonly stage: string | null;
  readonly summary: string | null;
  readonly target: string | null;
}

const EMPTY_DEPLOYMENT_DETAILS: MoveSourceDeploymentDetails = {
  blockedReasons: [],
  headline: null,
  label: null,
  packageId: null,
  reviewHistory: [],
  severity: null,
  stage: null,
  summary: null,
  target: null,
};

function getDeploymentStatus(status: CompilationStatus): DeploymentStatus | null {
  return status.state === "compiled" || status.state === "error"
    ? status.artifact?.deploymentStatus ?? null
    : null;
}

function getDeploymentLabel(deploymentStatus: DeploymentStatus | null): string | null {
  if (deploymentStatus === null) {
    return null;
  }

  switch (deploymentStatus.status) {
    case "deployed":
      return "Deployed";
    case "ready":
      return "Deployment Ready";
    case "blocked":
      return "Deployment Blocked";
  }
}

function getDeploymentDetails(status: CompilationStatus): MoveSourceDeploymentDetails {
  const deploymentStatus = getDeploymentStatus(status);

  if (deploymentStatus === null) {
    return EMPTY_DEPLOYMENT_DETAILS;
  }

  return {
    blockedReasons: deploymentStatus.blockedReasons,
    headline: deploymentStatus.headline ?? null,
    label: getDeploymentLabel(deploymentStatus),
    packageId: deploymentStatus.packageId ?? null,
    reviewHistory: (deploymentStatus.reviewHistory ?? []).slice(1),
    severity: deploymentStatus.severity ?? null,
    stage: deploymentStatus.stage ?? null,
    summary: deploymentStatus.nextActionSummary,
    target: deploymentStatus.targetId ?? null,
  };
}

function getDisplayedFilename(status: CompilationStatus): string {
  const sourceFilePath = status.state === "compiled" || status.state === "error"
    ? status.artifact?.sourceFilePath
    : undefined;

  if (sourceFilePath === undefined) {
    return "module.move";
  }

  const segments = sourceFilePath.split("/");
  return segments.at(-1) ?? "module.move";
}

function getStatusLabel(status: CompilationStatus): string {
  switch (status.state) {
    case "compiling":
      return "Compiling";
    case "compiled":
      return "Compiled";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function getEmptyMessage(status: CompilationStatus): string {
  switch (status.state) {
    case "compiling":
      return "Generating Move source from the current graph.";
    case "error":
      return "No Move source is available for the current graph yet. Resolve graph validation issues or compile errors to inspect generated output.";
    default:
      return "Build or edit a valid graph to inspect the generated Move source here.";
  }
}

function MoveSourcePanel({ sourceCode, status }: MoveSourcePanelProps) {
  const displayedLines = sourceCode?.split("\n") ?? [];
  const highlightedSource = sourceCode === null ? "" : hljs.highlight(sourceCode, { language: "rust" }).value;
  const deployment = getDeploymentDetails(status);
  const deploymentBadges = Array.from(new Set(
    [deployment.headline, deployment.label, deployment.target, deployment.stage, deployment.severity].filter(
      (value): value is string => value !== null,
    ),
  ));
  const deploymentLines = [deployment.packageId, deployment.summary].filter((value): value is string => value !== null);

  return (
    <section aria-label="Move source view" className="ff-move-source">
      <header className="ff-move-source__header">
        <div>
          <p className="ff-move-source__eyebrow">Move</p>
          <h2 className="ff-move-source__title">Generated source</h2>
          <p className="ff-move-source__copy">Read-only generated Move output with syntax highlighting for review, debugging, and contributor inspection.</p>
        </div>

        <div className="ff-move-source__meta">
          <span className="ff-move-source__badge">{getStatusLabel(status)}</span>
          <span className="ff-move-source__filename">{getDisplayedFilename(status)}</span>
          {deploymentBadges.map((badge) => <span className="ff-move-source__badge" key={badge}>{badge}</span>)}
          {deploymentLines.map((line) => <span className="ff-move-source__filename" key={line}>{line}</span>)}
          {deployment.blockedReasons.map((reason) => <span className="ff-move-source__filename" key={reason}>{reason}</span>)}
          {deployment.reviewHistory.map((entry) => (
            <span className="ff-move-source__filename" key={entry.attemptId}>{`Earlier this session: ${entry.headline} - ${entry.targetId}${entry.stage === undefined ? "" : ` - ${entry.stage}`}`}</span>
          ))}
          {deployment.reviewHistory.map((entry) => (
            <span className="ff-move-source__filename" key={`${entry.attemptId}-details`}>{entry.details}</span>
          ))}
        </div>
      </header>

      <div className="ff-move-source__body">
        <p className="ff-move-source__learn-banner">
          Learn how to extend this code using{" "}
          <a className="ff-move-source__learn-link" href="https://evefrontier.space/move/" rel="noreferrer" target="_blank">
            Learn Move on Sui
          </a>
        </p>
        {sourceCode === null ? (
          <div className="ff-move-source__empty-state">
            <p className="ff-move-source__empty-title">No generated Move source yet</p>
            <p className="ff-move-source__empty-copy">{getEmptyMessage(status)}</p>
          </div>
        ) : (
          <div className="ff-move-source__syntax" role="presentation">
            <ol aria-hidden="true" className="ff-move-source__gutter">
              {displayedLines.map((_, index) => (
                <li className="ff-move-source__line-number" key={index}>
                  {index + 1}
                </li>
              ))}
            </ol>
            <pre aria-label="Generated Move source code" className="ff-move-source__pre">
              <code
                className="ff-move-source__code hljs language-rust"
                dangerouslySetInnerHTML={{ __html: highlightedSource }}
              />
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

export default MoveSourcePanel;