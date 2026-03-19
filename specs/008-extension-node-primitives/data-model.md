# Data Model: Extension Node Primitive Refactor

## Entities

### PrimitiveNodeDefinition

**Description**: Canonical definition for a primitive predicate, boolean operator, or editable value node rendered in the canvas palette.

**Fields**:

- `type`
- `label`
- `description`
- `category`
- `color`
- `sockets`
- `fields`: optional list of `EditableFieldDefinition`
- `deprecation`: optional legacy metadata for replaced bundled nodes

**Relationships**:

- Owns zero or more `EditableFieldDefinition` entries
- Produces `FlowNodeInstance` records through node creation and hydration

**Validation rules**:

- `type` must be unique across the node catalogue
- Socket directions and socket types must remain valid for React Flow connections and compiler generation
- Primitive operator nodes must expose only boolean-compatible inputs and outputs

### EditableFieldDefinition

**Description**: Schema entry describing one editable field available on a node, including list-valued inputs.

**Fields**:

- `id`
- `label`
- `valueType`: string, number, boolean, tribe, typeId, or list subtype
- `required`
- `defaultValue`
- `validationRules`
- `editorKind`: single-value or list editor

**Relationships**:

- Belongs to one `PrimitiveNodeDefinition`
- Drives the shape of `NodeFieldValueSet`

**Validation rules**:

- `id` must be unique within one node definition
- `defaultValue` must satisfy the declared `valueType`
- List editors must define the element type they accept

### NodeFieldValueSet

**Description**: Persisted per-node field values captured from the field editor and stored with a flow node.

**Fields**:

- `nodeId`
- `values`: record of field IDs to typed scalar or list values
- `lastEditedAt`

**Relationships**:

- Belongs to one `FlowNodeInstance`
- Must conform to that node type’s `EditableFieldDefinition` list

**Validation rules**:

- Unknown field IDs are rejected during restore
- Required fields must be present before the node is treated as valid
- List-valued fields may not contain invalid, blank, or duplicate entries when the schema forbids them

### FlowNodeInstance

**Description**: One concrete node placed on the canvas, including its definition-derived display data and any persisted editable values.

**Fields**:

- `id`
- `type`
- `position`
- `data`
- `fieldValues`: optional `NodeFieldValueSet`

**Relationships**:

- References one `PrimitiveNodeDefinition`
- Participates in zero or more graph edges
- May originate from live creation, save/load, or migration

**Validation rules**:

- `type` must map to a current supported node definition or a legacy migration rule
- Persisted field values must survive hydration without being overwritten silently

### ExampleContractEntry

**Description**: Bundled graph template surfaced in the Load panel as a pre-populated example contract.

**Fields**:

- `id`
- `name`
- `description`
- `nodes`
- `edges`
- `isSeeded`
- `updatedAt`

**Relationships**:

- Appears inside the `ContractLibrary`
- Uses `FlowNodeInstance` records that must remain valid against current node definitions

**Validation rules**:

- `id` and `name` must be stable across releases
- Seeded examples must load without requiring missing node types
- Seeded examples must be distinguishable from user-created entries

### ContractLibrary

**Description**: Persisted library of loadable contracts shown in the Load panel.

**Fields**:

- `contracts`: list of seeded and user-created contract entries
- `selectedContractId`: optional currently selected entry
- `version`: optional storage version for compatibility

**Relationships**:

- Contains many `ExampleContractEntry` or user-created contract records
- Loaded and saved through contract storage utilities

**Validation rules**:

- Seeding must not erase existing user contracts
- Loading a contract over unsaved canvas work requires explicit confirmation

### LegacyNodeMigrationRule

**Description**: Declarative mapping from a retired config-based or bundled node type to a supported primitive-node replacement path.

**Fields**:

- `legacyType`
- `replacementTypes`
- `autoMigrate`: boolean
- `mappingRules`
- `remediationMessage`

**Relationships**:

- Evaluated during restore for one `LegacyGraphReference`
- Produces zero or more migrated `FlowNodeInstance` records and updated edges

**Validation rules**:

- `autoMigrate` may be true only when the mapping preserves semantics exactly
- Mapping rules must define how legacy handles map to replacement handles

### LegacyGraphReference

**Description**: Saved graph content that still references removed config-object nodes or retired composite nodes.

**Fields**:

- `nodeType`
- `serializedNodeData`
- `serializedEdges`
- `migrationStatus`: pending, migrated, remediated, or blocked

**Relationships**:

- Evaluated against zero or one `LegacyNodeMigrationRule`
- Produces optional `RemediationNotice`

**State transitions**:

- `pending -> migrated` when an exact replacement path exists and is applied
- `pending -> remediated` when the graph loads but requires user follow-up
- `pending -> blocked` only if the graph cannot be represented safely enough to load, which should be avoided under the clarified spec

### RemediationNotice

**Description**: User-visible notice describing legacy content that could not be migrated automatically.

**Fields**:

- `nodeId`
- `legacyType`
- `message`
- `severity`
- `suggestedAction`

**Relationships**:

- References one `LegacyGraphReference`
- Surfaced through the restore/load experience

**Validation rules**:

- Must identify the affected node or legacy construct clearly
- Must describe a concrete manual follow-up step
