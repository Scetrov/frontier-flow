import type { StoredDeploymentState, TurretInfo } from "./authorization";

export type SimulationFieldSource = "authorize-context" | "remote-suggestion" | "default" | "manual";

export interface SimulationCandidateDraft {
  readonly itemId: string;
  readonly typeId: string;
  readonly groupId: string;
  readonly characterId: number | null;
  readonly characterTribe: number | null;
  readonly hpRatio: string;
  readonly shieldRatio: string;
  readonly armorRatio: string;
  readonly isAggressor: boolean;
  readonly priorityWeight: string;
  readonly behaviourChange: 0 | 1 | 2 | 3;
}

export type SimulationFieldKey = keyof SimulationCandidateDraft;
export type SimulationFieldValue<TKey extends SimulationFieldKey> = SimulationCandidateDraft[TKey];
export type SimulationFieldErrors = Partial<Record<SimulationFieldKey, string>>;

export type SimulationFieldSourceMap = Readonly<Record<SimulationFieldKey, SimulationFieldSource>>;

export interface SimulationSuggestion {
  readonly field: SimulationFieldKey;
  readonly label: string;
  readonly value: string;
  readonly description: string | null;
  readonly derivedFields: Partial<SimulationCandidateDraft>;
  readonly sourceObjectId: string | null;
}

export interface SimulationSuggestionState {
  readonly activeField: SimulationFieldKey | null;
  readonly errorMessage: string | null;
  readonly isLoading: boolean;
  readonly query: string;
  readonly suggestions: readonly SimulationSuggestion[];
}

export interface SimulationInputDraft {
  readonly candidate: SimulationCandidateDraft;
  readonly fieldSources: SimulationFieldSourceMap;
  readonly isComplete: boolean;
  readonly lastHydratedAt: number;
}

export interface SimulationPriorityEntry {
  readonly targetItemId: string;
  readonly priorityWeight: string;
}

export interface SimulationRunResult {
  readonly kind: "success";
  readonly entries: readonly SimulationPriorityEntry[];
  readonly rawReturnedBytes: Uint8Array;
  readonly executedAt: number;
}

export type SimulationRunErrorKind = "stale-context" | "validation" | "lookup" | "execution";

export interface SimulationRunError {
  readonly kind: SimulationRunErrorKind;
  readonly message: string;
  readonly details: string | null;
  readonly failedAt: number;
}

export type TurretSimulationSessionStatus = "closed" | "editing" | "running" | "stale";

export interface OpenTurretSimulationInput {
  readonly deploymentKey: string;
  readonly deploymentState: StoredDeploymentState;
  readonly turret: TurretInfo;
}

export interface TurretSimulationSession {
  readonly status: TurretSimulationSessionStatus;
  readonly candidateLookupQuery: string;
  readonly deploymentKey: string | null;
  readonly deploymentState: StoredDeploymentState | null;
  readonly draft: SimulationInputDraft;
  readonly fieldErrors: SimulationFieldErrors;
  readonly isHydratingOwnerCharacter: boolean;
  readonly latestError: SimulationRunError | null;
  readonly latestResult: SimulationRunResult | null;
  readonly openedAt: number | null;
  readonly openedExtensionTypeName: string | null;
  readonly ownerCharacterErrorMessage: string | null;
  readonly ownerCharacterId: string | null;
  readonly staleMessage: string | null;
  readonly suggestionState: SimulationSuggestionState;
  readonly turret: TurretInfo | null;
  readonly turretObjectId: string | null;
  readonly turretTitle: string | null;
}

export interface UseTurretSimulationResult {
  readonly applySuggestion: (suggestion: SimulationSuggestion) => void;
  readonly closeSimulation: () => void;
  readonly isOpen: boolean;
  readonly loadSuggestions: (field: SimulationFieldKey, query?: string) => Promise<void>;
  readonly openSimulation: (input: OpenTurretSimulationInput) => void;
  readonly refreshContext: () => Promise<void>;
  readonly runSimulation: () => Promise<void>;
  readonly setLookupQuery: (value: string) => void;
  readonly session: TurretSimulationSession;
  readonly updateField: <TKey extends SimulationFieldKey>(
    key: TKey,
    value: SimulationFieldValue<TKey>,
  ) => void;
}

const DEFAULT_CANDIDATE_DRAFT: SimulationCandidateDraft = {
  itemId: "",
  typeId: "",
  groupId: "",
  characterId: null,
  characterTribe: null,
  hpRatio: "100",
  shieldRatio: "100",
  armorRatio: "100",
  isAggressor: false,
  priorityWeight: "0",
  behaviourChange: 1,
};

const DEFAULT_FIELD_SOURCES: SimulationFieldSourceMap = {
  itemId: "default",
  typeId: "default",
  groupId: "default",
  characterId: "default",
  characterTribe: "default",
  hpRatio: "default",
  shieldRatio: "default",
  armorRatio: "default",
  isAggressor: "default",
  priorityWeight: "default",
  behaviourChange: "default",
};

export function createEmptySimulationInputDraft(now = Date.now()): SimulationInputDraft {
  return {
    candidate: { ...DEFAULT_CANDIDATE_DRAFT },
    fieldSources: { ...DEFAULT_FIELD_SOURCES },
    isComplete: false,
    lastHydratedAt: now,
  };
}

export function createEmptySimulationSuggestionState(): SimulationSuggestionState {
  return {
    activeField: null,
    errorMessage: null,
    isLoading: false,
    query: "",
    suggestions: [],
  };
}

export function createClosedTurretSimulationSession(): TurretSimulationSession {
  return {
    status: "closed",
    candidateLookupQuery: "",
    deploymentKey: null,
    deploymentState: null,
    draft: createEmptySimulationInputDraft(0),
    fieldErrors: {},
    isHydratingOwnerCharacter: false,
    latestError: null,
    latestResult: null,
    openedAt: null,
    openedExtensionTypeName: null,
    ownerCharacterErrorMessage: null,
    ownerCharacterId: null,
    staleMessage: null,
    suggestionState: createEmptySimulationSuggestionState(),
    turret: null,
    turretObjectId: null,
    turretTitle: null,
  };
}