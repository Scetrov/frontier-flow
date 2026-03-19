# Contract: Node Field Persistence and Legacy Migration Interface

## Purpose

Define the interface between node definitions, persisted node data, restore logic, and legacy migration for editable node fields and retired node types.

## Node Field Contract

### Definition Contract

Each editable node definition must declare:

- `fields`: ordered schema entries for editable values
- `field.id`: stable persisted identifier
- `field.valueType`: scalar or list element type
- `field.required`: whether the field must be populated for a valid node
- `field.defaultValue`: optional initial value
- `field.editorKind`: how the UI renders the field

### Persistence Contract

Each flow node with editable values must persist:

- `nodeId`
- `type`
- `fieldValues`: record keyed by `field.id`

Rules:

- Persisted `fieldValues` must survive save, restore, and hydration.
- Hydration must not silently discard valid persisted field values.
- Unknown field IDs or invalid field values must trigger validation/remediation, not silent acceptance.

## List Field Rules

- List editors must support add, edit, and remove actions.
- Validation must run per entry before the node is treated as valid.
- Empty, duplicate, or malformed entries must be rejected when prohibited by the field schema.
- Re-opening the same node must show the last valid saved list values.

## Legacy Migration Contract

### Migration Input

A legacy restore candidate includes:

- retired `type`
- serialized node payload
- related incoming and outgoing edges

### Migration Output

The restore path must produce one of two outcomes:

- `migrated`: replacement primitive node payloads plus adjusted edges when an exact mapping exists
- `remediated`: original graph loads safely and a user-visible remediation notice is emitted for the unsupported legacy portion

### Migration Rules

- Auto-migration is allowed only when the replacement preserves semantics exactly.
- Migration rules must define how legacy handles map to replacement handles.
- Non-convertible legacy content must never disappear silently.
- Unknown legacy content must not crash the restore path.

## Remediation Notice Contract

A remediation notice must include:

- affected node identifier or legacy type
- human-readable explanation
- suggested manual follow-up
- severity appropriate for user-facing recovery

## Consumer Expectations

- `restoreSavedFlow` can rely on a single migration interface before final node hydration.
- Canvas UI can surface remediation notices without inspecting migration internals.
- Compiler and generator logic consume only current supported node types after successful migration.
