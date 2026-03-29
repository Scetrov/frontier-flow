# 1. Contract: Turret Simulation Interfaces

**Feature**: `018-simulate-turret-inputs`
**Date**: 2026-03-29

This document defines the internal interfaces between the Authorize UI, remote suggestion lookups, and the non-mutating simulation executor.

## 1.1. Row Action Contract

The turret list must expose a row-level simulation action without regressing selection behavior.

```ts
interface AuthorizeTurretItemProps {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
  readonly onSimulate?: (turret: TurretInfo) => void;
  readonly showReplacementWarning?: boolean;
  readonly turret: TurretInfo;
}
```

**Rules**:

- `onSimulate` opens a modal for the specific row and must remain available even when the selection checkbox is disabled because the current deployment is already authorized.
- Triggering `onSimulate` must not toggle the checkbox selection state as a side effect.
- The row action must be keyboard reachable and screen-reader labelled with the turret title.

## 1.2. Modal Orchestration Contract

```ts
interface OpenTurretSimulationInput {
  readonly deploymentState: StoredDeploymentState;
  readonly turret: TurretInfo;
  readonly deploymentKey: string;
}

interface UseTurretSimulationResult {
  readonly session: TurretSimulationSession;
  readonly openSimulation: (input: OpenTurretSimulationInput) => void;
  readonly closeSimulation: () => void;
  readonly refreshContext: () => Promise<void>;
  readonly updateField: <K extends SimulationFieldKey>(
    key: K,
    value: SimulationFieldValue<K>,
  ) => void;
  readonly applySuggestion: (suggestion: SimulationSuggestion) => void;
  readonly setLookupQuery: (value: string) => void;
  readonly loadSuggestions: (field: SimulationFieldKey, query?: string) => Promise<void>;
  readonly runSimulation: () => Promise<void>;
}
```

**Rules**:

- `openSimulation` snapshots the current deployment and turret identity.
- `refreshContext` revalidates the selected turret against the latest Authorize data sources before clearing a stale state.
- `runSimulation` must refuse execution while `session.status === "stale"`.

## 1.3. Suggestion Query Contract

```ts
interface FetchSimulationSuggestionsInput {
  readonly deploymentState: StoredDeploymentState;
  readonly turretObjectId: string;
  readonly walletAddress: string;
  readonly ownerCharacterId: string | null;
  readonly query: string;
  readonly field: SimulationFieldKey;
  readonly signal?: AbortSignal;
}

interface FetchSimulationSuggestionsResult {
  readonly suggestions: readonly SimulationSuggestion[];
  readonly refreshedTurret: TurretInfo | null;
}
```

**Rules**:

- Suggestion providers may reuse published world GraphQL endpoints already used by authorization and turret queries.
- Parsing must tolerate alternate key names and wrapped type-name objects in the same manner as the existing authorization utilities.
- When a remote hit can safely derive multiple candidate fields, the result should populate `derivedFields` so the modal can update the draft atomically.

## 1.4. Simulation Execution Contract

```ts
interface RunTurretSimulationInput {
  readonly deploymentState: StoredDeploymentState;
  readonly turretObjectId: string;
  readonly ownerCharacterId: string;
  readonly sender: string;
  readonly candidate: SimulationCandidateDraft;
}

type RunTurretSimulationResult =
  | {
      readonly kind: "success";
      readonly entries: readonly SimulationPriorityEntry[];
      readonly rawReturnedBytes: Uint8Array;
    }
  | {
      readonly kind: "execution-error";
      readonly message: string;
      readonly details?: string;
    };
```

**Execution algorithm**:

1. Encode the draft as `vector<TargetCandidateArg>` using the shared BCS codec.
2. Build a `Transaction` that calls `world::turret::verify_online` for the selected turret.
3. Call `<packageId>::<moduleName>::get_target_priority_list` with the turret object, owner character object, encoded candidate bytes, and the `OnlineReceipt` from step 2.
4. Execute the transaction with `devInspectTransactionBlock`.
5. Decode the returned Move value from `vector<u8>` into `ReturnTargetPriorityList[]`.

**Rules**:

- The executor must never sign, submit, or mutate chain state.
- `result.error` and missing return values must be classified into operator-facing execution failures.
- A decoded empty list is a successful simulation outcome.
- The runtime returns Move-encoded `vector<u8>` bytes, so callers must unwrap that outer byte vector before decoding the priority-list payload.

## 1.5. Validation Contract

```ts
interface ValidateSimulationDraftResult {
  readonly isValid: boolean;
  readonly fieldErrors: Partial<Record<SimulationFieldKey, string>>;
}
```

Validation must happen before execution and cover:

- numeric format and range
- required identity fields
- stale deployment/turret context
- owner-character resolution availability
