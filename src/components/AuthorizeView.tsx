import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState } from "react";

import type { StoredDeploymentState } from "../types/authorization";
import { useTurretList } from "../hooks/useTurretList";
import AuthorizeTurretList from "./AuthorizeTurretList";

interface AuthorizeViewProps {
  readonly deploymentState: StoredDeploymentState | null;
}

interface AuthorizeViewPanelProps {
  readonly deploymentState: StoredDeploymentState | null;
  readonly errorMessage: string | null;
  readonly onRetry: () => void;
  readonly status: ReturnType<typeof useTurretList>["status"];
}

function AuthorizeViewActions({ selectedTurretCount }: { readonly selectedTurretCount: number }) {
  const summary = selectedTurretCount === 0
    ? "Select at least one turret to continue."
    : `${String(selectedTurretCount)} turret${selectedTurretCount === 1 ? "" : "s"} ready for authorization.`;

  return (
    <div className="ff-authorize-view__actions">
      <p className="ff-authorize-view__selection-summary">{summary}</p>
      <button className="ff-authorize-view__action ff-authorize-view__action--primary" disabled={selectedTurretCount === 0} type="button">
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

function AuthorizeView({ deploymentState }: AuthorizeViewProps) {
  const account = useCurrentAccount();
  const [selectedTurretIds, setSelectedTurretIds] = useState<readonly string[]>([]);
  const turretList = useTurretList({
    deploymentState,
    walletAddress: account?.address ?? null,
  });

  return (
    <section aria-label="Authorize view" className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]">
      <div className="ff-authorize-view">
        <header className="flex flex-col gap-2 border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.68)] p-5">
          <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">
            Deployment Authorization
          </p>
          <h1 className="font-heading text-xl uppercase tracking-[0.14em] text-[var(--cream-white)] sm:text-2xl">
            Authorize Turrets
          </h1>
          <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
            Select owned turrets, confirm the active extension state, and stage the authorization batch for the deployed contract.
          </p>
        </header>

        <div className="ff-authorize-view__grid">
          <div className="ff-authorize-view__primary">
            {turretList.status === "success" && turretList.turrets.length > 0 ? (
              <>
                <AuthorizeTurretList onSelectionChange={setSelectedTurretIds} turrets={turretList.turrets} />
                <AuthorizeViewActions selectedTurretCount={selectedTurretIds.length} />
              </>
            ) : null}
            {!(turretList.status === "success" && turretList.turrets.length > 0) ? (
              <>
                <AuthorizeViewStatePanel
                  deploymentState={deploymentState}
                  errorMessage={turretList.errorMessage}
                  onRetry={() => {
                    void turretList.refresh();
                  }}
                  status={turretList.status}
                />
                <AuthorizeViewActions selectedTurretCount={0} />
              </>
            ) : null}
          </div>

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
                <div>
                  <dt className="font-heading text-[0.68rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">Package</dt>
                  <dd className="mt-1 break-all text-[var(--cream-white)]">{deploymentState.packageId}</dd>
                </div>
                <div>
                  <dt className="font-heading text-[0.68rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">Module</dt>
                  <dd className="mt-1 text-[var(--cream-white)]">{deploymentState.moduleName}</dd>
                </div>
                <div>
                  <dt className="font-heading text-[0.68rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">Target</dt>
                  <dd className="mt-1 text-[var(--cream-white)]">{deploymentState.targetId}</dd>
                </div>
                <div>
                  <dt className="font-heading text-[0.68rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">Wallet</dt>
                  <dd className="mt-1 break-all text-[var(--cream-white)]">{account?.address ?? "Connect wallet"}</dd>
                </div>
              </dl>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

export default AuthorizeView;