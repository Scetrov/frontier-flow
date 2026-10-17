import { useCallback, useEffect, useState } from "react";

import SharedExtensionTrustNotice from "./SharedExtensionTrustNotice";
import type { StoredDeploymentState } from "../types/authorization";
import { resolveSharedAuthorizationContract } from "../hooks/useAuthorizationContracts";
import { parseOnboardingLink, type OnboardingLinkParams } from "../utils/onboardingLink";
import {
  addSharedExtension,
  loadSharedExtensions,
  saveSharedExtensions,
  type SharedExtension,
} from "../utils/sharedExtensionStorage";
import { mergeUiState } from "../utils/uiStateStorage";
import { formatAddress } from "../utils/formatAddress";

type OnboardState =
  | { readonly status: "invalid"; readonly reason: string }
  | { readonly status: "resolving"; readonly params: OnboardingLinkParams }
  | { readonly status: "failed"; readonly params: OnboardingLinkParams; readonly reason: string }
  | { readonly status: "ready"; readonly params: OnboardingLinkParams; readonly contract: StoredDeploymentState };

function browserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

/**
 * Verify the contract a link names, then hand off to the authorize view.
 *
 * The link is a way to find a contract, never a way to consent to one: nothing
 * is saved and no turret is touched until the reader confirms, having been told
 * what the verification does and does not establish.
 */
function useOnboardingTarget(search: string): OnboardState {
  const [state, setState] = useState<OnboardState>(() => {
    const parsed = parseOnboardingLink(search);
    return parsed.ok ? { status: "resolving", params: parsed.params } : { status: "invalid", reason: parsed.reason };
  });

  useEffect(() => {
    if (state.status !== "resolving") return;
    const controller = new AbortController();
    const { params } = state;
    resolveSharedAuthorizationContract({ packageId: params.packageId, targetId: params.targetId, signal: controller.signal })
      .then((contract) => {
        if (controller.signal.aborted) return;
        if (contract.moduleName !== params.moduleName) {
          setState({
            status: "failed",
            params,
            reason: `This link names the module "${params.moduleName}", but that package declares "${contract.moduleName}". Ask whoever shared the link to confirm it.`,
          });
          return;
        }

        setState({ status: "ready", params, contract });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "failed", params, reason: error instanceof Error ? error.message : "That package could not be read." });
      });
    return () => { controller.abort(); };
  }, [state]);

  return state;
}

function OnboardSummary({ contract, params }: { readonly contract: StoredDeploymentState; readonly params: OnboardingLinkParams }) {
  return (
    <dl className="grid gap-3 border border-[var(--ui-border-dark)] p-4 text-sm">
      <div className="grid gap-1">
        <dt className="font-heading text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Contract</dt>
        <dd className="text-[var(--cream-white)]">{contract.contractName}</dd>
      </div>
      <div className="grid gap-1">
        <dt className="font-heading text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Module</dt>
        <dd className="text-[var(--cream-white)]">{contract.moduleName}</dd>
      </div>
      <div className="grid gap-1">
        <dt className="font-heading text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Package</dt>
        <dd className="break-all font-mono text-xs text-[var(--cream-white)]">{contract.packageId}</dd>
      </div>
      <div className="grid gap-1">
        <dt className="font-heading text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">Network</dt>
        <dd className="text-[var(--cream-white)]">{params.targetId}</dd>
      </div>
    </dl>
  );
}

/**
 * Standalone onboarding route: resolve a shared contract from a link so a
 * turret owner can authorize against it without deploying anything.
 */
function OnboardPage({ search, origin }: { readonly search?: string; readonly origin?: string }) {
  const resolvedSearch = search ?? (typeof window === "undefined" ? "" : window.location.search);
  const state = useOnboardingTarget(resolvedSearch);
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = useCallback(() => {
    if (state.status !== "ready") return;
    setIsSaving(true);
    const storage = browserStorage();
    const extension: SharedExtension = { ...state.contract, targetId: state.params.targetId };
    saveSharedExtensions(storage, addSharedExtension(loadSharedExtensions(storage), extension));
    mergeUiState(storage, { activeView: "authorize", selectedDeploymentTarget: state.params.targetId });
    if (typeof window !== "undefined") window.location.assign(origin ?? "/");
  }, [origin, state]);

  return (
    <main aria-label="Onboarding page" className="mx-auto grid max-w-2xl gap-6 px-4 py-10 text-[var(--text-primary)]">
      <header className="grid gap-2">
        <p className="font-heading text-xs uppercase tracking-[0.16em] text-[var(--brand-orange)]">Turret Onboarding</p>
        <h1 className="font-heading text-2xl uppercase tracking-[0.08em]">Use shared turret logic</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Someone shared a published turret extension with you. Nothing is republished and nothing is
          deployed &mdash; your turrets are pointed at their existing contract.
        </p>
      </header>

      {state.status === "invalid" || state.status === "failed" ? (
        <section className="grid gap-3 border border-[var(--ui-border-dark)] p-4">
          <h2 className="font-heading text-sm uppercase tracking-[0.12em] text-[var(--brand-orange)]">This link cannot be used</h2>
          <p className="text-sm text-[var(--text-secondary)]">{state.status === "invalid" ? state.reason : state.reason}</p>
          <a className="text-sm text-[var(--brand-orange)] underline" href="/">Open Frontier Flow instead</a>
        </section>
      ) : null}

      {state.status === "resolving" ? (
        <section className="border border-[var(--ui-border-dark)] p-4" role="status">
          <p className="text-sm text-[var(--text-secondary)]">
            Checking {formatAddress(state.params.packageId)} on {state.params.targetId}&hellip;
          </p>
        </section>
      ) : null}

      {state.status === "ready" ? (
        <section className="grid gap-4">
          <OnboardSummary contract={state.contract} params={state.params} />
          <SharedExtensionTrustNotice />
          <div className="flex flex-wrap gap-2">
            <button
              className="border border-[var(--brand-orange)] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[var(--brand-orange)] disabled:opacity-50"
              disabled={isSaving}
              onClick={handleConfirm}
              type="button"
            >
              {isSaving ? "Opening…" : "Use this contract"}
            </button>
            <a className="border border-[var(--ui-border-dark)] px-4 py-2 text-sm uppercase tracking-[0.12em] text-[var(--text-secondary)]" href="/">
              Cancel
            </a>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Choosing this contract saves it for your browser and opens Authorize, where you pick which of
            your turrets to authorize. No turret is changed until you authorize it there.
          </p>
        </section>
      ) : null}
    </main>
  );
}

export default OnboardPage;
