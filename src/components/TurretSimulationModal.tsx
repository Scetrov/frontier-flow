import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  SimulationCharacterOption,
  SimulationFieldKey,
  SimulationFieldSource,
  SimulationFieldValue,
  SimulationPriorityEntry,
  SimulationReferenceData,
  SimulationShipOption,
  SimulationSuggestion,
  TurretSimulationSession,
} from "../types/turretSimulation";
import { createEmptySimulationReferenceData } from "../types/turretSimulation";
import { formatAddress } from "../utils/formatAddress";

interface TurretSimulationModalProps {
  readonly deploymentPanel?: React.ReactNode;
  readonly onApplySuggestion?: (suggestion: SimulationSuggestion) => void;
  readonly closeLabel?: string;
  readonly onClose: () => void;
  readonly onLoadSuggestions?: (field: SimulationFieldKey, query?: string) => void;
  readonly onRefreshContext?: () => void;
  readonly onRunSimulation?: () => void;
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly referenceData?: SimulationReferenceData;
  readonly session: TurretSimulationSession;
}

const FIELD_SOURCE_COPY: Record<SimulationFieldSource, string> = {
  "authorize-context": "Context",
  "default": "Default",
  "graphql": "GraphQL",
  "manual": "Manual",
  "remote-suggestion": "Suggested",
  "world-api": "World API",
};

function parseOptionalInteger(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function SessionStatusBadge({ session }: { readonly session: TurretSimulationSession }) {
  const copy = useMemo(() => {
    if (session.status === "stale") {
      return "Stale";
    }

    if (session.status === "running") {
      return "Running";
    }

    return "Ready";
  }, [session.status]);

  const className = session.status === "stale"
    ? "border-[rgba(255,211,141,0.4)] bg-[rgba(255,166,0,0.12)] text-[#ffd38d]"
    : "border-[rgba(102,226,159,0.28)] bg-[rgba(102,226,159,0.12)] text-[#8ff2b5]";

  return (
    <span className={`inline-flex items-center border px-3 py-1 font-heading text-[0.62rem] uppercase tracking-[0.14em] ${className}`}>
      {copy}
    </span>
  );
}

const CONTEXT_COPY_BUTTON_CLASS = "inline-flex shrink-0 items-center border border-[var(--ui-border-dark)] bg-[rgba(20,10,10,0.52)] px-2 py-1 font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-orange)] hover:text-[var(--cream-white)]";

function ModalField(input: {
  readonly isCopied?: boolean;
  readonly label: string;
  readonly onCopy?: () => void;
  readonly value: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <dt className="font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">
          {input.label}
        </dt>
        {input.onCopy ? (
          <button
            aria-label={input.isCopied ? `Copied ${input.label}` : `Copy ${input.label}`}
            className={CONTEXT_COPY_BUTTON_CLASS}
            onClick={input.onCopy}
            type="button"
          >
            {input.isCopied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </div>
      <dd className="m-0 border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 font-mono text-xs text-[var(--cream-white)] break-all">
        {input.value}
      </dd>
    </div>
  );
}

function FieldSourceBadge({ source }: { readonly source: SimulationFieldSource }) {
  const className = source === "manual"
    ? "border-[rgba(255,211,141,0.4)] bg-[rgba(255,166,0,0.12)] text-[#ffd38d]"
    : source === "remote-suggestion"
      ? "border-[rgba(117,203,255,0.34)] bg-[rgba(49,132,214,0.12)] text-[#9fd8ff]"
      : source === "authorize-context"
        ? "border-[rgba(102,226,159,0.28)] bg-[rgba(102,226,159,0.12)] text-[#8ff2b5]"
        : "border-[rgba(250,250,229,0.16)] bg-[rgba(250,250,229,0.08)] text-[var(--text-secondary)]";

  return (
    <span className={`inline-flex shrink-0 items-center border px-2 py-1 font-heading text-[0.58rem] uppercase tracking-[0.16em] ${className}`}>
      {FIELD_SOURCE_COPY[source]}
    </span>
  );
}

function DraftFieldShell(input: {
  readonly children: React.ReactNode;
  readonly controlId: string;
  readonly errorMessage?: string;
  readonly helperText?: string;
  readonly label: string;
  readonly source: SimulationFieldSource;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <label className="min-w-0 font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]" htmlFor={input.controlId}>
          {input.label}
        </label>
        <FieldSourceBadge source={input.source} />
      </span>
      {input.children}
      <span
        className={`min-h-4 break-words text-xs ${input.errorMessage ? "text-[#ffd38d]" : "text-[var(--text-secondary)]"}`}
        role={input.errorMessage ? "alert" : undefined}
        title={input.errorMessage ?? input.helperText}
      >
        {input.errorMessage ?? input.helperText ?? ""}
      </span>
    </div>
  );
}

function DraftInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-w-0 w-full border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 font-mono text-xs text-[var(--cream-white)] outline-none transition-colors focus:border-[var(--brand-orange)] ${props.className ?? ""}`.trim()}
    />
  );
}

function DraftSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`min-w-0 w-full max-w-full border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 font-mono text-xs text-[var(--cream-white)] outline-none transition-colors focus:border-[var(--brand-orange)] ${props.className ?? ""}`.trim()}
    />
  );
}

function DraftFieldGroup(input: {
  readonly children: React.ReactNode;
  readonly description: string;
  readonly title: string;
}) {
  return (
    <section className="grid gap-4 border border-[rgba(250,250,229,0.14)] bg-[rgba(14,18,27,0.72)] p-4">
      <div className="grid gap-1">
        <h4 className="font-heading text-[0.68rem] uppercase tracking-[0.18em] text-[var(--cream-white)]">
          {input.title}
        </h4>
        <p className="text-xs text-[var(--text-secondary)]">
          {input.description}
        </p>
      </div>
      {input.children}
    </section>
  );
}

function ResultTable({ entries }: { readonly entries: readonly SimulationPriorityEntry[] }) {
  return (
    <div className="overflow-x-auto border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)]">
      <table className="w-full border-collapse text-left text-xs text-[var(--cream-white)]">
        <thead>
          <tr className="border-b border-[var(--ui-border-dark)] text-[var(--text-secondary)]">
            <th className="px-3 py-2 font-heading uppercase tracking-[0.16em]">Target Item</th>
            <th className="px-3 py-2 font-heading uppercase tracking-[0.16em]">Priority Weight</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr className="border-b border-[rgba(250,250,229,0.08)] last:border-b-0" key={`${entry.targetItemId}:${entry.priorityWeight}`}>
              <td className="px-3 py-2 font-mono">{entry.targetItemId}</td>
              <td className="px-3 py-2 font-mono">{entry.priorityWeight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getOwnerCharacterValue(session: TurretSimulationSession): string {
  if (session.ownerCharacterId !== null) {
    return session.ownerCharacterId;
  }

  if (session.isHydratingOwnerCharacter) {
    return "Resolving owner character...";
  }

  return session.ownerCharacterErrorMessage ?? "Unavailable";
}

function getFallbackValue(value: string | null | undefined, fallback: string): string {
  return value ?? fallback;
}

function getCurrentExtensionValue(session: TurretSimulationSession): string {
  return session.turret?.currentExtension?.typeName ?? "No extension";
}



function TurretSimulationHeader(input: {
  readonly closeLabel?: string;
  readonly onClose: () => void;
  readonly session: TurretSimulationSession;
}) {
  const { closeLabel, onClose, session } = input;
  const shouldRenderCloseAction = closeLabel !== undefined && closeLabel.trim().length > 0;

  return (
    <header className="flex items-start justify-between gap-4 border-b border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.74)] px-5 py-4">
      <div className="grid gap-2">
        <p className="font-heading text-[0.68rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">
          Turret Simulation
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-lg uppercase tracking-[0.12em] text-[var(--cream-white)] sm:text-xl" id="turret-simulation-title">
            {session.turretTitle}
          </h2>
          <SessionStatusBadge session={session} />
        </div>
        <p className="text-sm text-[var(--text-secondary)]" id="turret-simulation-description">
          Review the selected turret context before running a non-mutating extension simulation.
        </p>
      </div>

      {shouldRenderCloseAction ? (
        <button className="ff-header__button" onClick={onClose} type="button">
          {closeLabel}
        </button>
      ) : null}
    </header>
  );
}

function TurretSimulationContextPanel(input: {
  readonly onRefreshContext?: () => void;
  readonly session: TurretSimulationSession;
}) {
  const { onRefreshContext, session } = input;
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleCopy = useCallback((field: string, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopiedField(field);
  }, []);

  const turretValue = getFallbackValue(session.turretTitle, formatAddress(session.turretObjectId ?? ""));
  const turretObjectValue = getFallbackValue(session.turretObjectId, "Unavailable");
  const packageValue = getFallbackValue(session.deploymentState?.packageId, "Unavailable");
  const moduleValue = getFallbackValue(session.deploymentState?.moduleName, "Unavailable");
  const targetValue = getFallbackValue(session.deploymentState?.targetId, "Unavailable");
  const ownerCharacterValue = getOwnerCharacterValue(session);
  const currentExtensionValue = getCurrentExtensionValue(session);

  return (
    <section className="grid content-start gap-4 border border-[var(--ui-border-dark)] bg-[linear-gradient(180deg,rgba(255,71,0,0.08),rgba(45,21,21,0.62))] p-4 xl:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm uppercase tracking-[0.16em] text-[var(--cream-white)]">
          Live Context
        </h3>
        {session.status === "stale" ? (
          <button className="ff-authorize-view__action" onClick={onRefreshContext} type="button">
            Refresh Context
          </button>
        ) : null}
      </div>

      {session.staleMessage !== null ? (
        <div className="border border-[rgba(255,211,141,0.4)] bg-[rgba(255,166,0,0.12)] px-4 py-3 text-sm text-[#ffd38d]" role="alert">
          {session.staleMessage}
        </div>
      ) : null}

      <dl className="grid gap-4">
        <ModalField isCopied={copiedField === "turret"} label="Turret" onCopy={() => { handleCopy("turret", turretValue); }} value={turretValue} />
        <ModalField isCopied={copiedField === "turretObject"} label="Turret Object" onCopy={() => { handleCopy("turretObject", turretObjectValue); }} value={turretObjectValue} />
        <ModalField isCopied={copiedField === "package"} label="Package" onCopy={() => { handleCopy("package", packageValue); }} value={packageValue} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ModalField isCopied={copiedField === "module"} label="Module" onCopy={() => { handleCopy("module", moduleValue); }} value={moduleValue} />
          <ModalField isCopied={copiedField === "target"} label="Target" onCopy={() => { handleCopy("target", targetValue); }} value={targetValue} />
        </div>
        <ModalField isCopied={copiedField === "ownerCharacter"} label="Owner Character" onCopy={() => { handleCopy("ownerCharacter", ownerCharacterValue); }} value={ownerCharacterValue} />
        <ModalField isCopied={copiedField === "currentExtension"} label="Current Extension" onCopy={() => { handleCopy("currentExtension", currentExtensionValue); }} value={currentExtensionValue} />
      </dl>

      {session.ownerCharacterErrorMessage !== null ? (
        <div className="border border-[rgba(255,211,141,0.4)] bg-[rgba(255,166,0,0.12)] px-4 py-3 text-sm text-[#ffd38d]" role="alert">
          {session.ownerCharacterErrorMessage}
        </div>
      ) : null}
    </section>
  );
}

function SimulationTextField(input: {
  readonly controlId: string;
  readonly errorMessage?: string;
  readonly helperText?: string;
  readonly label: string;
  readonly onChange?: (value: string) => void;
  readonly source: SimulationFieldSource;
  readonly value: string;
}) {
  const { controlId, errorMessage, helperText, label, onChange, source, value } = input;

  return (
    <DraftFieldShell controlId={controlId} errorMessage={errorMessage} helperText={helperText} label={label} source={source}>
      <DraftInput
        aria-label={label}
        id={controlId}
        onChange={(event) => {
          onChange?.(event.currentTarget.value);
        }}
        value={value}
      />
    </DraftFieldShell>
  );
}

function SimulationTypeField(input: {
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly referenceData: SimulationReferenceData;
  readonly session: TurretSimulationSession;
}) {
  const { onUpdateField, referenceData, session } = input;
  const shipOptions = getAvailableShipOptions(referenceData, session);
  const selectedShip = getSelectedShip(shipOptions, session.draft.candidate.typeId);
  const placeholder = referenceData.isLoading
    ? "Loading ship types..."
    : shipOptions.length === 0
      ? "No ship types available"
      : "Select a ship type";

  return (
    <DraftFieldShell
      controlId="simulation-type-id"
      errorMessage={session.fieldErrors.typeId}
      helperText={selectedShip?.description}
      label="Type Id"
      source={session.draft.fieldSources.typeId}
    >
      <DraftSelect
        aria-label="Type Id"
        disabled={referenceData.isLoading || shipOptions.length === 0}
        id="simulation-type-id"
        onChange={(event) => {
          const nextTypeId = event.currentTarget.value;
          const nextShip = getSelectedShip(shipOptions, nextTypeId);

          onUpdateField?.("typeId", nextTypeId);
          onUpdateField?.("groupId", nextShip?.groupId ?? "");
        }}
        value={session.draft.candidate.typeId}
      >
        <option value="">{placeholder}</option>
        {shipOptions.map((option) => (
          <option key={option.typeId} value={option.typeId}>
            {`${option.label} (${option.typeId})`}
          </option>
        ))}
      </DraftSelect>
    </DraftFieldShell>
  );
}

function SimulationReadOnlyField(input: {
  readonly controlId: string;
  readonly errorMessage?: string;
  readonly helperText?: string;
  readonly label: string;
  readonly source: SimulationFieldSource;
  readonly value: string;
}) {
  return (
    <DraftFieldShell
      controlId={input.controlId}
      errorMessage={input.errorMessage}
      helperText={input.helperText}
      label={input.label}
      source={input.source}
    >
      <DraftInput aria-label={input.label} id={input.controlId} readOnly value={input.value} />
    </DraftFieldShell>
  );
}

function SimulationCharacterField(input: {
  readonly onApplySuggestion?: (suggestion: SimulationSuggestion) => void;
  readonly onLoadSuggestions?: (field: SimulationFieldKey, query?: string) => void;
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly referenceData: SimulationReferenceData;
  readonly session: TurretSimulationSession;
}) {
  const { onApplySuggestion, onLoadSuggestions, onUpdateField, referenceData, session } = input;
  const characterOptions = getAvailableCharacterOptions(referenceData, session);
  const selectedCharacter = getSelectedCharacter(characterOptions, session.draft.candidate.characterId);
  const [characterMenuOpen, setCharacterMenuOpen] = useState(false);
  const [characterSearchQuery, setCharacterSearchQuery] = useState("");
  const characterSuggestionState = session.suggestionState.activeField === "characterId"
    ? session.suggestionState
    : null;
  const remoteCharacterSuggestions = characterSuggestionState?.suggestions.filter((suggestion) => suggestion.field === "characterId") ?? [];
  const localCharacterSuggestions = characterOptions.map((option) => ({
    field: "characterId",
    label: option.label,
    value: String(option.characterId),
    description: option.description,
    derivedFields: {
      characterId: option.characterId,
      characterTribe: option.characterTribe,
    },
    sourceObjectId: option.sourceObjectId,
  } satisfies SimulationSuggestion));
  const visibleSuggestions = characterSearchQuery.trim().length === 0 ? localCharacterSuggestions : remoteCharacterSuggestions;
  const isShowingSelectedCharacter = selectedCharacter !== null && characterSearchQuery === String(selectedCharacter.characterId);
  const hasSettledRemoteQuery = characterSuggestionState !== null
    && characterSuggestionState.query === characterSearchQuery.trim()
    && (
      characterSuggestionState.isLoading
      || characterSuggestionState.errorMessage !== null
      || remoteCharacterSuggestions.length > 0
    );
  const displayValue = characterMenuOpen
    ? characterSearchQuery
    : (session.draft.candidate.characterId === null ? "" : String(session.draft.candidate.characterId));
  const shouldShowSuggestions = characterMenuOpen && (
    characterSearchQuery.trim().length === 0
      ? localCharacterSuggestions.length > 0
      : characterSuggestionState?.isLoading === true
        || characterSuggestionState?.errorMessage !== null
        || remoteCharacterSuggestions.length > 0
  );

  useEffect(() => {
    const trimmedQuery = characterSearchQuery.trim();

    if (!characterMenuOpen || trimmedQuery.length === 0 || isShowingSelectedCharacter || hasSettledRemoteQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onLoadSuggestions?.("characterId", trimmedQuery);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [characterMenuOpen, characterSearchQuery, hasSettledRemoteQuery, isShowingSelectedCharacter, onLoadSuggestions]);

  const helperText = characterSuggestionState?.errorMessage
    ?? (selectedCharacter === null
      ? session.ownerCharacterErrorMessage ?? undefined
      : `${selectedCharacter.label}${selectedCharacter.description ? ` · ${selectedCharacter.description}` : ""}`);
  const placeholder = referenceData.isLoading
    ? "Loading character ids..."
    : "Search by character name or id";

  return (
    <DraftFieldShell
      controlId="simulation-character-id"
      errorMessage={session.fieldErrors.characterId}
      helperText={helperText}
      label="Character Id"
      source={session.draft.fieldSources.characterId}
    >
      <div className="relative">
        <DraftInput
          aria-label="Character Id"
          autoComplete="off"
          onBlur={() => {
            setCharacterMenuOpen(false);
            setCharacterSearchQuery("");
          }}
          id="simulation-character-id"
          onChange={(event) => {
            const nextQuery = event.currentTarget.value;
            const nextValue = parseOptionalInteger(nextQuery);

            setCharacterSearchQuery(nextQuery);

            if (nextQuery.trim().length === 0) {
              onUpdateField?.("characterId", null);
              onUpdateField?.("characterTribe", null);
              return;
            }

            if (nextValue !== null) {
              const nextCharacter = getSelectedCharacter(characterOptions, nextValue);

              onUpdateField?.("characterId", nextValue);
              onUpdateField?.("characterTribe", nextCharacter?.characterTribe ?? null);
            }
          }}
          onFocus={() => {
            setCharacterMenuOpen(true);
            setCharacterSearchQuery(session.draft.candidate.characterId === null ? "" : String(session.draft.candidate.characterId));
          }}
          placeholder={placeholder}
          value={displayValue}
        />
        {shouldShowSuggestions ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.97)] p-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <p className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {characterSearchQuery.trim().length === 0 ? "Known Characters" : "Matching Characters"}
            </p>
            {visibleSuggestions.length > 0 ? (
              <div className="grid gap-1">
              {visibleSuggestions.map((suggestion) => (
                <button
                  className="grid gap-1 border border-[rgba(250,250,229,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-left transition-colors hover:border-[var(--brand-orange)]"
                  key={`${suggestion.value}:${suggestion.sourceObjectId ?? suggestion.label}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    setCharacterMenuOpen(false);
                    setCharacterSearchQuery("");
                    onApplySuggestion?.(suggestion);
                  }}
                  type="button"
                >
                  <span className="font-mono text-xs text-[var(--cream-white)]">{suggestion.label}</span>
                  {suggestion.description ? (
                    <span className="text-xs text-[var(--text-secondary)]">{suggestion.description}</span>
                  ) : null}
                </button>
              ))}
              </div>
            ) : null}
            {characterSuggestionState?.isLoading ? (
              <span className="text-xs text-[var(--text-secondary)]">Searching characters...</span>
            ) : null}
            {characterSearchQuery.trim().length > 0 && characterSuggestionState?.isLoading !== true && visibleSuggestions.length === 0 ? (
              <span className="text-xs text-[var(--text-secondary)]">No matching characters found.</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </DraftFieldShell>
  );
}

function SimulationTribeField(input: {
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly referenceData: SimulationReferenceData;
  readonly session: TurretSimulationSession;
}) {
  const { onUpdateField, referenceData, session } = input;
  const tribeOptions = getAvailableTribeOptions(referenceData, session);
  const selectedTribe = getSelectedTribe(tribeOptions, session.draft.candidate.characterTribe);
  const placeholder = referenceData.isLoading
    ? "Loading tribes..."
    : tribeOptions.length === 0
      ? "No tribes available"
      : "Select a tribe";

  return (
    <DraftFieldShell
      controlId="simulation-character-tribe"
      errorMessage={session.fieldErrors.characterTribe}
      label="Character Tribe"
      source={session.draft.fieldSources.characterTribe}
    >
      <DraftSelect
        aria-label="Character Tribe"
        disabled={referenceData.isLoading || tribeOptions.length === 0}
        id="simulation-character-tribe"
        onChange={(event) => {
          onUpdateField?.("characterTribe", parseOptionalInteger(event.currentTarget.value));
        }}
        title={selectedTribe === null ? placeholder : `${selectedTribe.label} (${String(selectedTribe.value)})`}
        value={session.draft.candidate.characterTribe ?? ""}
      >
        <option value="">{placeholder}</option>
        {tribeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {`${option.label} (${String(option.value)})`}
          </option>
        ))}
      </DraftSelect>
    </DraftFieldShell>
  );
}

function SimulationRatioField(input: {
  readonly controlId: string;
  readonly errorMessage?: string;
  readonly label: string;
  readonly onChange?: (value: string) => void;
  readonly source: SimulationFieldSource;
  readonly value: string;
}) {
  return (
    <DraftFieldShell controlId={input.controlId} errorMessage={input.errorMessage} label={input.label} source={input.source}>
      <DraftInput
        aria-label={input.label}
        id={input.controlId}
        max="100"
        min="0"
        onChange={(event) => {
          input.onChange?.(event.currentTarget.value);
        }}
        step="1"
        type="number"
        value={input.value}
      />
    </DraftFieldShell>
  );
}

function TurretSimulationRatioFields(input: {
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly session: TurretSimulationSession;
}) {
  const { onUpdateField, session } = input;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SimulationRatioField controlId="simulation-hp-ratio" errorMessage={session.fieldErrors.hpRatio} label="HP Ratio" onChange={(value) => { onUpdateField?.("hpRatio", value); }} source={session.draft.fieldSources.hpRatio} value={session.draft.candidate.hpRatio} />
      <SimulationRatioField controlId="simulation-shield-ratio" errorMessage={session.fieldErrors.shieldRatio} label="Shield Ratio" onChange={(value) => { onUpdateField?.("shieldRatio", value); }} source={session.draft.fieldSources.shieldRatio} value={session.draft.candidate.shieldRatio} />
      <SimulationRatioField controlId="simulation-armor-ratio" errorMessage={session.fieldErrors.armorRatio} label="Armor Ratio" onChange={(value) => { onUpdateField?.("armorRatio", value); }} source={session.draft.fieldSources.armorRatio} value={session.draft.candidate.armorRatio} />
    </div>
  );
}

function getSelectedShip(shipOptions: readonly SimulationShipOption[], typeId: string): SimulationShipOption | null {
  return shipOptions.find((option) => option.typeId === typeId) ?? null;
}

function getAvailableShipOptions(referenceData: SimulationReferenceData, session: TurretSimulationSession): readonly SimulationShipOption[] {
  if (referenceData.shipOptions.length > 0 || session.draft.candidate.typeId.trim().length === 0) {
    return referenceData.shipOptions;
  }

  return [{
    description: session.draft.candidate.groupId.trim().length > 0 ? `Group ${session.draft.candidate.groupId}` : "Current selection",
    groupId: session.draft.candidate.groupId,
    label: `Type ${session.draft.candidate.typeId}`,
    typeId: session.draft.candidate.typeId,
  }];
}

function getSelectedCharacter(
  characterOptions: readonly SimulationCharacterOption[],
  characterId: number | null,
): SimulationCharacterOption | null {
  return characterOptions.find((option) => option.characterId === characterId) ?? null;
}

function getAvailableCharacterOptions(referenceData: SimulationReferenceData, session: TurretSimulationSession): readonly SimulationCharacterOption[] {
  if (referenceData.characterOptions.length > 0 || session.draft.candidate.characterId === null) {
    return referenceData.characterOptions;
  }

  return [{
    characterId: session.draft.candidate.characterId,
    characterTribe: session.draft.candidate.characterTribe,
    description: session.draft.candidate.characterTribe === null ? null : `Tribe ${String(session.draft.candidate.characterTribe)}`,
    label: `Character ${String(session.draft.candidate.characterId)}`,
    sourceObjectId: null,
  }];
}

function getAvailableTribeOptions(referenceData: SimulationReferenceData, session: TurretSimulationSession) {
  if (referenceData.tribeOptions.length > 0 || session.draft.candidate.characterTribe === null) {
    return referenceData.tribeOptions;
  }

  return [{
    description: undefined,
    label: `Tribe ${String(session.draft.candidate.characterTribe)}`,
    value: session.draft.candidate.characterTribe,
  }];
}

function getSelectedTribe(tribeOptions: readonly SimulationReferenceData["tribeOptions"][number][], characterTribe: number | null) {
  return tribeOptions.find((option) => option.value === characterTribe) ?? null;
}

function TurretSimulationDraftFields(input: {
  readonly onApplySuggestion?: (suggestion: SimulationSuggestion) => void;
  readonly onLoadSuggestions?: (field: SimulationFieldKey, query?: string) => void;
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly referenceData: SimulationReferenceData;
  readonly session: TurretSimulationSession;
}) {
  const { onApplySuggestion, onLoadSuggestions, onUpdateField, referenceData, session } = input;
  const selectedShip = getSelectedShip(referenceData.shipOptions, session.draft.candidate.typeId);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-2">
        <DraftFieldGroup description="Type Id comes from World API ship data. Selecting a type fills Group Id automatically." title="Ship Identity">
          <div className="grid gap-4">
            <SimulationTextField controlId="simulation-item-id" errorMessage={session.fieldErrors.itemId} helperText="Unique identifier for the target candidate. Enter this manually." label="Item Id" onChange={(value) => { onUpdateField?.("itemId", value); }} source={session.draft.fieldSources.itemId} value={session.draft.candidate.itemId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SimulationTypeField onUpdateField={onUpdateField} referenceData={referenceData} session={session} />
              <SimulationReadOnlyField controlId="simulation-group-id" errorMessage={session.fieldErrors.groupId} helperText={selectedShip?.description ?? "Group Id is derived from the selected type."} label="Group Id" source={session.draft.fieldSources.groupId} value={session.draft.candidate.groupId} />
            </div>
          </div>
        </DraftFieldGroup>

        <DraftFieldGroup description="Character Id is resolved from GraphQL, and selecting a character fills the associated tribe when available." title="Pilot Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <SimulationCharacterField onApplySuggestion={onApplySuggestion} onLoadSuggestions={onLoadSuggestions} onUpdateField={onUpdateField} referenceData={referenceData} session={session} />
            <SimulationTribeField onUpdateField={onUpdateField} referenceData={referenceData} session={session} />
          </div>
        </DraftFieldGroup>
      </div>

      <DraftFieldGroup description="Percentages model the target candidate's current defensive state." title="Defensive State">
        <TurretSimulationRatioFields onUpdateField={onUpdateField} session={session} />
      </DraftFieldGroup>

      <DraftFieldGroup description="Optional scoring and behaviour overrides for the simulated candidate." title="Miscellaneous">
        <div className="grid gap-4 lg:grid-cols-3">
          <SimulationTextField controlId="simulation-priority-weight" errorMessage={session.fieldErrors.priorityWeight} label="Priority Weight" onChange={(value) => { onUpdateField?.("priorityWeight", value); }} source={session.draft.fieldSources.priorityWeight} value={session.draft.candidate.priorityWeight} />

          <DraftFieldShell controlId="simulation-behaviour-change" label="Behaviour" source={session.draft.fieldSources.behaviourChange}>
            <DraftSelect
              aria-label="Behaviour"
              id="simulation-behaviour-change"
              onChange={(event) => {
                onUpdateField?.("behaviourChange", Number(event.currentTarget.value) as 0 | 1 | 2 | 3);
              }}
              value={String(session.draft.candidate.behaviourChange)}
            >
              <option value="0">Unspecified</option>
              <option value="1">Entered</option>
              <option value="2">Started Attack</option>
              <option value="3">Stopped Attack</option>
            </DraftSelect>
          </DraftFieldShell>

          <DraftFieldShell controlId="simulation-is-aggressor" label="Aggressor" source={session.draft.fieldSources.isAggressor}>
            <label className="flex min-h-10 items-center gap-3 border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 text-xs text-[var(--cream-white)]">
              <input
                checked={session.draft.candidate.isAggressor}
                id="simulation-is-aggressor"
                onChange={(event) => {
                  onUpdateField?.("isAggressor", event.currentTarget.checked);
                }}
                type="checkbox"
              />
              Candidate is aggressor
            </label>
          </DraftFieldShell>
        </div>
      </DraftFieldGroup>
    </div>
  );
}

function TurretSimulationFeedback(input: { readonly session: TurretSimulationSession }) {
  const { session } = input;

  return (
    <>
      {session.latestError !== null ? (
        <div className="grid gap-2 border border-[rgba(255,166,0,0.28)] bg-[rgba(255,166,0,0.1)] px-4 py-3 text-sm text-[#ffd38d]" role="alert">
          <p className="font-heading text-[0.62rem] uppercase tracking-[0.18em]">Simulation Error</p>
          <p>{session.latestError.message}</p>
          {session.latestError.details ? (
            <p className="font-mono text-xs text-[#ffe7bf] break-all">{session.latestError.details}</p>
          ) : null}
        </div>
      ) : null}

      {session.latestResult !== null ? (
        <div className="grid gap-3 border border-[rgba(102,226,159,0.24)] bg-[rgba(102,226,159,0.08)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-heading text-sm uppercase tracking-[0.16em] text-[var(--cream-white)]">
              Simulation Results
            </h4>
            <span className="text-xs text-[var(--text-secondary)]">
              {new Date(session.latestResult.executedAt).toLocaleTimeString()}
            </span>
          </div>

          {session.latestResult.entries.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              The extension returned an empty target-priority list for this candidate input.
            </p>
          ) : (
            <ResultTable entries={session.latestResult.entries} />
          )}
        </div>
      ) : null}
    </>
  );
}

function TurretSimulationFooter(input: {
  readonly closeLabel?: string;
  readonly onClose: () => void;
  readonly onRunSimulation?: () => void;
  readonly session: TurretSimulationSession;
}) {
  const { closeLabel, onClose, onRunSimulation, session } = input;
  const shouldRenderCloseAction = closeLabel !== undefined && closeLabel.trim().length > 0;

  return (
    <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-[var(--ui-border-dark)] pt-5">
      <p className="mr-auto text-xs text-[var(--text-secondary)]">
        {session.draft.isComplete ? "Draft is ready for execution wiring." : "Remote suggestions are optional. You can manually fill any unresolved field."}
      </p>
      {shouldRenderCloseAction ? (
        <button className="ff-authorize-view__action" onClick={onClose} type="button">
          {closeLabel}
        </button>
      ) : null}
      <button
        className="ff-authorize-view__action ff-authorize-view__action--primary"
        disabled={session.status === "running" || session.status === "stale"}
        onClick={onRunSimulation}
        type="button"
      >
        {session.status === "running" ? "Running..." : session.latestResult === null ? "Run Simulation" : "Run Simulation Again"}
      </button>
    </div>
  );
}

function TurretSimulationDraftPanel(input: TurretSimulationModalProps) {
  const {
    closeLabel,
    onApplySuggestion,
    onClose,
    onLoadSuggestions,
    onRunSimulation,
    onUpdateField,
    referenceData = createEmptySimulationReferenceData(),
    session,
  } = input;

  return (
    <section className="flex flex-col gap-5 border border-[var(--ui-border-dark)] bg-[linear-gradient(180deg,rgba(84,160,255,0.08),rgba(10,15,20,0.9))] p-4 xl:p-5">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-sm uppercase tracking-[0.16em] text-[var(--cream-white)]">
            Simulation Draft
          </h3>
          <span className="text-xs text-[var(--text-secondary)]">
            {session.draft.isComplete ? "Draft ready" : "Identity fields still need attention"}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Start from the default combat-state values, override anything you need, and use remote suggestions for unresolved identity fields.
        </p>
      </div>

      {referenceData.loadErrorMessage ? (
        <div className="border border-[rgba(255,211,141,0.4)] bg-[rgba(255,166,0,0.12)] px-4 py-3 text-sm text-[#ffd38d]" role="alert">
          {referenceData.loadErrorMessage}
        </div>
      ) : null}
      <TurretSimulationDraftFields onApplySuggestion={onApplySuggestion} onLoadSuggestions={onLoadSuggestions} onUpdateField={onUpdateField} referenceData={referenceData} session={session} />
      <TurretSimulationFeedback session={session} />
      <TurretSimulationFooter closeLabel={closeLabel} onClose={onClose} onRunSimulation={onRunSimulation} session={session} />
    </section>
  );
}

/**
 * Present the active turret simulation workspace inside the authorize workflow.
 */
function TurretSimulationModal({
  closeLabel,
  deploymentPanel,
  onApplySuggestion,
  onClose,
  onLoadSuggestions,
  onRefreshContext,
  onRunSimulation,
  onUpdateField,
  referenceData = createEmptySimulationReferenceData(),
  session,
}: TurretSimulationModalProps) {
  if (session.status === "closed" || session.turret === null || session.deploymentState === null || session.turretObjectId === null) {
    return null;
  }

  return (
    <section
      aria-describedby="turret-simulation-description"
      aria-labelledby="turret-simulation-title"
      className="flex min-h-0 flex-col border border-[var(--ui-border-dark)] bg-[rgba(16,21,31,0.97)] shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
    >
      <TurretSimulationHeader closeLabel={closeLabel} onClose={onClose} session={session} />

      <div className="flex min-h-0 flex-col gap-5 overflow-visible px-5 py-5 xl:flex-row">
        <div className="min-w-0 xl:flex-[1.35]">
          <TurretSimulationDraftPanel
            closeLabel={closeLabel}
            onApplySuggestion={onApplySuggestion}
            onClose={onClose}
            onLoadSuggestions={onLoadSuggestions}
            onRefreshContext={onRefreshContext}
            onRunSimulation={onRunSimulation}
            onUpdateField={onUpdateField}
            referenceData={referenceData}
            session={session}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:w-80 xl:shrink-0">
          <TurretSimulationContextPanel onRefreshContext={onRefreshContext} session={session} />
          {deploymentPanel}
        </div>
      </div>
    </section>
  );
}

export default TurretSimulationModal;