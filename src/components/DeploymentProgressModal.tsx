import { useEffect, useRef } from "react";

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
    case "unresolved":
      return "Deployment unresolved";
    default:
      return "Deployment blocked";
  }
}

function getTerminalRemediation(latestAttempt: DeploymentAttempt | null): string | null {
  if (latestAttempt === null) {
    return null;
  }

  switch (latestAttempt.outcome) {
    case "cancelled":
      return "Approve the wallet signing request to continue deployment.";
    case "failed":
      return "Review the wallet and RPC error details, then retry deployment once the target is healthy.";
    case "unresolved":
      return "Retry confirmation or redeploy after checking the target network and transaction digest.";
    case "blocked":
      return "Resolve the reported blocker before retrying deployment.";
    default:
      return null;
  }
}

function getProgressPercent(progress: DeploymentProgress): number {
  return Math.round(((progress.stageIndex + 1) / progress.stageCount) * 100);
}

function getFocusableElements(panel: HTMLElement | null): HTMLElement[] {
  if (panel === null) {
    return [];
  }

  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
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

function trapFocusWithinPanel(
  event: KeyboardEvent,
  panel: HTMLElement | null,
  fallbackElement: HTMLButtonElement | null,
): void {
  const focusableElements = getFocusableElements(panel);

  if (focusableElements.length === 0) {
    event.preventDefault();
    fallbackElement?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function useModalFocusManagement(input: {
  readonly dismissButtonRef: React.RefObject<HTMLButtonElement | null>;
  readonly onDismiss: () => void;
  readonly panelRef: React.RefObject<HTMLElement | null>;
  readonly progress: DeploymentProgress | null;
}) {
  const { dismissButtonRef, onDismiss, panelRef, progress } = input;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (progress === null || progress.dismissedByUser) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dismissButtonRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [dismissButtonRef, progress]);

  useEffect(() => {
    if (progress === null || progress.dismissedByUser) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }

      if (event.key === "Tab") {
        trapFocusWithinPanel(event, panelRef.current, dismissButtonRef.current);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismissButtonRef, onDismiss, panelRef, progress]);
}

function DeploymentEvidenceDetails({ attempt }: { readonly attempt: DeploymentAttempt }) {
  if (attempt.packageId === undefined && attempt.confirmationReference === undefined) {
    return null;
  }

  return (
    <ul aria-label="Deployment evidence" className="ff-deployment-modal__details">
      {attempt.packageId !== undefined ? (
        <li className="ff-deployment-modal__detail">Package ID: {attempt.packageId}</li>
      ) : null}
      {attempt.confirmationReference !== undefined ? (
        <li className="ff-deployment-modal__detail">Transaction Digest: {attempt.confirmationReference}</li>
      ) : null}
    </ul>
  );
}

function DeploymentStageList({
  latestAttempt,
  progress,
}: {
  readonly latestAttempt: DeploymentAttempt | null;
  readonly progress: DeploymentProgress;
}) {
  return (
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
  );
}

function DeploymentProgressModal({ latestAttempt, progress, onDismiss }: DeploymentProgressModalProps) {
  const dismissButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  useModalFocusManagement({ dismissButtonRef, onDismiss, panelRef, progress });

  if (progress === null || progress.dismissedByUser) {
    return null;
  }

  const title = getModalTitle(latestAttempt, progress);
  const terminalAttempt = isTerminalAttempt(latestAttempt, progress) ? latestAttempt : null;
  const progressPercent = getProgressPercent(progress);
  const terminalRemediation = getTerminalRemediation(terminalAttempt);

  return (
    <div className="ff-deployment-modal" role="presentation">
      <div aria-hidden="true" className="ff-deployment-modal__backdrop" />
      <section
        aria-describedby="deployment-progress-review-note"
        aria-labelledby="deployment-progress-title"
        aria-modal="true"
        className="ff-deployment-modal__panel"
        ref={panelRef}
        role="dialog"
      >
        <header className="ff-deployment-modal__header">
          <div>
            <p className="ff-deployment-modal__eyebrow">Deployment</p>
            <h2 className="ff-deployment-modal__title" id="deployment-progress-title">{title}</h2>
            <p className="ff-deployment-modal__copy">Target: {progress.targetId}</p>
          </div>
          <button className="ff-header__button" onClick={onDismiss} ref={dismissButtonRef} type="button">
            Dismiss
          </button>
        </header>

        <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={progressPercent} className="ff-deployment-modal__progress" role="progressbar">
          <div className="ff-deployment-modal__progress-fill" style={{ width: `${String(progressPercent)}%` }} />
        </div>

        <p className="ff-deployment-modal__message">{terminalAttempt?.message ?? progress.activeMessage}</p>
        <p className="ff-deployment-modal__status-live-region" id="deployment-progress-review-note">
          Dismissing this panel keeps deployment running. Review surfaces retain the final outcome for this attempt.
        </p>
        <p aria-atomic="true" aria-live={terminalAttempt === null ? "polite" : "assertive"} className="ff-deployment-modal__status-live-region">
          {terminalAttempt === null ? progress.activeMessage : `${title}. ${terminalAttempt.message}`}
        </p>

        {terminalAttempt !== null ? <DeploymentEvidenceDetails attempt={terminalAttempt} /> : null}

        {terminalRemediation !== null ? (
          <p className="ff-deployment-modal__remediation">{terminalRemediation}</p>
        ) : null}

        <DeploymentStageList latestAttempt={latestAttempt} progress={progress} />
      </section>
    </div>
  );
}

export default DeploymentProgressModal;