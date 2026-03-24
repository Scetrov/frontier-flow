import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClientQuery,
  useWallets,
} from "@mysten/dapp-kit";

import type { DeploymentState } from "../compiler/types";
import { getDeploymentTarget } from "../data/deploymentTargets";
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

function getWalletState(input: {
  readonly hasWallets: boolean;
  readonly isConnected: boolean;
  readonly requiresWallet: boolean;
}) {
  if (!input.requiresWallet) {
    return {
      label: "Not required for local deployment",
      tone: "neutral",
    } as const;
  }

  if (input.isConnected) {
    return {
      label: "Connected wallet detected",
      tone: "positive",
    } as const;
  }

  if (input.hasWallets) {
    return {
      label: "Wallet available but not connected",
      tone: "warning",
    } as const;
  }

  return {
    label: "No compatible wallet detected",
    tone: "warning",
  } as const;
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
  const stateClassName = state === "ready"
    ? "border-[rgba(70,173,109,0.4)] bg-[rgba(32,73,42,0.4)] text-[var(--cream-white)]"
    : state === "blocked"
      ? "border-[rgba(255,71,0,0.4)] bg-[rgba(81,26,18,0.45)] text-[var(--cream-white)]"
      : "border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.6)] text-[var(--text-secondary)]";
  const badgeLabel = state === "ready" ? "Ready" : state === "blocked" ? "Blocked" : "Info";

  return (
    <li className={`flex items-start justify-between gap-4 border px-4 py-3 ${stateClassName}`}>
      <div className="space-y-1">
        <p className="font-heading text-xs uppercase tracking-[0.18em]">{label}</p>
        {detail ? <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{detail}</p> : null}
      </div>
      <span className="shrink-0 font-heading text-[0.65rem] uppercase tracking-[0.22em] text-[var(--brand-orange)]">{badgeLabel}</span>
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
  const resolvedInputs = new Set(deployment.resolvedInputs);

  return (
    <section className="space-y-4 border border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.78)] p-5">
      <div className="space-y-2">
        <h3 className="font-heading text-lg uppercase tracking-[0.08em] text-[var(--cream-white)]">Blocking prerequisites</h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          These checks come from the existing deployment validation pipeline and decide whether the deploy action is enabled.
        </p>
      </div>

      <ul className="space-y-3">
        {deployment.requiredInputs.map((requiredInput) => {
          const isResolved = resolvedInputs.has(requiredInput);

          return (
            <ChecklistItem
              detail={isResolved ? "Requirement satisfied for the selected target." : "Still required before deployment can continue."}
              key={requiredInput}
              label={requiredInput}
              state={isResolved ? "ready" : "blocked"}
            />
          );
        })}
      </ul>

      {deployment.blockerReasons.length > 0 ? (
        <div className="border border-[rgba(255,71,0,0.35)] bg-[rgba(81,26,18,0.4)] p-4">
          <p className="font-heading text-xs uppercase tracking-[0.18em] text-[var(--brand-orange)]">Current blockers</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--cream-white)]">
            {deployment.blockerReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ) : (
        <div className="border border-[rgba(70,173,109,0.35)] bg-[rgba(32,73,42,0.35)] p-4 text-sm leading-relaxed text-[var(--cream-white)]">
          All blocking deployment prerequisites are currently satisfied for {deployment.selectedTarget}.
        </div>
      )}
    </section>
  );
}

function InformationalChecks({ deployment }: DeployWorkflowViewProps) {
  const account = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const wallets = useWallets();
  const target = getDeploymentTarget(deployment.selectedTarget);
  const balanceQuery = useSuiClientQuery(
    "getBalance",
    { owner: account?.address ?? "0x0" },
    { enabled: account !== null && target.supportsWalletSigning, staleTime: 15_000 },
  );
  const walletState = getWalletState({
    hasWallets: wallets.length > 0,
    isConnected: account !== null && currentWallet.isConnected,
    requiresWallet: target.supportsWalletSigning,
  });
  const balanceState = getBalanceState({
    isConnected: account !== null && currentWallet.isConnected,
    isError: balanceQuery.isError,
    isPending: balanceQuery.isPending,
    requiresWallet: target.supportsWalletSigning,
    totalBalance: balanceQuery.data?.totalBalance ?? null,
  });
  const walletChecklistState = toChecklistState(walletState.tone);
  const balanceChecklistState = toChecklistState(balanceState.tone);

  return (
    <section className="space-y-4 border border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.78)] p-5">
      <div className="space-y-2">
        <h3 className="font-heading text-lg uppercase tracking-[0.08em] text-[var(--cream-white)]">Informational checks</h3>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          These checks help the operator assess readiness, but they do not add new deploy blockers in this release.
        </p>
      </div>

      <ul className="space-y-3">
        <ChecklistItem label="Connected wallet" state={walletChecklistState} detail={walletState.label} />
        <ChecklistItem label="SUI token balance" state={balanceChecklistState} detail={balanceState.label} />
      </ul>
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
        {statusDetails ? <p className="text-[var(--text-secondary)]">{statusDetails}</p> : null}
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
  readonly selectedTarget: DeploymentState["selectedTarget"];
}) {
  const actionVerb = input.isUpgrade ? "Upgrade" : "Deploy";
  const inProgressVerb = input.isUpgrade ? "Upgrading" : "Deploying";

  return {
    actionLabel: input.isDeploying ? `${inProgressVerb} ${input.selectedTarget}` : `${actionVerb} ${input.selectedTarget}`,
    actionTitle: input.canDeploy
      ? undefined
      : `Review blockers for ${input.selectedTarget} ${input.isUpgrade ? "upgrade" : "deployment"}`,
  };
}

function DeployWorkflowHeader({ deployment }: DeployWorkflowViewProps) {
  const isUpgrade = deployment.deploymentStatus?.status === "deployed";
  const { actionLabel, actionTitle } = getDeployActionCopy({
    canDeploy: deployment.canDeploy,
    isDeploying: deployment.isDeploying,
    isUpgrade,
    selectedTarget: deployment.selectedTarget,
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
          <span>Target: {deployment.selectedTarget}</span>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)]">
          <BlockingChecklist deployment={deployment} />

          <div className="space-y-6">
            <InformationalChecks deployment={deployment} />
            <DeploymentStatusSummary deployment={deployment} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default DeployWorkflowView;