import { useCurrentAccount, useCurrentWallet, useSuiClient } from "@mysten/dapp-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StoredDeploymentState } from "../types/authorization";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { useAuthorization } from "../hooks/useAuthorization";
import { useTurretSimulation } from "../hooks/useTurretSimulation";
import { useTurretList } from "../hooks/useTurretList";
import AuthorizationProgressModal from "./AuthorizationProgressModal";
import AuthorizeTurretList from "./AuthorizeTurretList";
import type { PrimaryView } from "./Header";
import TurretSimulationModal from "./TurretSimulationModal";

type AuthorizeWorkflowView = Extract<PrimaryView, "authorize" | "simulate">;

interface AuthorizeViewProps {
  readonly activeView?: AuthorizeWorkflowView;
  readonly deploymentState: StoredDeploymentState | null;
  readonly onViewChange?: (view: PrimaryView) => void;
}

interface AuthorizeViewPanelProps {
  readonly deploymentState: StoredDeploymentState | null;
  readonly errorMessage: string | null;
  readonly onRetry: () => void;
  readonly status: ReturnType<typeof useTurretList>["status"];
}

interface AuthorizeViewPrimaryPanelProps {
  readonly authorization: ReturnType<typeof useAuthorization>;
  readonly deploymentKey: string | null;
  readonly deploymentState: StoredDeploymentState | null;
  readonly handleAuthorize: () => void;
  readonly handleSelectionChange: (turretIds: readonly string[]) => void;
  readonly listInstanceKey: number;
  readonly onViewChange?: (view: PrimaryView) => void;
  readonly selectedTurretIds: readonly string[];
  readonly turretList: ReturnType<typeof useTurretList>;
  readonly turretSimulation: ReturnType<typeof useTurretSimulation>;
}

interface AuthorizeViewSelectionState {
  readonly deploymentKey: string | null;
  readonly turretIds: readonly string[];
}

function getAuthorizeDeploymentKey(deploymentState: StoredDeploymentState | null): string | null {
  return deploymentState === null
    ? null
    : `${deploymentState.targetId}:${deploymentState.packageId}:${deploymentState.moduleName}`;
}

function getAuthorizeViewHeaderCopy(activeView: AuthorizeWorkflowView): {
  readonly eyebrow: string;
  readonly summary: string;
  readonly title: string;
} {
  if (activeView === "simulate") {
    return {
      eyebrow: "Deployment Simulation",
      summary: "Review a live turret context, adjust the candidate draft, and run a non-mutating extension simulation before authorizing on-chain.",
      title: "Simulate Turrets",
    };
  }

  return {
    eyebrow: "Deployment Authorization",
    summary: "Select owned turrets, confirm the active extension state, and stage the authorization batch for the deployed contract.",
    title: "Authorize Turrets",
  };
}

function AuthorizeViewHeader({ activeView }: { readonly activeView: AuthorizeWorkflowView }) {
  const copy = getAuthorizeViewHeaderCopy(activeView);

  return (
    <header className="flex flex-col gap-2 border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.68)] p-5">
      <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">
        {copy.eyebrow}
      </p>
      <h1 className="font-heading text-xl uppercase tracking-[0.14em] text-[var(--cream-white)] sm:text-2xl">
        {copy.title}
      </h1>
      <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
        {copy.summary}
      </p>
    </header>
  );
}

function getSuiScanHref(
  targetId: StoredDeploymentState["targetId"],
  resource: "account" | "object",
  value: string,
): string | null {
  const target = getDeploymentTarget(targetId);

  if (target.networkFamily === "local") {
    return null;
  }

  return `https://suiscan.xyz/${target.networkFamily}/${resource}/${encodeURIComponent(value)}`;
}

function AuthorizeDeploymentField(input: {
  readonly action?: React.ReactNode;
  readonly href?: string | null;
  readonly label: string;
  readonly value: string;
}) {
  const { action, href = null, label, value } = input;
  const content = (
    <pre className="overflow-x-auto border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 font-mono text-xs leading-6 text-[var(--cream-white)] whitespace-pre-wrap break-all">
      <code>{value}</code>
    </pre>
  );

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <dt className="font-heading text-[0.68rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">{label}</dt>
        {action}
      </div>
      <dd className="mt-0 min-w-0 text-[var(--cream-white)]">
        {href === null ? content : (
          <a
            className="group block focus-visible:outline-none"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            <div className="transition-colors group-hover:text-[var(--brand-orange)] group-focus-visible:text-[var(--brand-orange)]">
              {content}
            </div>
          </a>
        )}
      </dd>
    </div>
  );
}

const COPY_BUTTON_CLASS_NAME = "inline-flex shrink-0 items-center border border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.52)] px-2 py-1 font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-orange)] hover:text-[var(--cream-white)] disabled:cursor-default disabled:hover:border-[var(--ui-border-dark)] disabled:hover:text-[var(--text-secondary)]";

function CopyFieldButton({ field, copiedField, onCopy }: {
  readonly field: "package" | "wallet";
  readonly copiedField: "package" | "wallet" | null;
  readonly onCopy: () => void;
}) {
  const isCopied = copiedField === field;
  const label = field === "package" ? "package id" : "wallet address";

  return (
    <button
      aria-label={isCopied ? `Copied ${label}` : `Copy ${label}`}
      className={COPY_BUTTON_CLASS_NAME}
      onClick={onCopy}
      type="button"
    >
      {isCopied ? "Copied" : "Copy"}
    </button>
  );
}

function AuthorizeDeploymentPanel(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly walletAddress: string | null | undefined;
}) {
  const { deploymentState, walletAddress } = input;
  const [copiedField, setCopiedField] = useState<"package" | "wallet" | null>(null);

  useEffect(() => {
    if (copiedField === null) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedField(null);
    }, 1_500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedField]);

  const handleCopy = useCallback(async (field: "package" | "wallet", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
  }, []);

  const packageHref = deploymentState === null
    ? null
    : getSuiScanHref(deploymentState.targetId, "object", deploymentState.packageId);
  const walletHref = deploymentState !== null && walletAddress != null
    ? getSuiScanHref(deploymentState.targetId, "account", walletAddress)
    : null;

  return (
    <aside className="border border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.78)] p-5">
      <h2 className="font-heading text-sm uppercase tracking-[0.16em] text-[var(--cream-white)]">
        Active Deployment
      </h2>
      {deploymentState === null ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          No valid deployed contract is available for authorization.
        </p>
      ) : (
        <dl className="mt-4 grid gap-3 text-sm text-[var(--text-secondary)]">
          <AuthorizeDeploymentField
            action={(
              <CopyFieldButton copiedField={copiedField} field="package" onCopy={() => { void handleCopy("package", deploymentState.packageId); }} />
            )}
            href={packageHref}
            label="Package"
            value={deploymentState.packageId}
          />
          <AuthorizeDeploymentField label="Module" value={deploymentState.moduleName} />
          <AuthorizeDeploymentField label="Target" value={deploymentState.targetId} />
          <AuthorizeDeploymentField
            action={walletAddress ? (
              <CopyFieldButton copiedField={copiedField} field="wallet" onCopy={() => { void handleCopy("wallet", walletAddress); }} />
            ) : undefined}
            href={walletHref}
            label="Wallet"
            value={walletAddress ?? "Connect wallet"}
          />
        </dl>
      )}
    </aside>
  );
}

function useAuthorizeViewSelection(input: {
  readonly authorization: ReturnType<typeof useAuthorization>;
  readonly deploymentKey: string | null;
  readonly turretList: ReturnType<typeof useTurretList>;
}) {
  const { authorization, deploymentKey, turretList } = input;
  const [listInstanceKey, setListInstanceKey] = useState(0);
  const [selectionState, setSelectionState] = useState<AuthorizeViewSelectionState>({ deploymentKey: null, turretIds: [] });
  const deploymentKeyRef = useRef<string | null>(null);
  const selectedTurretIds = useMemo(
    () => selectionState.deploymentKey === deploymentKey ? selectionState.turretIds : [],
    [deploymentKey, selectionState],
  );

  useEffect(() => {
    if (deploymentKeyRef.current === null) {
      deploymentKeyRef.current = deploymentKey;
      return;
    }

    if (deploymentKeyRef.current !== deploymentKey) {
      deploymentKeyRef.current = deploymentKey;
      authorization.cancelAuthorization();
      return;
    }

    deploymentKeyRef.current = deploymentKey;
  }, [authorization, deploymentKey]);

  const clearSelection = useCallback(() => {
    setSelectionState({ deploymentKey, turretIds: [] });
    setListInstanceKey((value) => value + 1);
  }, [deploymentKey]);

  const handleAuthorize = useCallback(() => {
    if (selectedTurretIds.length === 0) {
      return;
    }

    const turretIds = [...selectedTurretIds];
    clearSelection();
    void authorization.startAuthorization(turretIds);
  }, [authorization, clearSelection, selectedTurretIds]);

  const handleDismissProgress = useCallback(() => {
    const hasCompletedBatch = authorization.progress?.completedAt !== null;
    authorization.dismissProgress();

    if (hasCompletedBatch) {
      clearSelection();
      turretList.refresh();
    }
  }, [authorization, clearSelection, turretList]);

  const handleSelectionChange = useCallback((turretIds: readonly string[]) => {
    setSelectionState({ deploymentKey, turretIds });
  }, [deploymentKey]);

  return {
    handleAuthorize,
    handleDismissProgress,
    handleSelectionChange,
    listInstanceKey,
    selectedTurretIds,
  };
}

function AuthorizeViewActions(input: {
  readonly isAuthorizing: boolean;
  readonly onAuthorize: () => void;
  readonly selectedTurretCount: number;
}) {
  const { isAuthorizing, onAuthorize, selectedTurretCount } = input;
  const summary = isAuthorizing
    ? "Authorization batch is running. Keep this window connected until every turret settles."
    : selectedTurretCount === 0
      ? "Select at least one turret to continue."
      : `${String(selectedTurretCount)} turret${selectedTurretCount === 1 ? "" : "s"} ready for authorization.`;

  return (
    <div className="ff-authorize-view__actions">
      <p className="ff-authorize-view__selection-summary">{summary}</p>
      <button
        className="ff-authorize-view__action ff-authorize-view__action--primary"
        disabled={selectedTurretCount === 0 || isAuthorizing}
        onClick={onAuthorize}
        type="button"
      >
        Authorize Selected
      </button>
    </div>
  );
}

function AuthorizeViewStatePanel({ deploymentState, errorMessage, onRetry, status }: AuthorizeViewPanelProps) {
  if (deploymentState === null) {
    return (
      <div className="ff-authorize-view__state-card">
        <h2 className="ff-authorize-view__state-title">Deployment Required</h2>
        <p className="ff-authorize-view__state-copy">
          Deploy a published contract before you can fetch owned turrets for authorization.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="ff-authorize-view__state-card" role="status">
        <span aria-hidden="true" className="ff-authorize-view__spinner" />
        <div>
          <h2 className="ff-authorize-view__state-title">Scanning deployed turrets</h2>
          <p className="ff-authorize-view__state-copy">
            Querying {deploymentState.targetId} for turret objects owned by the connected wallet.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="ff-authorize-view__state-card ff-authorize-view__state-card--error">
        <div>
          <h2 className="ff-authorize-view__state-title">Turret query failed</h2>
          <p className="ff-authorize-view__state-copy">{errorMessage ?? "Failed to load turrets."}</p>
        </div>
        <button className="ff-authorize-view__action" onClick={onRetry} type="button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="ff-authorize-view__state-card">
      <div>
        <h2 className="ff-authorize-view__state-title">No turrets found</h2>
        <p className="ff-authorize-view__state-copy">
          This wallet does not currently own any turrets on {deploymentState.targetId}.
        </p>
      </div>
    </div>
  );
}

function AuthorizeViewPrimaryPanel({
  authorization,
  deploymentKey,
  deploymentState,
  handleAuthorize,
  handleSelectionChange,
  listInstanceKey,
  onViewChange,
  selectedTurretIds,
  turretList,
  turretSimulation,
}: AuthorizeViewPrimaryPanelProps) {
  const hasTurrets = turretList.status === "success" && turretList.turrets.length > 0;

  if (hasTurrets) {
    return (
      <>
        <AuthorizeTurretList
          key={`${deploymentKey ?? "no-deployment"}:${String(listInstanceKey)}`}
          onSimulate={(turret) => {
            if (deploymentState === null || deploymentKey === null) {
              return;
            }

            turretSimulation.openSimulation({
              deploymentKey,
              deploymentState,
              turret,
            });
            onViewChange?.("simulate");
          }}
          onSelectionChange={handleSelectionChange}
          turrets={turretList.turrets}
        />
        <AuthorizeViewActions
          isAuthorizing={authorization.isAuthorizing}
          onAuthorize={handleAuthorize}
          selectedTurretCount={selectedTurretIds.length}
        />
      </>
    );
  }

  return (
    <>
      <AuthorizeViewStatePanel
        deploymentState={deploymentState}
        errorMessage={turretList.errorMessage}
        onRetry={turretList.refresh}
        status={turretList.status}
      />
      <AuthorizeViewActions isAuthorizing={authorization.isAuthorizing} onAuthorize={handleAuthorize} selectedTurretCount={0} />
    </>
  );
}

function AuthorizeSimulationEmptyState({ onViewChange }: {
  readonly onViewChange?: (view: PrimaryView) => void;
}) {
  return (
    <div className="ff-authorize-view__state-card">
      <div>
        <h2 className="ff-authorize-view__state-title">Simulation Context Required</h2>
        <p className="ff-authorize-view__state-copy">
          Open a turret from the Authorize roster to review live deployment context and run a non-mutating simulation.
        </p>
      </div>
      <button className="ff-authorize-view__action" onClick={() => { onViewChange?.("authorize"); }} type="button">
        Open Authorize
      </button>
    </div>
  );
}

function AuthorizeSimulationPanel(input: {
  readonly onViewChange?: (view: PrimaryView) => void;
  readonly turretList: ReturnType<typeof useTurretList>;
  readonly turretSimulation: ReturnType<typeof useTurretSimulation>;
}) {
  const { onViewChange, turretList, turretSimulation } = input;

  if (turretSimulation.session.status === "closed") {
    return <AuthorizeSimulationEmptyState onViewChange={onViewChange} />;
  }

  return (
    <TurretSimulationModal
      onApplySuggestion={turretSimulation.applySuggestion}
      closeLabel="Back to Authorize"
      onClose={() => {
        onViewChange?.("authorize");
      }}
      onLoadSuggestions={(field, query) => {
        void turretSimulation.loadSuggestions(field, query);
      }}
      onRefreshContext={() => {
        turretList.refresh();
        void turretSimulation.refreshContext();
      }}
      onRunSimulation={() => {
        void turretSimulation.runSimulation();
      }}
      onSetLookupQuery={turretSimulation.setLookupQuery}
      onUpdateField={turretSimulation.updateField}
      session={turretSimulation.session}
    />
  );
}

function AuthorizeView({ activeView = "authorize", deploymentState, onViewChange }: AuthorizeViewProps) {
  const account = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const suiClient = useSuiClient();
  const turretList = useTurretList({
    deploymentState,
    walletAddress: account?.address ?? null,
  });
  const authorization = useAuthorization({
    deploymentState,
    walletAccount: account,
    currentWallet,
    suiClient,
  });
  const deploymentKey = getAuthorizeDeploymentKey(deploymentState);
  const turretSimulation = useTurretSimulation({
    deploymentKey,
    deploymentState,
    suiClient,
    turrets: turretList.turrets,
    walletAddress: account?.address ?? null,
  });
  const {
    handleAuthorize,
    handleDismissProgress,
    handleSelectionChange,
    listInstanceKey,
    selectedTurretIds,
  } = useAuthorizeViewSelection({ authorization, deploymentKey, turretList });

  return (
    <section aria-label={activeView === "simulate" ? "Simulate view" : "Authorize view"} className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]">
      <div className="ff-authorize-view">
        <AuthorizeViewHeader activeView={activeView} />

        <div className="ff-authorize-view__grid">
          <div className="ff-authorize-view__primary">
            {activeView === "simulate" ? (
              <AuthorizeSimulationPanel onViewChange={onViewChange} turretList={turretList} turretSimulation={turretSimulation} />
            ) : (
              <AuthorizeViewPrimaryPanel
                authorization={authorization}
                deploymentKey={deploymentKey}
                deploymentState={deploymentState}
                handleAuthorize={handleAuthorize}
                handleSelectionChange={handleSelectionChange}
                listInstanceKey={listInstanceKey}
                onViewChange={onViewChange}
                selectedTurretIds={selectedTurretIds}
                turretList={turretList}
                turretSimulation={turretSimulation}
              />
            )}
          </div>

          <AuthorizeDeploymentPanel deploymentState={deploymentState} walletAddress={account?.address} />
        </div>
      </div>

      <AuthorizationProgressModal
        onClose={handleDismissProgress}
        onRetryEventConfirmation={(turretObjectId) => {
          void authorization.retryEventConfirmation(turretObjectId);
        }}
        progress={authorization.progress}
      />
    </section>
  );
}

export default AuthorizeView;