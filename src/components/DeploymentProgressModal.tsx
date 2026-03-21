import type { DeploymentAttempt, DeploymentProgress, DeploymentStage } from "../compiler/types";

interface DeploymentProgressModalProps {
  readonly latestAttempt: DeploymentAttempt | null;
  readonly progress: DeploymentProgress | null;
  readonly onDismiss: () => void;
}

const STAGE_LABELS: Record<DeploymentStage, string> = {
  validating: "Validating",
  preparing: "Preparing",
  signing: "Signing",
  submitting: "Submitting",
  confirming: "Confirming",
};

function isTerminalAttempt(
  latestAttempt: DeploymentAttempt | null,
  progress: DeploymentProgress,
): latestAttempt is DeploymentAttempt {
  return latestAttempt !== null && latestAttempt.attemptId === progress.attemptId && latestAttempt.endedAt !== undefined;
}

function getModalTitle(latestAttempt: DeploymentAttempt | null, progress: DeploymentProgress): string {
  if (!isTerminalAttempt(latestAttempt, progress)) {
    return "Deployment in progress";
  }

  switch (latestAttempt.outcome) {
    case "succeeded":
      return "Deployed";
    case "cancelled":
      return "Deployment cancelled";
    case "failed":
      return "Deployment failed";
    default:
      return "Deployment blocked";
  }
}

function getProgressPercent(progress: DeploymentProgress): number {
  return Math.round(((progress.stageIndex + 1) / progress.stageCount) * 100);
}

function getStageState(
  stage: DeploymentStage,
  progress: DeploymentProgress,
  latestAttempt: DeploymentAttempt | null,
): "complete" | "active" | "pending" {
  if (
    stage === progress.stage
    && isTerminalAttempt(latestAttempt, progress)
    && latestAttempt.outcome === "succeeded"
  ) {
    return "complete";
  }

  if (progress.completedStages.includes(stage)) {
    return "complete";
  }

  if (progress.stage === stage) {
    return "active";
  }

  return "pending";
}

function DeploymentProgressModal({ latestAttempt, progress, onDismiss }: DeploymentProgressModalProps) {
  if (progress === null || progress.dismissedByUser) {
    return null;
  }

  const title = getModalTitle(latestAttempt, progress);
  const terminalAttempt = isTerminalAttempt(latestAttempt, progress) ? latestAttempt : null;
  const progressPercent = getProgressPercent(progress);

  return (
    <div className="ff-deployment-modal" role="presentation">
      <div aria-hidden="true" className="ff-deployment-modal__backdrop" />
      <section aria-labelledby="deployment-progress-title" aria-modal="true" className="ff-deployment-modal__panel" role="dialog">
        <header className="ff-deployment-modal__header">
          <div>
            <p className="ff-deployment-modal__eyebrow">Deployment</p>
            <h2 className="ff-deployment-modal__title" id="deployment-progress-title">{title}</h2>
            <p className="ff-deployment-modal__copy">Target: {progress.targetId}</p>
          </div>
          <button className="ff-header__button" onClick={onDismiss} type="button">
            Dismiss
          </button>
        </header>

        <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={progressPercent} className="ff-deployment-modal__progress" role="progressbar">
          <div className="ff-deployment-modal__progress-fill" style={{ width: `${String(progressPercent)}%` }} />
        </div>

        <p className="ff-deployment-modal__message">{terminalAttempt?.message ?? progress.activeMessage}</p>

        <ol className="ff-deployment-modal__stages">
          {(Object.keys(STAGE_LABELS) as DeploymentStage[]).map((stage) => {
            const state = getStageState(stage, progress, latestAttempt);
            const stateLabel = state === "complete" ? "Complete" : state === "active" ? "Active" : "Pending";

            return (
              <li className={`ff-deployment-modal__stage ff-deployment-modal__stage--${state}`} key={stage}>
                <span aria-hidden="true" className="ff-deployment-modal__stage-indicator">
                  {state === "complete" ? "✓" : state === "active" ? "•" : ""}
                </span>
                <span className="ff-deployment-modal__stage-label">{STAGE_LABELS[stage]}</span>
                <span className="ff-deployment-modal__stage-state">{stateLabel}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

export default DeploymentProgressModal;