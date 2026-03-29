import { useMemo } from "react";

import type {
  SimulationFieldKey,
  SimulationFieldSource,
  SimulationFieldValue,
  SimulationPriorityEntry,
  SimulationSuggestion,
  TurretSimulationSession,
} from "../types/turretSimulation";
import { formatAddress } from "../utils/formatAddress";

interface TurretSimulationModalProps {
  readonly onApplySuggestion?: (suggestion: SimulationSuggestion) => void;
  readonly closeLabel?: string;
  readonly onClose: () => void;
  readonly onLoadSuggestions?: (field: SimulationFieldKey, query?: string) => void;
  readonly onRefreshContext?: () => void;
  readonly onRunSimulation?: () => void;
  readonly onSetLookupQuery?: (value: string) => void;
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly session: TurretSimulationSession;
}

const FIELD_SOURCE_COPY: Record<SimulationFieldSource, string> = {
  "authorize-context": "Context",
  "default": "Default",
  "manual": "Manual",
  "remote-suggestion": "Suggested",
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

function ModalField(input: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="grid gap-2">
      <dt className="font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">
        {input.label}
      </dt>
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
    <span className={`inline-flex items-center border px-2 py-1 font-heading text-[0.58rem] uppercase tracking-[0.16em] ${className}`}>
      {FIELD_SOURCE_COPY[source]}
    </span>
  );
}

function DraftFieldShell(input: {
  readonly children: React.ReactNode;
  readonly controlId: string;
  readonly errorMessage?: string;
  readonly label: string;
  readonly source: SimulationFieldSource;
}) {
  return (
    <div className="grid gap-2">
      <span className="flex items-center justify-between gap-3">
        <label className="font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]" htmlFor={input.controlId}>
          {input.label}
        </label>
        <FieldSourceBadge source={input.source} />
      </span>
      {input.children}
      {input.errorMessage ? (
        <span className="text-xs text-[#ffd38d]">{input.errorMessage}</span>
      ) : null}
    </div>
  );
}

function DraftInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 font-mono text-xs text-[var(--cream-white)] outline-none transition-colors focus:border-[var(--brand-orange)] ${props.className ?? ""}`.trim()}
    />
  );
}

function DraftSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 font-mono text-xs text-[var(--cream-white)] outline-none transition-colors focus:border-[var(--brand-orange)] ${props.className ?? ""}`.trim()}
    />
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

function getContextFields(session: TurretSimulationSession): ReadonlyArray<{ readonly label: string; readonly value: string }> {
  return [
    { label: "Turret", value: getFallbackValue(session.turretTitle, formatAddress(session.turretObjectId ?? "")) },
    { label: "Turret Object", value: getFallbackValue(session.turretObjectId, "Unavailable") },
    { label: "Package", value: getFallbackValue(session.deploymentState?.packageId, "Unavailable") },
    { label: "Module", value: getFallbackValue(session.deploymentState?.moduleName, "Unavailable") },
    { label: "Target", value: getFallbackValue(session.deploymentState?.targetId, "Unavailable") },
    { label: "Owner Character", value: getOwnerCharacterValue(session) },
    { label: "Current Extension", value: getCurrentExtensionValue(session) },
  ];
}

function TurretSimulationHeader(input: {
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly session: TurretSimulationSession;
}) {
  const { closeLabel, onClose, session } = input;

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

      <button className="ff-header__button" onClick={onClose} type="button">
        {closeLabel}
      </button>
    </header>
  );
}

function TurretSimulationContextPanel(input: {
  readonly onRefreshContext?: () => void;
  readonly session: TurretSimulationSession;
}) {
  const { onRefreshContext, session } = input;
  const contextFields = getContextFields(session);

  return (
    <section className="grid gap-4 border border-[var(--ui-border-dark)] bg-[rgba(45,21,21,0.52)] p-4">
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

      <dl className="grid gap-4 sm:grid-cols-2">
        {contextFields.map((field) => (
          <ModalField key={field.label} label={field.label} value={field.value} />
        ))}
      </dl>

      {session.ownerCharacterErrorMessage !== null ? (
        <div className="border border-[rgba(255,211,141,0.4)] bg-[rgba(255,166,0,0.12)] px-4 py-3 text-sm text-[#ffd38d]" role="alert">
          {session.ownerCharacterErrorMessage}
        </div>
      ) : null}
    </section>
  );
}

function TurretSimulationLookupPanel(input: {
  readonly onApplySuggestion?: (suggestion: SimulationSuggestion) => void;
  readonly onLoadSuggestions?: (field: SimulationFieldKey, query?: string) => void;
  readonly onSetLookupQuery?: (value: string) => void;
  readonly session: TurretSimulationSession;
}) {
  const { onApplySuggestion, onLoadSuggestions, onSetLookupQuery, session } = input;

  return (
    <div className="grid gap-3 border border-[rgba(250,250,229,0.14)] bg-[rgba(16,21,31,0.56)] p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-[15rem] flex-1 gap-2">
          <label className="font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]" htmlFor="candidate-lookup-query">
            Candidate Lookup Query
          </label>
          <DraftInput
            aria-label="Candidate lookup query"
            id="candidate-lookup-query"
            onChange={(event) => {
              onSetLookupQuery?.(event.currentTarget.value);
            }}
            placeholder="Paste a candidate object id"
            value={session.candidateLookupQuery}
          />
        </div>
        <button
          className="ff-authorize-view__action"
          disabled={session.status === "stale" || session.suggestionState.isLoading}
          onClick={() => {
            onLoadSuggestions?.("itemId", session.candidateLookupQuery);
          }}
          type="button"
        >
          Lookup Candidate Object
        </button>
        <button
          className="ff-authorize-view__action"
          disabled={session.status === "stale" || session.suggestionState.isLoading}
          onClick={() => {
            onLoadSuggestions?.("characterId", "");
          }}
          type="button"
        >
          Suggest Owner Character
        </button>
      </div>

      {session.suggestionState.errorMessage !== null ? (
        <div className="text-sm text-[var(--text-secondary)]" role="status">
          {session.suggestionState.errorMessage}
        </div>
      ) : null}

      {session.suggestionState.suggestions.length > 0 ? (
        <div className="grid gap-2">
          <p className="font-heading text-[0.62rem] uppercase tracking-[0.18em] text-[var(--brand-orange)]">
            Remote Suggestions
          </p>
          <div className="grid gap-2">
            {session.suggestionState.suggestions.map((suggestion) => (
              <button
                className="flex items-start justify-between gap-4 border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-3 text-left transition-colors hover:border-[var(--brand-orange)]"
                key={`${suggestion.field}:${suggestion.value}:${suggestion.sourceObjectId ?? suggestion.label}`}
                onClick={() => {
                  onApplySuggestion?.(suggestion);
                }}
                type="button"
              >
                <span className="grid gap-1">
                  <span className="font-mono text-xs text-[var(--cream-white)]">{suggestion.label}</span>
                  {suggestion.description ? (
                    <span className="text-xs text-[var(--text-secondary)]">{suggestion.description}</span>
                  ) : null}
                </span>
                <span className="font-heading text-[0.58rem] uppercase tracking-[0.16em] text-[var(--brand-orange)]">
                  Apply
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SimulationTextField(input: {
  readonly controlId: string;
  readonly errorMessage?: string;
  readonly label: string;
  readonly onChange?: (value: string) => void;
  readonly source: SimulationFieldSource;
  readonly value: string;
}) {
  const { controlId, errorMessage, label, onChange, source, value } = input;

  return (
    <DraftFieldShell controlId={controlId} errorMessage={errorMessage} label={label} source={source}>
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

function SimulationIntegerField(input: {
  readonly controlId: string;
  readonly errorMessage?: string;
  readonly label: string;
  readonly onChange?: (value: number | null) => void;
  readonly source: SimulationFieldSource;
  readonly value: number | null;
}) {
  const { controlId, errorMessage, label, onChange, source, value } = input;

  return (
    <DraftFieldShell controlId={controlId} errorMessage={errorMessage} label={label} source={source}>
      <DraftInput
        aria-label={label}
        id={controlId}
        onChange={(event) => {
          onChange?.(parseOptionalInteger(event.currentTarget.value));
        }}
        type="number"
        value={value ?? ""}
      />
    </DraftFieldShell>
  );
}

function TurretSimulationDraftFields(input: {
  readonly onUpdateField?: <TKey extends SimulationFieldKey>(key: TKey, value: SimulationFieldValue<TKey>) => void;
  readonly session: TurretSimulationSession;
}) {
  const { onUpdateField, session } = input;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SimulationTextField controlId="simulation-item-id" errorMessage={session.fieldErrors.itemId} label="Item Id" onChange={(value) => { onUpdateField?.("itemId", value); }} source={session.draft.fieldSources.itemId} value={session.draft.candidate.itemId} />
      <SimulationTextField controlId="simulation-type-id" errorMessage={session.fieldErrors.typeId} label="Type Id" onChange={(value) => { onUpdateField?.("typeId", value); }} source={session.draft.fieldSources.typeId} value={session.draft.candidate.typeId} />
      <SimulationTextField controlId="simulation-group-id" errorMessage={session.fieldErrors.groupId} label="Group Id" onChange={(value) => { onUpdateField?.("groupId", value); }} source={session.draft.fieldSources.groupId} value={session.draft.candidate.groupId} />
      <SimulationIntegerField controlId="simulation-character-id" errorMessage={session.fieldErrors.characterId} label="Character Id" onChange={(value) => { onUpdateField?.("characterId", value); }} source={session.draft.fieldSources.characterId} value={session.draft.candidate.characterId} />
      <SimulationIntegerField controlId="simulation-character-tribe" errorMessage={session.fieldErrors.characterTribe} label="Character Tribe" onChange={(value) => { onUpdateField?.("characterTribe", value); }} source={session.draft.fieldSources.characterTribe} value={session.draft.candidate.characterTribe} />
      <SimulationTextField controlId="simulation-priority-weight" errorMessage={session.fieldErrors.priorityWeight} label="Priority Weight" onChange={(value) => { onUpdateField?.("priorityWeight", value); }} source={session.draft.fieldSources.priorityWeight} value={session.draft.candidate.priorityWeight} />
      <SimulationTextField controlId="simulation-hp-ratio" errorMessage={session.fieldErrors.hpRatio} label="HP Ratio" onChange={(value) => { onUpdateField?.("hpRatio", value); }} source={session.draft.fieldSources.hpRatio} value={session.draft.candidate.hpRatio} />
      <SimulationTextField controlId="simulation-shield-ratio" errorMessage={session.fieldErrors.shieldRatio} label="Shield Ratio" onChange={(value) => { onUpdateField?.("shieldRatio", value); }} source={session.draft.fieldSources.shieldRatio} value={session.draft.candidate.shieldRatio} />
      <SimulationTextField controlId="simulation-armor-ratio" errorMessage={session.fieldErrors.armorRatio} label="Armor Ratio" onChange={(value) => { onUpdateField?.("armorRatio", value); }} source={session.draft.fieldSources.armorRatio} value={session.draft.candidate.armorRatio} />

      <DraftFieldShell controlId="simulation-is-aggressor" label="Aggressor" source={session.draft.fieldSources.isAggressor}>
        <label className="flex items-center gap-3 border border-[var(--ui-border-dark)] bg-[rgba(10,6,6,0.92)] px-3 py-2 text-xs text-[var(--cream-white)]">
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
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly onRunSimulation?: () => void;
  readonly session: TurretSimulationSession;
}) {
  const { closeLabel, onClose, onRunSimulation, session } = input;

  return (
    <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-[var(--ui-border-dark)] pt-4">
      <p className="mr-auto text-xs text-[var(--text-secondary)]">
        {session.draft.isComplete ? "Draft is ready for execution wiring." : "Remote suggestions are optional. You can manually fill any unresolved field."}
      </p>
      <button className="ff-authorize-view__action" onClick={onClose} type="button">
        {closeLabel}
      </button>
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
  const { closeLabel = "Close", onApplySuggestion, onClose, onLoadSuggestions, onRunSimulation, onSetLookupQuery, onUpdateField, session } = input;

  return (
    <section className="grid gap-4 border border-[var(--ui-border-dark)] bg-[rgba(10,15,20,0.86)] p-4">
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

      <TurretSimulationLookupPanel
        onApplySuggestion={onApplySuggestion}
        onLoadSuggestions={onLoadSuggestions}
        onSetLookupQuery={onSetLookupQuery}
        session={session}
      />
      <TurretSimulationDraftFields onUpdateField={onUpdateField} session={session} />
      <TurretSimulationFeedback session={session} />
      <TurretSimulationFooter closeLabel={closeLabel} onClose={onClose} onRunSimulation={onRunSimulation} session={session} />
    </section>
  );
}

/**
 * Present the active turret simulation workspace inside the authorize workflow.
 */
function TurretSimulationModal({
  closeLabel = "Close",
  onApplySuggestion,
  onClose,
  onLoadSuggestions,
  onRefreshContext,
  onRunSimulation,
  onSetLookupQuery,
  onUpdateField,
  session,
}: TurretSimulationModalProps) {
  if (session.status === "closed" || session.turret === null || session.deploymentState === null || session.turretObjectId === null) {
    return null;
  }

  return (
    <section
      aria-describedby="turret-simulation-description"
      aria-labelledby="turret-simulation-title"
      className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--ui-border-dark)] bg-[rgba(16,21,31,0.97)] shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
    >
      <TurretSimulationHeader closeLabel={closeLabel} onClose={onClose} session={session} />

      <div className="grid flex-1 gap-5 overflow-y-auto px-5 py-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <TurretSimulationContextPanel onRefreshContext={onRefreshContext} session={session} />
        <TurretSimulationDraftPanel
          closeLabel={closeLabel}
          onApplySuggestion={onApplySuggestion}
          onClose={onClose}
          onLoadSuggestions={onLoadSuggestions}
          onRefreshContext={onRefreshContext}
          onRunSimulation={onRunSimulation}
          onSetLookupQuery={onSetLookupQuery}
          onUpdateField={onUpdateField}
          session={session}
        />
      </div>
    </section>
  );
}

export default TurretSimulationModal;