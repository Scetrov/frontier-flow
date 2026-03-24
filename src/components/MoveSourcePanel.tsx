import hljs from "highlight.js/lib/core";
import rust from "highlight.js/lib/languages/rust";

import type { CompilationStatus, DeploymentReviewEntry, DeploymentStatus } from "../compiler/types";

hljs.registerLanguage("rust", rust);

interface MoveSourcePanelProps {
  readonly deploymentStatus?: DeploymentStatus | null;
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

interface MoveSourceDeploymentDetails {
  readonly artifactId: string | null;
  readonly blockedReasons: readonly string[];
  readonly confirmationReference: string | null;
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
  artifactId: null,
  blockedReasons: [],
  confirmationReference: null,
  headline: null,
  label: null,
  packageId: null,
  reviewHistory: [],
  severity: null,
  stage: null,
  summary: null,
  target: null,
};

function getDeploymentStatus(status: CompilationStatus, explicitDeploymentStatus?: DeploymentStatus | null): DeploymentStatus | null {
  return explicitDeploymentStatus ?? (status.state === "compiled" || status.state === "error"
    ? status.artifact?.deploymentStatus ?? null
    : null);
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

function getDeploymentDetails(status: CompilationStatus, explicitDeploymentStatus?: DeploymentStatus | null): MoveSourceDeploymentDetails {
  const deploymentStatus = getDeploymentStatus(status, explicitDeploymentStatus);

  if (deploymentStatus === null) {
    return EMPTY_DEPLOYMENT_DETAILS;
  }

  return {
    artifactId: deploymentStatus.artifactId,
    blockedReasons: deploymentStatus.blockedReasons,
    confirmationReference: deploymentStatus.confirmationReference ?? null,
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
      return "Automatic compile is generating Move source from the current graph.";
    case "error":
      return "No Move source is available for the current graph yet. Resolve graph validation issues or compile errors to inspect generated output.";
    default:
      return "Edit the graph and wait for the automatic compile cycle to inspect generated Move source here.";
  }
}

function getDeploymentBadges(deployment: MoveSourceDeploymentDetails): string[] {
  return Array.from(new Set(
    [deployment.headline, deployment.label, deployment.target, deployment.stage, deployment.severity].filter(
      (value): value is string => value !== null,
    ),
  ));
}

function getDeploymentMetaLines(deployment: MoveSourceDeploymentDetails): string[] {
  return [deployment.packageId, deployment.summary, ...deployment.blockedReasons].filter((value): value is string => value !== null);
}

function MoveSourceMeta({
  deployment,
  filename,
  status,
}: {
  readonly deployment: MoveSourceDeploymentDetails;
  readonly filename: string;
  readonly status: CompilationStatus;
}) {
  return (
    <div className="ff-move-source__meta">
      <span className="ff-move-source__badge">{getStatusLabel(status)}</span>
      <span className="ff-move-source__filename">{filename}</span>
      {getDeploymentBadges(deployment).map((badge) => <span className="ff-move-source__badge" key={badge}>{badge}</span>)}
      {getDeploymentMetaLines(deployment).map((line) => <span className="ff-move-source__filename" key={line}>{line}</span>)}
    </div>
  );
}

function DeploymentReview({ deployment }: { readonly deployment: MoveSourceDeploymentDetails }) {
  if (deployment.label === null) {
    return null;
  }

  return (
    <section aria-label="Deployment review" className="ff-move-source__empty-state">
      {deployment.artifactId !== null ? <p className="ff-move-source__empty-copy">Artifact ID: {deployment.artifactId}</p> : null}
      {deployment.target !== null ? <p className="ff-move-source__empty-copy">Target: {deployment.target}</p> : null}
      {deployment.stage !== null ? <p className="ff-move-source__empty-copy">Stage: {deployment.stage}</p> : null}
      {deployment.severity !== null ? <p className="ff-move-source__empty-copy">Severity: {deployment.severity}</p> : null}
      {deployment.packageId !== null ? <p className="ff-move-source__empty-copy">Package ID: {deployment.packageId}</p> : null}
      {deployment.confirmationReference !== null ? <p className="ff-move-source__empty-copy">Transaction Digest: {deployment.confirmationReference}</p> : null}
      {deployment.summary !== null ? <p className="ff-move-source__empty-copy">{deployment.summary}</p> : null}
      {deployment.reviewHistory.map((entry) => (
        <div key={entry.attemptId}>
          <p className="ff-move-source__empty-copy">{`Earlier this session: ${entry.headline} - ${entry.targetId}${entry.stage === undefined ? "" : ` - ${entry.stage}`}`}</p>
          <p className="ff-move-source__empty-copy">{entry.details}</p>
          {entry.historicalOnly ? <p className="ff-move-source__empty-copy">Historical only</p> : null}
          {entry.historicalReason !== undefined ? <p className="ff-move-source__empty-copy">{entry.historicalReason}</p> : null}
        </div>
      ))}
    </section>
  );
}

function MoveSourceContent({
  displayedLines,
  highlightedSource,
  sourceCode,
  status,
}: {
  readonly displayedLines: readonly string[];
  readonly highlightedSource: string;
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}) {
  if (sourceCode === null) {
    return (
      <div className="ff-move-source__empty-state">
        <p className="ff-move-source__empty-title">No generated Move source yet</p>
        <p className="ff-move-source__empty-copy">{getEmptyMessage(status)}</p>
      </div>
    );
  }

  return (
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
  );
}

function MoveSourcePanel({ deploymentStatus = null, sourceCode, status }: MoveSourcePanelProps) {
  const displayedLines = sourceCode?.split("\n") ?? [];
  const highlightedSource = sourceCode === null ? "" : hljs.highlight(sourceCode, { language: "rust" }).value;
  const deployment = getDeploymentDetails(status, deploymentStatus);
  const displayedFilename = getDisplayedFilename(status);

  return (
    <section aria-label="Move source view" className="ff-move-source">
      <header className="ff-move-source__header">
        <div>
          <p className="ff-move-source__eyebrow">Move</p>
          <h2 className="ff-move-source__title">Generated source</h2>
          <p className="ff-move-source__copy">Read-only generated Move output with syntax highlighting for workflow review, debugging, and contributor inspection.</p>
        </div>
        <MoveSourceMeta deployment={deployment} filename={displayedFilename} status={status} />
      </header>

      <div className="ff-move-source__body">
        <p className="ff-move-source__learn-banner">
          Learn how to extend this code using{" "}
          <a className="ff-move-source__learn-link" href="https://evefrontier.space/move/" rel="noreferrer" target="_blank">
            Learn Move on Sui
          </a>
        </p>
        <DeploymentReview deployment={deployment} />
        <MoveSourceContent displayedLines={displayedLines} highlightedSource={highlightedSource} sourceCode={sourceCode} status={status} />
      </div>
    </section>
  );
}

export default MoveSourcePanel;