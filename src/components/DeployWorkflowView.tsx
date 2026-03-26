import {
  useCurrentAccount,
  useCurrentWallet,
} from "@mysten/dapp-kit";

import type { DeploymentState } from "../compiler/types";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { useTargetBalance } from "../hooks/useTargetBalance";
import { ConservativeDeployIcon } from "./HeaderActionIcons";

const MIST_PER_SUI = 1_000_000_000;

interface DeployWorkflowViewProps {
  readonly deployment: DeploymentState;
}

function formatBalance(balanceMist: string | null | undefined): string {
  if (!balanceMist) {
    return "-- SUI";
  }

  const amount = Number(balanceMist) / MIST_PER_SUI;
  if (!Number.isFinite(amount)) {
    return "-- SUI";
  }

  return `${amount.toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")} SUI`;
}

function getBalanceState(input: {
  readonly isConnected: boolean;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly requiresWallet: boolean;
  readonly totalBalance: string | null;
}) {
  if (!input.requiresWallet) {
    return {
      label: "Balance check is skipped for local deployment",
      tone: "neutral",
    } as const;
  }

  if (!input.isConnected) {
    return {
      label: "Connect a wallet to read SUI balance",
      tone: "neutral",
    } as const;
  }

  if (input.isPending) {
    return {
      label: "Checking SUI balance",
      tone: "neutral",
    } as const;
  }

  if (input.isError) {
    return {
      label: "Could not read wallet balance",
      tone: "warning",
    } as const;
  }

  return {
    label: `Wallet balance: ${formatBalance(input.totalBalance)}`,
    tone: "positive",
  } as const;
}

function ChecklistItem({
  detail,
  label,
  state,
}: {
  readonly detail?: string;
  readonly label: string;
  readonly state: "blocked" | "info" | "ready";
}) {
  const stateClassName = state === "blocked"
    ? "border-[rgba(255,71,0,0.35)] bg-[rgba(81,26,18,0.34)]"
    : "border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.52)]";
  const iconClassName = state === "blocked"
      ? "border-[rgba(255,71,0,0.4)] bg-[rgba(81,26,18,0.4)] text-[var(--brand-orange)]"
      : state === "ready"
        ? "border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.52)] text-[rgba(137,223,168,0.96)]"
      : "border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.6)] text-[var(--text-secondary)]";

  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border px-4 py-3 ${stateClassName}`}>
      <span aria-hidden="true" className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center border ${iconClassName}`}>
        {state === "ready" ? (
          <svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6.2L4.6 8.8L10 3.4" stroke="currentColor" strokeLinecap="square" strokeWidth="1.5" />
          </svg>
        ) : state === "blocked" ? (
          <svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 2.2V6.5" stroke="currentColor" strokeLinecap="square" strokeWidth="1.5" />
            <path d="M6 8.8V9.2" stroke="currentColor" strokeLinecap="square" strokeWidth="1.5" />
          </svg>
        ) : (
          <svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" fill="currentColor" r="1.2" />
          </svg>
        )}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="font-heading text-xs uppercase tracking-[0.18em] text-[var(--cream-white)]">{label}</p>
        {detail ? <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{detail}</p> : null}
      </div>
    </li>
  );
}

function toChecklistState(tone: "neutral" | "positive" | "warning"): "blocked" | "info" | "ready" {
  switch (tone) {
    case "positive":
      return "ready";
    case "warning":
      return "blocked";
    default:
      return "info";
  }
}

function BlockingChecklist({ deployment }: DeployWorkflowViewProps) {
  const account = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const target = getDeploymentTarget(deployment.selectedTarget);
  const balanceQuery = useTargetBalance(account?.address ?? null, deployment.selectedTarget);
  const balanceState = getBalanceState({
    isConnected: account !== null && currentWallet.isConnected,
    isError: balanceQuery.isError,
    isPending: balanceQuery.isPending,
    requiresWallet: target.supportsWalletSigning,
    totalBalance: balanceQuery.data?.totalBalance ?? null,
  });
  const resolvedInputs = new Set(deployment.resolvedInputs);

  return (
    <section className="space-y-4 border border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.78)] p-5">
      <div className="space-y-2">
        <h3 className="font-heading text-lg uppercase tracking-[0.08em] text-[var(--cream-white)]">Deployment checks</h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Review the deployment prerequisites and current wallet balance before publishing the generated Move package.
        </p>
      </div>

      <ul className="space-y-3">
        {deployment.requiredInputs.map((requiredInput) => {
          const isResolved = resolvedInputs.has(requiredInput);

          return (
            <ChecklistItem
              detail={isResolved ? undefined : "Still required before deployment can continue."}
              key={requiredInput}
              label={requiredInput}
              state={isResolved ? "ready" : "blocked"}
            />
          );
        })}

        <ChecklistItem
          detail={balanceState.label}
          label="SUI token balance"
          state={toChecklistState(balanceState.tone)}
        />
      </ul>

      {deployment.blockerReasons.length > 0 ? (
        <div className="border border-[rgba(255,71,0,0.35)] bg-[rgba(81,26,18,0.4)] p-4">
          <p className="font-heading text-xs uppercase tracking-[0.18em] text-[var(--brand-orange)]">Current blockers</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--cream-white)]">
            {deployment.blockerReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function DeploymentStatusSummary({ deployment }: DeployWorkflowViewProps) {
  const statusHeadline = getDeploymentStatusHeadline(deployment);
  const statusDetails = getDeploymentStatusDetails(deployment);

  return (
    <section className="space-y-4 border border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.78)] p-5">
      <div className="space-y-2">
        <h3 className="font-heading text-lg uppercase tracking-[0.08em] text-[var(--cream-white)]">Deployment status</h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          Latest workflow feedback for the selected target and current artifact.
        </p>
      </div>

      <div className="space-y-3 text-sm leading-relaxed text-[var(--cream-white)]">
        <p>{statusHeadline}</p>
        {statusDetails ? (
          <pre className="overflow-x-auto border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-4 py-3 font-mono text-xs leading-6 text-[var(--text-secondary)] whitespace-pre-wrap" aria-label="Deployment status details">
            <code>{statusDetails}</code>
          </pre>
        ) : null}
        {deployment.deploymentStatus?.packageId ? <p>Package ID: {deployment.deploymentStatus.packageId}</p> : null}
        {deployment.deploymentStatus?.confirmationReference ? <p>Transaction digest: {deployment.deploymentStatus.confirmationReference}</p> : null}
      </div>
    </section>
  );
}

function getDeploymentStatusHeadline(deployment: DeploymentState): string {
  if (deployment.statusMessage?.headline) {
    return deployment.statusMessage.headline;
  }

  if (deployment.deploymentStatus?.headline) {
    return deployment.deploymentStatus.headline;
  }

  return "No deployment attempt has been recorded for this graph revision yet.";
}

function getDeploymentStatusDetails(deployment: DeploymentState): string | null {
  if (deployment.statusMessage?.details) {
    return deployment.statusMessage.details;
  }

  return deployment.deploymentStatus?.nextActionSummary ?? null;
}

function getDeployActionCopy(input: {
  readonly canDeploy: boolean;
  readonly isDeploying: boolean;
  readonly isUpgrade: boolean;
  readonly selectedTargetLabel: string;
}) {
  const actionVerb = input.isUpgrade ? "Upgrade" : "Deploy";
  const inProgressVerb = input.isUpgrade ? "Upgrading" : "Deploying";

  return {
    actionLabel: input.isDeploying ? `${inProgressVerb} ${input.selectedTargetLabel}` : `${actionVerb} ${input.selectedTargetLabel}`,
    actionTitle: input.canDeploy
      ? undefined
      : `Review blockers for ${input.selectedTargetLabel} ${input.isUpgrade ? "upgrade" : "deployment"}`,
  };
}

function DeployWorkflowHeader({ deployment }: DeployWorkflowViewProps) {
  const isUpgrade = deployment.deploymentStatus?.status === "deployed";
  const targetLabel = getDeploymentTarget(deployment.selectedTarget).label;
  const { actionLabel, actionTitle } = getDeployActionCopy({
    canDeploy: deployment.canDeploy,
    isDeploying: deployment.isDeploying,
    isUpgrade,
    selectedTargetLabel: targetLabel,
  });

  return (
    <header className="grid gap-4 border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.72)] p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="space-y-3">
        <p className="font-heading text-[0.7rem] uppercase tracking-[0.32em] text-[var(--brand-orange)]">Deploy</p>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl uppercase tracking-[0.08em] text-[var(--cream-white)]">Pre-flight deployment checks</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Review target readiness, wallet availability, and artifact state before publishing the current generated Move package.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          <span>Target: {targetLabel}</span>
          <span>{deployment.canDeploy ? "Ready to deploy" : "Review blockers before deploying"}</span>
          {deployment.isDeploying ? <span>Deployment in progress</span> : null}
        </div>
      </div>

      <button
        aria-label={actionLabel}
        className="ff-header__button ff-deploy-workflow__action"
        disabled={deployment.isDeploying}
        onClick={() => {
          void deployment.startDeployment();
        }}
        title={actionTitle}
        type="button"
      >
        <span aria-hidden="true" className="ff-header__button-icon">
          <ConservativeDeployIcon />
        </span>
        <span className="ff-header__button-label">{actionLabel}</span>
      </button>
    </header>
  );
}

function DeployWorkflowView({ deployment }: DeployWorkflowViewProps) {
  return (
    <section aria-label="Deploy workflow" className="flex flex-1 min-h-0 overflow-auto border-y border-[var(--ui-border-dark)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <DeployWorkflowHeader deployment={deployment} />

        <div className="grid gap-6">
          <BlockingChecklist deployment={deployment} />
          <DeploymentStatusSummary deployment={deployment} />
        </div>
      </div>
    </section>
  );
}

export default DeployWorkflowView;