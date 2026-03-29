# 1. Data Model: Turret Input Simulation

**Feature**: `018-simulate-turret-inputs`
**Date**: 2026-03-29

## 1.1. Entities

### 1.1.1. TurretSimulationSession

Represents one modal session bound to one turret and one active deployment.

| Field              | Type                                            | Description                                                            |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `status`           | `"closed" \| "editing" \| "running" \| "stale"` | High-level modal lifecycle                                             |
| `deploymentKey`    | `string`                                        | Composite target/package/module identity captured when the modal opens |
| `turretObjectId`   | `string`                                        | The selected turret's Sui object id                                    |
| `turretTitle`      | `string`                                        | Display label shown in the modal header                                |
| `ownerCharacterId` | `string \| null`                                | The character resolved for the selected turret                         |
| `openedAt`         | `number`                                        | Timestamp used for request/result correlation                          |
| `draft`            | `SimulationInputDraft`                          | Current editable input state                                           |
| `latestResult`     | `SimulationRunResult \| null`                   | Most recent completed result                                           |
| `latestError`      | `SimulationRunError \| null`                    | Most recent failed result                                              |

**Validation rules**:

- `deploymentKey` must still match the live Authorize deployment key before a run can start.
- `turretObjectId` must still exist in the latest turret list and represent the same extension context.
- `ownerCharacterId` must be resolved before execution.

**State transitions**:

`closed` → `editing` → `running` → `editing`

`editing` → `stale`

`stale` → `editing` only after refresh/reopen with fresh context

### 1.1.2. SimulationInputDraft

The editable payload used to build the BCS candidate bytes and execution request.

| Field            | Type                       | Description                                      |
| ---------------- | -------------------------- | ------------------------------------------------ |
| `candidate`      | `SimulationCandidateDraft` | Single candidate under test                      |
| `fieldSources`   | `SimulationFieldSourceMap` | Provenance for each field                        |
| `lastHydratedAt` | `number`                   | Last time local or remote data updated the draft |
| `isComplete`     | `boolean`                  | Whether required fields are currently runnable   |

### 1.1.3. SimulationCandidateDraft

Front-end representation of the stable `TargetCandidateArg` schema.

| Field             | Type               | Description                          |
| ----------------- | ------------------ | ------------------------------------ |
| `itemId`          | `string`           | Candidate in-game item id (`u64`)    |
| `typeId`          | `string`           | Candidate type id (`u64`)            |
| `groupId`         | `string`           | Candidate group id (`u64`)           |
| `characterId`     | `number`           | Candidate owner/character id (`u32`) |
| `characterTribe`  | `number`           | Candidate tribe id (`u32`)           |
| `hpRatio`         | `string`           | Candidate hull percentage (`u64`)    |
| `shieldRatio`     | `string`           | Candidate shield percentage (`u64`)  |
| `armorRatio`      | `string`           | Candidate armor percentage (`u64`)   |
| `isAggressor`     | `boolean`          | Candidate aggression flag            |
| `priorityWeight`  | `string`           | Candidate base priority (`u64`)      |
| `behaviourChange` | `0 \| 1 \| 2 \| 3` | Encoded behavior reason              |

**Validation rules**:

- `itemId`, `typeId`, `groupId`, `hpRatio`, `shieldRatio`, `armorRatio`, and `priorityWeight` must parse to non-negative integers.
- `characterId` and `characterTribe` must be non-negative integers within `u32` range.
- `hpRatio`, `shieldRatio`, and `armorRatio` should stay within `0..100` in the default UI validation layer.
- `behaviourChange` values map to `unspecified`, `entered`, `started-attack`, and `stopped-attack`.

### 1.1.4. SimulationFieldSourceMap

Tracks where each current field value originated.

| Field             | Type                    | Description                           |
| ----------------- | ----------------------- | ------------------------------------- |
| `itemId`          | `SimulationFieldSource` | Source of the current item id         |
| `typeId`          | `SimulationFieldSource` | Source of the current type id         |
| `groupId`         | `SimulationFieldSource` | Source of the current group id        |
| `characterId`     | `SimulationFieldSource` | Source of the current character id    |
| `characterTribe`  | `SimulationFieldSource` | Source of the current tribe id        |
| `hpRatio`         | `SimulationFieldSource` | Source of the current hull ratio      |
| `shieldRatio`     | `SimulationFieldSource` | Source of the current shield ratio    |
| `armorRatio`      | `SimulationFieldSource` | Source of the current armor ratio     |
| `isAggressor`     | `SimulationFieldSource` | Source of the current aggression flag |
| `priorityWeight`  | `SimulationFieldSource` | Source of the current base weight     |
| `behaviourChange` | `SimulationFieldSource` | Source of the current behavior value  |

`SimulationFieldSource = "authorize-context" | "remote-suggestion" | "default" | "manual"`

### 1.1.5. SimulationSuggestion

Represents one autocomplete option or remote completion candidate.

| Field            | Type                                | Description                                                   |
| ---------------- | ----------------------------------- | ------------------------------------------------------------- |
| `field`          | `SimulationFieldKey`                | The target field                                              |
| `label`          | `string`                            | Human-readable combobox label                                 |
| `value`          | `string`                            | Raw value applied to the field                                |
| `description`    | `string \| null`                    | Secondary detail for the option                               |
| `derivedFields`  | `Partial<SimulationCandidateDraft>` | Additional fields that can be filled from the same remote hit |
| `sourceObjectId` | `string \| null`                    | Backing object id when applicable                             |

### 1.1.6. SimulationRunRequest

Normalized input passed to the execution utility.

| Field              | Type                    | Description                              |
| ------------------ | ----------------------- | ---------------------------------------- |
| `deploymentState`  | `StoredDeploymentState` | Active deployed package/module/target    |
| `turretObjectId`   | `string`                | Selected turret object                   |
| `ownerCharacterId` | `string`                | Selected turret owner character object   |
| `candidateBytes`   | `Uint8Array`            | BCS-encoded `vector<TargetCandidateArg>` |
| `sender`           | `string`                | Dev-inspect sender address               |

### 1.1.7. SimulationRunResult

Successful decoded result for the latest run.

| Field              | Type                                 | Description                                       |
| ------------------ | ------------------------------------ | ------------------------------------------------- |
| `kind`             | `"success"`                          | Result discriminator                              |
| `entries`          | `readonly SimulationPriorityEntry[]` | Decoded priority list                             |
| `rawReturnedBytes` | `Uint8Array`                         | Returned `vector<u8>` payload after Move decoding |
| `executedAt`       | `number`                             | Completion timestamp                              |

### 1.1.8. SimulationPriorityEntry

Front-end representation of `ReturnTargetPriorityList`.

| Field            | Type     | Description             |
| ---------------- | -------- | ----------------------- |
| `targetItemId`   | `string` | Returned target item id |
| `priorityWeight` | `string` | Returned weight         |

### 1.1.9. SimulationRunError

Represents a failed or blocked run while preserving the draft.

| Field      | Type             | Description                               |
| ---------- | ---------------- | ----------------------------------------- | -------- | ------------ | ------------------- |
| `kind`     | `"stale-context" | "validation"                              | "lookup" | "execution"` | Error discriminator |
| `message`  | `string`         | Actionable operator-facing message        |
| `details`  | `string \| null` | Optional raw or classified backend detail |
| `failedAt` | `number`         | Failure timestamp                         |

## 1.2. Relationships

```text
TurretSimulationSession
├── uses ──▶ StoredDeploymentState
├── targets ──▶ TurretInfo
├── owns ──▶ SimulationInputDraft
│             ├── contains ──▶ SimulationCandidateDraft
│             └── annotates ──▶ SimulationFieldSourceMap
├── consumes ──▶ SimulationSuggestion[]
└── produces ──▶ SimulationRunResult | SimulationRunError
```

## 1.3. Derived Defaults

| Field             | Initial strategy                                                            |
| ----------------- | --------------------------------------------------------------------------- |
| `itemId`          | Empty until a remote suggestion or manual entry supplies a candidate object |
| `typeId`          | Empty until a remote suggestion or manual entry supplies object metadata    |
| `groupId`         | Empty until a remote suggestion or manual entry supplies object metadata    |
| `characterId`     | Prefer owner-linked or object-derived remote suggestion; otherwise empty    |
| `characterTribe`  | Prefer owner-linked or object-derived remote suggestion; otherwise empty    |
| `hpRatio`         | `100`                                                                       |
| `shieldRatio`     | `100`                                                                       |
| `armorRatio`      | `100`                                                                       |
| `isAggressor`     | `false`                                                                     |
| `priorityWeight`  | `0` or a deterministic scenario default chosen by the UI                    |
| `behaviourChange` | `1` (`entered`) as the default interactive scenario                         |

## 1.4. Validation Summary

- A run is blocked when the deployment key changes, the turret disappears, or the turret extension identity no longer matches the modal snapshot.
- A run is blocked when required candidate fields remain blank after prefill and suggestion resolution.
- Remote lookup failures do not clear manual edits; they downgrade the unresolved fields back to manual entry.
- Successful empty priority lists are treated as valid `SimulationRunResult` values, not errors.
