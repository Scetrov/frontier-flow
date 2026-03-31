import { useEffect, useMemo, useRef } from "react";

import type {
  AuthorizationConfirmationPhase,
  AuthorizationProgressState,
  AuthorizationTarget,
  AuthorizationTurretStatus,
} from "../types/authorization";

interface AuthorizationProgressModalProps {
  readonly onClose: () => void;
  readonly onRetryEventConfirmation?: (turretObjectId: string) => void;
  readonly progress: AuthorizationProgressState | null;
}

const STATUS_LABELS: Record<AuthorizationTurretStatus, string> = {
  pending: "Pending",
  submitting: "Submitting",
  confirming: "Confirming",
  confirmed: "Confirmed",
  failed: "Failed",
  warning: "Warning",
};

const STATUS_ICONS: Record<AuthorizationTurretStatus, string> = {
  pending: "○",
  submitting: "…",
  confirming: "•",
  confirmed: "✓",
  failed: "!",
  warning: "!",
};

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
  readonly closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly panelRef: React.RefObject<HTMLElement | null>;
  readonly progress: AuthorizationProgressState | null;
}) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { closeButtonRef, onClose, panelRef, progress } = input;

  useEffect(() => {
    if (progress === null || progress.dismissedByUser) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [closeButtonRef, progress]);

  useEffect(() => {
    if (progress === null || progress.dismissedByUser) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        trapFocusWithinPanel(event, panelRef.current, closeButtonRef.current);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeButtonRef, onClose, panelRef, progress]);
}

function getSummary(progress: AuthorizationProgressState): {
  readonly failedCount: number;
  readonly pendingCount: number;
  readonly successCount: number;
  readonly warningCount: number;
} {
  return progress.targets.reduce((summary, target) => ({
    failedCount: summary.failedCount + (target.status === "failed" ? 1 : 0),
    pendingCount: summary.pendingCount + (target.status === "pending" || target.status === "submitting" || target.status === "confirming" ? 1 : 0),
    successCount: summary.successCount + (target.status === "confirmed" ? 1 : 0),
    warningCount: summary.warningCount + (target.status === "warning" ? 1 : 0),
  }), {
    failedCount: 0,
    pendingCount: 0,
    successCount: 0,
    warningCount: 0,
  });
}

function getTitle(progress: AuthorizationProgressState): string {
  return progress.completedAt === null ? "Authorization in progress" : "Authorization complete";
}

function getTargetStatusLabel(status: AuthorizationTurretStatus, confirmationPhase: AuthorizationConfirmationPhase | null): string {
  if (status === "confirming" && confirmationPhase === "transaction") {
    return "Confirming transaction";
  }

  if (status === "confirming" && confirmationPhase === "event") {
    return "Awaiting event";
  }

  return STATUS_LABELS[status];
}

function getTargetCopy(target: AuthorizationTarget): string {
  if (target.status === "confirming" && target.confirmationPhase === "transaction") {
    return "Transaction submitted. Waiting for on-chain confirmation.";
  }

  if (target.status === "confirming" && target.confirmationPhase === "event") {
    return "Transaction confirmed. Awaiting authorization event.";
  }

  return target.errorMessage ?? target.transactionDigest ?? target.turretObjectId;
}

function getStatusMessage(progress: AuthorizationProgressState): string {
  if (progress.walletDisconnected) {
    return "Wallet disconnected. Reconnect your wallet to resume the authorization batch.";
  }

  const activeTarget = progress.targets.find((target) => target.turretObjectId === progress.activeTurretObjectId);

  if (activeTarget === undefined) {
    return progress.completedAt === null
      ? "Preparing the selected turrets for authorization."
      : "Authorization batch finished. Review each turret outcome before closing this dialog.";
  }

  return `${getTargetStatusLabel(activeTarget.status, activeTarget.confirmationPhase)} ${activeTarget.turretObjectId}.`;
}

function AuthorizationTurretRow(input: {
  readonly canRetry: boolean;
  readonly onRetryEventConfirmation?: (turretObjectId: string) => void;
  readonly target: AuthorizationTarget;
}) {
  const { canRetry, onRetryEventConfirmation, target } = input;

  return (
    <li className={`ff-authorization-modal__row ff-authorization-modal__row--${target.status}`}>
      <span aria-hidden="true" className="ff-authorization-modal__row-indicator">{STATUS_ICONS[target.status]}</span>
      <div className="ff-authorization-modal__row-body">
        <div className="ff-authorization-modal__row-header">
          <span className="ff-authorization-modal__row-title">{target.turretObjectId}</span>
          <span className="ff-authorization-modal__row-status">{getTargetStatusLabel(target.status, target.confirmationPhase)}</span>
        </div>
        <p className="ff-authorization-modal__row-copy">{getTargetCopy(target)}</p>
        {canRetry ? (
          <button className="ff-authorize-view__action" onClick={() => onRetryEventConfirmation?.(target.turretObjectId)} type="button">
            Retry confirmation
          </button>
        ) : null}
      </div>
    </li>
  );
}

function AuthorizationModalHeader(input: {
  readonly closeButtonRef: React.RefObject<HTMLButtonElement | null>;
  readonly onClose: () => void;
  readonly progress: AuthorizationProgressState;
}) {
  const { closeButtonRef, onClose, progress } = input;

  return (
    <header className="ff-deployment-modal__header">
      <div>
        <p className="ff-deployment-modal__eyebrow">Authorization</p>
        <h2 className="ff-deployment-modal__title" id="authorization-progress-title">{getTitle(progress)}</h2>
        <p className="ff-deployment-modal__copy">Target: {progress.targetId}</p>
      </div>
      <button className="ff-header__button" onClick={onClose} ref={closeButtonRef} type="button">
        Close
      </button>
    </header>
  );
}

function AuthorizationModalSummary(input: {
  readonly failedCount: number;
  readonly successCount: number;
  readonly warningCount: number;
}) {
  const { failedCount, successCount, warningCount } = input;

  return (
    <div className="ff-authorization-modal__summary">
      <div>
        <span className="ff-authorization-modal__summary-label">Confirmed</span>
        <strong className="ff-authorization-modal__summary-value">{String(successCount)}</strong>
      </div>
      <div>
        <span className="ff-authorization-modal__summary-label">Failed</span>
        <strong className="ff-authorization-modal__summary-value">{String(failedCount)}</strong>
      </div>
      <div>
        <span className="ff-authorization-modal__summary-label">Warnings</span>
        <strong className="ff-authorization-modal__summary-value">{String(warningCount)}</strong>
      </div>
    </div>
  );
}

function AuthorizationModalCompletionNote(input: {
  readonly failedCount: number;
  readonly successCount: number;
  readonly warningCount: number;
}) {
  const { failedCount, successCount, warningCount } = input;

  return (
    <p className="ff-authorization-modal__completion-note">
      {String(successCount)} confirmed, {String(failedCount + warningCount)} require review.
    </p>
  );
}

function AuthorizationModalRows(input: {
  readonly onRetryEventConfirmation?: (turretObjectId: string) => void;
  readonly progress: AuthorizationProgressState;
}) {
  const { onRetryEventConfirmation, progress } = input;

  return (
    <ol className="ff-authorization-modal__rows">
      {progress.targets.map((target) => (
        <AuthorizationTurretRow
          canRetry={progress.completedAt !== null && target.status === "warning" && target.transactionDigest !== null}
          key={target.turretObjectId}
          onRetryEventConfirmation={onRetryEventConfirmation}
          target={target}
        />
      ))}
    </ol>
  );
}

function AuthorizationModalDisconnectBanner(input: {
  readonly walletDisconnected: boolean;
}) {
  return input.walletDisconnected ? (
    <div className="ff-authorization-modal__disconnect-banner" role="status">
      Wallet disconnected. Reconnect to resume authorization.
    </div>
  ) : null;
}

function AuthorizationModalFooter(input: {
  readonly progress: AuthorizationProgressState;
  readonly summary: ReturnType<typeof getSummary> | null;
}) {
  return input.progress.completedAt !== null ? (
    <AuthorizationModalCompletionNote
      failedCount={input.summary?.failedCount ?? 0}
      successCount={input.summary?.successCount ?? 0}
      warningCount={input.summary?.warningCount ?? 0}
    />
  ) : null;
}

function getLiveRegionPriority(progress: AuthorizationProgressState): "assertive" | "polite" {
  return progress.completedAt === null ? "polite" : "assertive";
}

/**
 * Present per-turret authorization progress in a modal dialog.
 */
function AuthorizationProgressModal({ onClose, onRetryEventConfirmation, progress }: AuthorizationProgressModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  useModalFocusManagement({ closeButtonRef, onClose, panelRef, progress });
  const summary = useMemo(() => progress === null ? null : getSummary(progress), [progress]);

  if (progress === null || progress.dismissedByUser) {
    return null;
  }

  return (
    <div className="ff-deployment-modal" role="presentation">
      <div aria-hidden="true" className="ff-deployment-modal__backdrop" />
      <section
        aria-describedby="authorization-progress-note"
        aria-labelledby="authorization-progress-title"
        aria-modal="true"
        className="ff-deployment-modal__panel"
        ref={panelRef}
        role="dialog"
      >
        <AuthorizationModalHeader closeButtonRef={closeButtonRef} onClose={onClose} progress={progress} />

        <p className="ff-deployment-modal__message">{getStatusMessage(progress)}</p>
        <p className="ff-deployment-modal__status-live-region" id="authorization-progress-note">
          The authorization batch runs one turret at a time and continues past individual failures.
        </p>
        <p aria-atomic="true" aria-live={getLiveRegionPriority(progress)} className="ff-deployment-modal__status-live-region">
          {getStatusMessage(progress)}
        </p>

        <AuthorizationModalDisconnectBanner walletDisconnected={progress.walletDisconnected} />

        <AuthorizationModalSummary
          failedCount={summary?.failedCount ?? 0}
          successCount={summary?.successCount ?? 0}
          warningCount={summary?.warningCount ?? 0}
        />

        <AuthorizationModalRows onRetryEventConfirmation={onRetryEventConfirmation} progress={progress} />

        <AuthorizationModalFooter progress={progress} summary={summary} />
      </section>
    </div>
  );
}

export default AuthorizationProgressModal;
