import { useCurrentAccount, useCurrentWallet, useSuiClient } from "@mysten/dapp-kit";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { StoredDeploymentState } from "../types/authorization";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { useAuthorization } from "../hooks/useAuthorization";
import { useAuthorizationContracts } from "../hooks/useAuthorizationContracts";
import { useTurretSimulation } from "../hooks/useTurretSimulation";
import { useTurretList } from "../hooks/useTurretList";
import { formatAddress } from "../utils/formatAddress";
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
  readonly handleOpenSimulation: (turretObjectId: string) => void;
  readonly handleSelectionChange: (turretIds: readonly string[]) => void;
  readonly listInstanceKey: number;
  readonly selectedTurretIds: readonly string[];
  readonly turretList: ReturnType<typeof useTurretList>;
}

interface AuthorizeContractSelectorProps {
  readonly contracts: readonly StoredDeploymentState[];
  readonly errorMessage: string | null;
  readonly isLoading: boolean;
  readonly onChange?: (deploymentKey: string) => void;
  readonly selectedDeploymentKey: string | null;
}

interface AuthorizeSimulationSelectorPanelProps {
  readonly deploymentState: StoredDeploymentState | null;
  readonly onRetry: () => void;
  readonly onTurretChange: (turretObjectId: string) => void;
  readonly turretList: ReturnType<typeof useTurretList>;
  readonly selectedTurretObjectId: string | null;
}

interface AuthorizeViewSelectionState {
  readonly deploymentKey: string | null;
  readonly turretIds: readonly string[];
}

interface AuthorizeViewModel {
  readonly account: ReturnType<typeof useCurrentAccount>;
  readonly authorization: ReturnType<typeof useAuthorization>;
  readonly contractSelector: AuthorizeContractSelectorProps;
  readonly deploymentKey: string | null;
  readonly handleAuthorize: () => void;
  readonly handleDismissProgress: () => void;
  readonly handleOpenSimulation: (turretObjectId: string) => void;
  readonly handleSelectionChange: (turretIds: readonly string[]) => void;
  readonly listInstanceKey: number;
  readonly selectedDeploymentState: StoredDeploymentState | null;
  readonly selectedSimulationTurretId: string | null;
  readonly selectedTurretIds: readonly string[];
  readonly turretList: ReturnType<typeof useTurretList>;
  readonly turretSimulation: ReturnType<typeof useTurretSimulation>;
}

function getAuthorizeDeploymentKey(deploymentState: StoredDeploymentState | null): string | null {
  return deploymentState === null
    ? null
    : `${deploymentState.targetId}:${deploymentState.packageId}:${deploymentState.moduleName}`;
}

function getContractOptionLabel(deploymentState: StoredDeploymentState): string {
  const deploymentAgeLabel = getDeploymentAgeLabel(deploymentState.deployedAt);

  return deploymentAgeLabel === null
    ? `${deploymentState.contractName} · ${deploymentState.moduleName}`
    : `${deploymentState.contractName} · ${deploymentState.moduleName} (${deploymentAgeLabel})`;
}

function getDeploymentAgeLabel(deployedAt: string): string | null {
  const deployedAtMs = Date.parse(deployedAt);

  if (!Number.isFinite(deployedAtMs) || deployedAtMs <= 0) {
    return null;
  }

  const elapsedMs = Date.now() - deployedAtMs;

  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return null;
  }

  const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));
  const elapsedDays = Math.floor(elapsedHours / 24);
  const remainingHours = elapsedHours % 24;

  if (elapsedDays > 0) {
    return remainingHours > 0
      ? `deployed ${String(elapsedDays)}d ${String(remainingHours)}h ago`
      : `deployed ${String(elapsedDays)}d ago`;
  }

  if (elapsedHours > 0) {
    return `deployed ${String(elapsedHours)}h ago`;
  }

  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  if (elapsedMinutes > 0) {
    return `deployed ${String(elapsedMinutes)}m ago`;
  }

  return "deployed just now";
}

function getTurretOptionLabel(turret: { readonly displayName: string | null; readonly objectId: string }): string {
  return turret.displayName ?? turret.objectId;
}

function getSimulationTurretPlaceholder(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly turretCount: number;
  readonly turretListStatus: ReturnType<typeof useTurretList>["status"];
}): string {
  if (input.deploymentState === null) {
    return "Deployment required";
  }

  if (input.turretListStatus === "loading") {
    return "Loading turrets...";
  }

  if (input.turretCount === 0) {
    return "No turrets available";
  }

  return "Select a turret";
}

function resolveSelectedDeploymentKey(input: {
  readonly contracts: readonly StoredDeploymentState[];
  readonly deploymentState: StoredDeploymentState | null;
  readonly requestedDeploymentKey: string | null;
}): string | null {
  if (input.contracts.length === 0) {
    return null;
  }

  if (
    input.requestedDeploymentKey !== null
    && input.contracts.some((contract) => getAuthorizeDeploymentKey(contract) === input.requestedDeploymentKey)
  ) {
    return input.requestedDeploymentKey;
  }

  const fallbackDeploymentKey = getAuthorizeDeploymentKey(input.deploymentState);

  if (
    fallbackDeploymentKey !== null
    && input.contracts.some((contract) => getAuthorizeDeploymentKey(contract) === fallbackDeploymentKey)
  ) {
    return fallbackDeploymentKey;
  }

  return getAuthorizeDeploymentKey(input.contracts[0]);
}

function resolveSelectedDeploymentState(input: {
  readonly contracts: readonly StoredDeploymentState[];
  readonly deploymentState: StoredDeploymentState | null;
  readonly selectedDeploymentKey: string | null;
}): StoredDeploymentState | null {
  if (input.contracts.length === 0) {
    return input.deploymentState;
  }

  return input.contracts.find((contract) => getAuthorizeDeploymentKey(contract) === input.selectedDeploymentKey)
    ?? input.contracts[0];
}

function resolveSelectedSimulationTurretId(input: {
  readonly rawSelectedSimulationTurretId: string | null;
  readonly turrets: readonly { readonly objectId: string }[];
}): string | null {
  if (input.rawSelectedSimulationTurretId === null) {
    return null;
  }

  return input.turrets.some((turret) => turret.objectId === input.rawSelectedSimulationTurretId)
    ? input.rawSelectedSimulationTurretId
    : null;
}

function SimulationSelectedTurretSummary(input: {
  readonly onChangeTurret: () => void;
  readonly selectedTurret: { readonly objectId: string; readonly displayName: string | null };
}) {
  const primaryLabelShellRef = useRef<HTMLSpanElement | null>(null);
  const primaryLabelMeasureRef = useRef<HTMLSpanElement | null>(null);
  const secondaryLabelShellRef = useRef<HTMLSpanElement | null>(null);
  const secondaryLabelMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [shouldCompactPrimaryLabel, setShouldCompactPrimaryLabel] = useState(false);
  const [shouldCompactSecondaryLabel, setShouldCompactSecondaryLabel] = useState(false);
  const primaryLabel = getTurretOptionLabel(input.selectedTurret);
  const isObjectIdPrimaryLabel = primaryLabel === input.selectedTurret.objectId;
  const renderedPrimaryLabel = isObjectIdPrimaryLabel && shouldCompactPrimaryLabel
    ? formatAddress(primaryLabel)
    : primaryLabel;
  const renderedSecondaryLabel = shouldCompactSecondaryLabel
    ? formatAddress(input.selectedTurret.objectId)
    : input.selectedTurret.objectId;

  useLayoutEffect(() => {
    const primaryLabelShell = primaryLabelShellRef.current;
    const primaryLabelMeasure = primaryLabelMeasureRef.current;
    const secondaryLabelShell = secondaryLabelShellRef.current;
    const secondaryLabelMeasure = secondaryLabelMeasureRef.current;

    if (
      primaryLabelShell === null
      || primaryLabelMeasure === null
      || secondaryLabelShell === null
      || secondaryLabelMeasure === null
    ) {
      return undefined;
    }

    const updateLabelLayout = () => {
      setShouldCompactPrimaryLabel(primaryLabelMeasure.scrollWidth > primaryLabelShell.clientWidth);
      setShouldCompactSecondaryLabel(secondaryLabelMeasure.scrollWidth > secondaryLabelShell.clientWidth);
    };

    updateLabelLayout();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateLabelLayout();
    });

    observer.observe(primaryLabelShell);
    observer.observe(primaryLabelMeasure);
    observer.observe(secondaryLabelShell);
    observer.observe(secondaryLabelMeasure);

    return () => {
      observer.disconnect();
    };
  }, [input.selectedTurret.objectId, primaryLabel]);

  return (
    <div className="grid gap-3 border border-[rgba(250,250,229,0.14)] bg-[rgba(10,6,6,0.54)] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-1 min-w-0">
        <span className="font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">
          Selected Turret
        </span>
        <span
          className="min-w-0 overflow-hidden font-mono text-sm text-[var(--cream-white)]"
          ref={primaryLabelShellRef}
          title={primaryLabel}
        >
          <span
            className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
            data-measurement="authorize-selected-turret-primary"
            ref={primaryLabelMeasureRef}
          >
            {renderedPrimaryLabel}
          </span>
        </span>
        <span
          className="min-w-0 overflow-hidden text-xs text-[var(--text-secondary)]"
          ref={secondaryLabelShellRef}
          title={input.selectedTurret.objectId}
        >
          <span
            className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
            data-measurement="authorize-selected-turret-secondary"
            ref={secondaryLabelMeasureRef}
          >
            {renderedSecondaryLabel}
          </span>
        </span>
      </div>
      <button className="ff-authorize-view__action" onClick={input.onChangeTurret} type="button">
        Change Turret
      </button>
    </div>
  );
}

function SimulationTurretQueryError(input: {
  readonly errorMessage: string | null;
  readonly onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[rgba(255,166,0,0.28)] bg-[rgba(255,166,0,0.1)] px-4 py-3 text-sm text-[#ffd38d]" role="alert">
      <span>{input.errorMessage ?? "Failed to load turrets."}</span>
      <button className="ff-authorize-view__action" onClick={input.onRetry} type="button">
        Retry
      </button>
    </div>
  );
}

function useAuthorizeViewModel(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly onViewChange?: (view: PrimaryView) => void;
}): AuthorizeViewModel {
  const { deploymentState, onViewChange } = input;
  const account = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const suiClient = useSuiClient();
  const authorizationContracts = useAuthorizationContracts({
    fallbackDeploymentState: deploymentState,
    suiClient,
    targetId: deploymentState === null ? null : deploymentState.targetId,
    walletAddress: account?.address ?? null,
  });
  const [requestedDeploymentKey, setRequestedDeploymentKey] = useState<string | null>(getAuthorizeDeploymentKey(deploymentState));
  const [rawSelectedSimulationTurretId, setRawSelectedSimulationTurretId] = useState<string | null>(null);
  const selectedDeploymentKey = useMemo(() => resolveSelectedDeploymentKey({
    contracts: authorizationContracts.contracts,
    deploymentState,
    requestedDeploymentKey,
  }), [authorizationContracts.contracts, deploymentState, requestedDeploymentKey]);
  const selectedDeploymentState = useMemo(() => resolveSelectedDeploymentState({
    contracts: authorizationContracts.contracts,
    deploymentState,
    selectedDeploymentKey,
  }), [authorizationContracts.contracts, deploymentState, selectedDeploymentKey]);
  const turretList = useTurretList({
    deploymentState: selectedDeploymentState,
    walletAddress: account?.address ?? null,
  });
  const authorization = useAuthorization({
    deploymentState: selectedDeploymentState,
    walletAccount: account,
    currentWallet,
    suiClient,
  });
  const deploymentKey = getAuthorizeDeploymentKey(selectedDeploymentState);
  const turretSimulation = useTurretSimulation({
    deploymentKey,
    deploymentState: selectedDeploymentState,
    suiClient,
    turrets: turretList.turrets,
    walletAddress: account?.address ?? null,
  });
  const selection = useAuthorizeViewSelection({ authorization, deploymentKey, turretList });
  const selectedSimulationTurretId = useMemo(() => resolveSelectedSimulationTurretId({
    rawSelectedSimulationTurretId,
    turrets: turretList.turrets,
  }), [rawSelectedSimulationTurretId, turretList.turrets]);

  const handleContractSelectionChange = useCallback((nextDeploymentKey: string) => {
    const normalizedDeploymentKey = nextDeploymentKey.trim();

    setRequestedDeploymentKey(normalizedDeploymentKey.length === 0 ? null : normalizedDeploymentKey);
    setRawSelectedSimulationTurretId(null);
    turretSimulation.closeSimulation();
  }, [turretSimulation]);

  const handleOpenSimulation = useCallback((turretObjectId: string) => {
    if (selectedDeploymentState === null) {
      return;
    }

    const nextDeploymentKey = getAuthorizeDeploymentKey(selectedDeploymentState);
    const turret = turretList.turrets.find((candidate) => candidate.objectId === turretObjectId);

    if (nextDeploymentKey === null || turret === undefined) {
      return;
    }

    setRawSelectedSimulationTurretId(turret.objectId);
    turretSimulation.openSimulation({
      deploymentKey: nextDeploymentKey,
      deploymentState: selectedDeploymentState,
      turret,
    });
    onViewChange?.("simulate");
  }, [onViewChange, selectedDeploymentState, turretList.turrets, turretSimulation]);

  const contractSelector = useMemo<AuthorizeContractSelectorProps>(() => ({
    contracts: authorizationContracts.contracts,
    errorMessage: authorizationContracts.errorMessage,
    isLoading: authorizationContracts.isLoading,
    onChange: handleContractSelectionChange,
    selectedDeploymentKey: getAuthorizeDeploymentKey(selectedDeploymentState),
  }), [authorizationContracts.contracts, authorizationContracts.errorMessage, authorizationContracts.isLoading, handleContractSelectionChange, selectedDeploymentState]);

  return {
    account,
    authorization,
    contractSelector,
    deploymentKey,
    handleAuthorize: selection.handleAuthorize,
    handleDismissProgress: selection.handleDismissProgress,
    handleOpenSimulation,
    handleSelectionChange: selection.handleSelectionChange,
    listInstanceKey: selection.listInstanceKey,
    selectedDeploymentState,
    selectedSimulationTurretId,
    selectedTurretIds: selection.selectedTurretIds,
    turretList,
    turretSimulation,
  };
}

function getAuthorizeViewHeaderCopy(activeView: AuthorizeWorkflowView): {
  readonly eyebrow: string;
  readonly summary: string;
  readonly title: string;
} {
  if (activeView === "simulate") {
    return {
      eyebrow: "Deployment Simulation",
      summary: "Select a turret you own from the dropdown and execute the active contract as the EVE Frontier gameserver would.",
      title: "Simulate Turrets",
    };
  }

  return {
    eyebrow: "Deployment Authorization",
    summary: "Select owned turrets, confirm the active extension state, and stage the authorization batch for the deployed contract.",
    title: "Authorize Turrets",
  };
}

function AuthorizeViewHeader(input: {
  readonly activeView: AuthorizeWorkflowView;
  readonly simulationControl?: React.ReactNode;
}) {
  const { activeView, simulationControl } = input;
  const copy = getAuthorizeViewHeaderCopy(activeView);
  const hasSimulationControl = simulationControl !== undefined;

  return (
    <header className={`border border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.68)] p-5 ${hasSimulationControl ? "xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:items-start xl:gap-6" : "flex flex-col gap-2"}`}>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">
          {copy.eyebrow}
        </p>
        <h1 className="font-heading text-xl uppercase tracking-[0.14em] text-[var(--cream-white)] sm:text-2xl">
          {copy.title}
        </h1>
        <p className="max-w-3xl text-sm text-[var(--text-secondary)]">
          {copy.summary}
        </p>
      </div>
      {simulationControl ? (
        <div className="pt-4 xl:min-w-0 xl:pt-0">
          {simulationControl}
        </div>
      ) : null}
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

function AuthorizeSelectField(input: {
  readonly ariaLabel: string;
  readonly controlId: string;
  readonly disabled?: boolean;
  readonly helperText?: React.ReactNode;
  readonly label: string;
  readonly onChange?: (value: string) => void;
  readonly options: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly placeholder: string;
  readonly value: string;
}) {
  return (
    <div className="grid gap-2">
      <label className="font-heading text-[0.68rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]" htmlFor={input.controlId}>
        {input.label}
      </label>
      <select
        aria-label={input.ariaLabel}
        className="min-h-11 min-w-0 w-full border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 font-mono text-xs leading-5 text-[var(--cream-white)] whitespace-normal outline-none transition-colors focus:border-[var(--brand-orange)]"
        disabled={input.disabled}
        id={input.controlId}
        onChange={(event) => {
          input.onChange?.(event.currentTarget.value);
        }}
        value={input.value}
      >
        <option value="">{input.placeholder}</option>
        {input.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {input.helperText ? (
        <div className="grid gap-1 break-words text-xs text-[var(--text-secondary)]">
          {input.helperText}
        </div>
      ) : null}
    </div>
  );
}

function AuthorizeContractSelector({
  contracts,
  errorMessage,
  isLoading,
  onChange,
  selectedDeploymentKey,
}: AuthorizeContractSelectorProps) {
  const selectedContract = contracts.find((contract) => getAuthorizeDeploymentKey(contract) === selectedDeploymentKey) ?? null;
  const helperText = errorMessage ?? (selectedContract === null
    ? null
    : (
        <>
          <span>{getContractOptionLabel(selectedContract)}</span>
          <span className="break-all">{selectedContract.packageId} on {selectedContract.targetId}</span>
        </>
      ));

  return (
    <AuthorizeSelectField
      ariaLabel="Authorize Contract"
      controlId="authorize-contract"
      disabled={contracts.length === 0 || isLoading}
      helperText={helperText}
      label="Contract"
      onChange={onChange}
      options={contracts.map((contract) => ({
        label: getContractOptionLabel(contract),
        value: getAuthorizeDeploymentKey(contract) ?? "",
      }))}
      placeholder={isLoading ? "Loading wallet contracts..." : contracts.length === 0 ? "No deployed contracts available" : "Select a contract"}
      value={selectedDeploymentKey ?? ""}
    />
  );
}

function AuthorizeDeploymentPanel(input: {
  readonly className?: string;
  readonly contractSelector: AuthorizeContractSelectorProps;
  readonly deploymentState: StoredDeploymentState | null;
  readonly walletAddress: string | null | undefined;
}) {
  const { className, contractSelector, deploymentState, walletAddress } = input;
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
    <aside className={`grid content-start gap-4 border border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.72)] p-5 ${className ?? ""}`.trim()}>
      <h2 className="font-heading text-sm uppercase tracking-[0.16em] text-[var(--cream-white)]">
        Active Deployment
      </h2>
      <AuthorizeContractSelector
        contracts={contractSelector.contracts}
        errorMessage={contractSelector.errorMessage}
        isLoading={contractSelector.isLoading}
        onChange={contractSelector.onChange}
        selectedDeploymentKey={contractSelector.selectedDeploymentKey}
      />
      {deploymentState === null ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No valid deployed contract is available for authorization.
        </p>
      ) : (
        <dl className="grid gap-4 text-sm text-[var(--text-secondary)]">
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
  handleOpenSimulation,
  handleSelectionChange,
  listInstanceKey,
  selectedTurretIds,
  turretList,
}: AuthorizeViewPrimaryPanelProps) {
  const hasTurrets = turretList.status === "success" && turretList.turrets.length > 0;

  if (hasTurrets) {
    return (
      <>
        <AuthorizeTurretList
          key={`${deploymentKey ?? "no-deployment"}:${String(listInstanceKey)}`}
          onSimulate={(turret) => {
            handleOpenSimulation(turret.objectId);
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

function AuthorizeSimulationEmptyState(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly errorMessage: string | null;
  readonly onRetry: () => void;
  readonly onViewChange?: (view: PrimaryView) => void;
  readonly turretListStatus: ReturnType<typeof useTurretList>["status"];
}) {
  const { deploymentState, errorMessage, onRetry, onViewChange, turretListStatus } = input;

  if (deploymentState === null) {
    return (
      <div className="ff-authorize-view__state-card">
        <div>
          <h2 className="ff-authorize-view__state-title">Simulation Context Required</h2>
          <p className="ff-authorize-view__state-copy">
            A live deployment is required before you can load the turret roster for simulation.
          </p>
        </div>
      </div>
    );
  }

  if (turretListStatus === "loading") {
    return (
      <div className="ff-authorize-view__state-card" role="status">
        <span aria-hidden="true" className="ff-authorize-view__spinner" />
        <div>
          <h2 className="ff-authorize-view__state-title">Loading turrets</h2>
          <p className="ff-authorize-view__state-copy">
            Querying the active deployment for wallet-owned turrets.
          </p>
        </div>
      </div>
    );
  }

  if (turretListStatus === "error") {
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
        <h2 className="ff-authorize-view__state-title">Simulation Context Required</h2>
        <p className="ff-authorize-view__state-copy">
          Select a turret from the dropdown above to review live deployment context and run a non-mutating simulation.
        </p>
      </div>
      <button className="ff-authorize-view__action" onClick={() => { onViewChange?.("authorize"); }} type="button">
        Open Authorize
      </button>
    </div>
  );
}

function AuthorizeSimulationSelectorPanel({
  deploymentState,
  onRetry,
  onTurretChange,
  selectedTurretObjectId,
  turretList,
}: AuthorizeSimulationSelectorPanelProps) {
  const selectedTurret = turretList.turrets.find((turret) => turret.objectId === selectedTurretObjectId) ?? null;
  const turretHelperText = turretList.errorMessage ?? (selectedTurret === null ? null : selectedTurret.objectId);
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldShowSelector = selectedTurret === null || isExpanded;
  const placeholder = getSimulationTurretPlaceholder({
    deploymentState,
    turretCount: turretList.turrets.length,
    turretListStatus: turretList.status,
  });

  return (
    <div className="grid gap-4">
      {!shouldShowSelector ? (
        <SimulationSelectedTurretSummary onChangeTurret={() => { setIsExpanded(true); }} selectedTurret={selectedTurret} />
      ) : (
        <AuthorizeSelectField
          ariaLabel="Simulation Turret"
          controlId="simulation-turret"
          disabled={deploymentState === null || turretList.status === "loading" || turretList.turrets.length === 0}
          helperText={turretHelperText}
          label="Turret"
          onChange={(turretObjectId) => {
            setIsExpanded(false);
            onTurretChange(turretObjectId);
          }}
          options={turretList.turrets.map((turret) => ({
            label: `${getTurretOptionLabel(turret)} (${turret.objectId})`,
            value: turret.objectId,
          }))}
          placeholder={placeholder}
          value={selectedTurretObjectId ?? ""}
        />
      )}

      {turretList.status === "error" ? (
        <SimulationTurretQueryError errorMessage={turretList.errorMessage} onRetry={onRetry} />
      ) : null}
    </div>
  );
}

function AuthorizeSimulationPanel(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly onViewChange?: (view: PrimaryView) => void;
  readonly turretList: ReturnType<typeof useTurretList>;
  readonly turretSimulation: ReturnType<typeof useTurretSimulation>;
}) {
  const {
    deploymentState,
    onViewChange,
    turretList,
    turretSimulation,
  } = input;

  return (
    <div className="grid gap-4">
      {turretSimulation.session.status === "closed" ? (
        <AuthorizeSimulationEmptyState
          deploymentState={deploymentState}
          errorMessage={turretList.errorMessage}
          onRetry={turretList.refresh}
          onViewChange={onViewChange}
          turretListStatus={turretList.status}
        />
      ) : (
        <TurretSimulationModal
          onApplySuggestion={turretSimulation.applySuggestion}
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
          onUpdateField={turretSimulation.updateField}
          referenceData={turretSimulation.referenceData}
          session={turretSimulation.session}
        />
      )}
    </div>
  );
}

function AuthorizeView({ activeView = "authorize", deploymentState, onViewChange }: AuthorizeViewProps) {
  const model = useAuthorizeViewModel({ deploymentState, onViewChange });

  return (
    <section aria-label={activeView === "simulate" ? "Simulate view" : "Authorize view"} className="flex flex-1 min-h-0 overflow-hidden border-y border-[var(--ui-border-dark)]">
      <div className={`ff-authorize-view${activeView === "simulate" ? " ff-authorize-view--simulate" : ""}`}>
        <AuthorizeViewHeader
          activeView={activeView}
          simulationControl={activeView === "simulate" ? (
            <AuthorizeSimulationSelectorPanel
              deploymentState={model.selectedDeploymentState}
              onRetry={model.turretList.refresh}
              onTurretChange={model.handleOpenSimulation}
              selectedTurretObjectId={model.selectedSimulationTurretId}
              turretList={model.turretList}
            />
          ) : undefined}
        />

        <div className={`ff-authorize-view__grid${activeView === "simulate" ? " ff-authorize-view__grid--simulate" : ""}`}>
          <div className="ff-authorize-view__primary">
            {activeView === "simulate" ? (
              <AuthorizeSimulationPanel
                deploymentState={model.selectedDeploymentState}
                onViewChange={onViewChange}
                turretList={model.turretList}
                turretSimulation={model.turretSimulation}
              />
            ) : (
              <AuthorizeViewPrimaryPanel
                authorization={model.authorization}
                deploymentKey={model.deploymentKey}
                deploymentState={model.selectedDeploymentState}
                handleAuthorize={model.handleAuthorize}
                handleOpenSimulation={model.handleOpenSimulation}
                handleSelectionChange={model.handleSelectionChange}
                listInstanceKey={model.listInstanceKey}
                selectedTurretIds={model.selectedTurretIds}
                turretList={model.turretList}
              />
            )}
          </div>

          {activeView === "authorize" ? (
            <AuthorizeDeploymentPanel contractSelector={model.contractSelector} deploymentState={model.selectedDeploymentState} walletAddress={model.account?.address} />
          ) : null}
        </div>
      </div>

      <AuthorizationProgressModal
        onClose={model.handleDismissProgress}
        onRetryEventConfirmation={(turretObjectId) => {
          void model.authorization.retryEventConfirmation(turretObjectId);
        }}
        progress={model.authorization.progress}
      />
    </section>
  );
}

export default AuthorizeView;