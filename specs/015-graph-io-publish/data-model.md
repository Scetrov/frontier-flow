# 1. Data Model: Graph Import, Export, and Publish

**Feature**: 015-graph-io-publish  
**Date**: 2026-03-28

## 1.1. Entities

### 1.1.1. PortableGraphDocument

Versioned interchange document used for both YAML export and Walrus storage.

| Field        | Type                    | Description                                              |
| ------------ | ----------------------- | -------------------------------------------------------- |
| `version`    | `1`                     | Document schema version                                  |
| `kind`       | `"frontier-flow-graph"` | Explicit discriminator for safe validation               |
| `exportedAt` | `string`                | ISO timestamp when the document was created              |
| `appVersion` | `string`                | Frontier Flow app version that created the document      |
| `contract`   | `PortableGraphContract` | Saved-contract metadata                                  |
| `graph`      | `PortableGraphSnapshot` | Nodes, edges, and graph layout data required for restore |

**Validation rules**:

- `version` must be recognized.
- `kind` must equal `frontier-flow-graph`.
- `graph.nodes` and `graph.edges` must both be arrays.
- Every edge endpoint must reference an existing node.

### 1.1.2. PortableGraphContract

Describes the contract-level metadata represented by the document.

| Field         | Type                  | Description                                 |
| ------------- | --------------------- | ------------------------------------------- |
| `name`        | `string`              | Human-readable saved contract name          |
| `description` | `string \| undefined` | Optional contract description               |
| `updatedAt`   | `string`              | Last-known saved timestamp from local state |
| `source`      | `PortableGraphSource` | Provenance describing file export or Walrus |

### 1.1.3. PortableGraphSnapshot

Graph content restored into the local saved-contract library.

| Field     | Type           | Description                                                     |
| --------- | -------------- | --------------------------------------------------------------- |
| `nodes`   | `FlowNode[]`   | Full node array including positions and node data               |
| `edges`   | `FlowEdge[]`   | Full edge array                                                 |
| `summary` | `GraphSummary` | Optional counts used for validation, UX, and post-import review |

### 1.1.4. PublishedGraphProvenance

Optional Walrus metadata attached to a local saved contract after successful publish.

| Field          | Type                  | Description                                       |
| -------------- | --------------------- | ------------------------------------------------- |
| `blobId`       | `string`              | Walrus blob identifier used for re-import         |
| `blobObjectId` | `string \| undefined` | Optional created Walrus object id                 |
| `network`      | `"testnet"`           | Walrus network used for publish                   |
| `publishedAt`  | `string`              | ISO timestamp                                     |
| `contentType`  | `string`              | Expected to be `application/x.frontier-flow+yaml` |

**Relationship**: Stored as optional metadata on a local saved-contract entry. It does not replace local graph data.

### 1.1.5. GraphTransferRequest

Unified input model for user-triggered transfer actions.

| Field          | Type                                                        | Description                            |
| -------------- | ----------------------------------------------------------- | -------------------------------------- |
| `mode`         | `"import-file" \| "import-walrus" \| "export" \| "publish"` | Requested transfer action              |
| `contractName` | `string`                                                    | Active contract at the time of request |
| `source`       | `File \| WalrusGraphReference \| null`                      | External input when required           |

### 1.1.6. GraphTransferState

Transient UI state for the dialog and hook.

| Field     | Type                                                                                                  | Description                    |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ |
| `status`  | `"idle" \| "collecting-input" \| "validating" \| "publishing" \| "importing" \| "success" \| "error"` | Current transfer stage         |
| `mode`    | `GraphTransferRequest["mode"] \| null`                                                                | Active action                  |
| `message` | `string \| null`                                                                                      | User-visible progress or error |
| `result`  | `GraphTransferResult \| null`                                                                         | Success payload                |

### 1.1.7. GraphTransferResult

Outcome returned from a completed transfer flow.

| Field             | Type                                    | Description                               |
| ----------------- | --------------------------------------- | ----------------------------------------- |
| `importedName`    | `string \| undefined`                   | Name of the contract created or activated |
| `downloadName`    | `string \| undefined`                   | File name used for export                 |
| `walrusReference` | `PublishedGraphProvenance \| undefined` | Walrus provenance from publish or import  |

## 1.2. State Transitions

### 1.2.1. YAML Import

```text
idle → collecting-input → validating → importing → success
                               ↓            ↓
                             error        error
```

### 1.2.2. YAML Export

```text
idle → export preparation → success
                    ↓
                  error
```

### 1.2.3. Walrus Publish

```text
idle → collecting-input → publishing → success
                               ↓            ↓
                             error        error
```

### 1.2.4. Walrus Import

```text
idle → collecting-input → validating → importing → success
                               ↓            ↓
                             error        error
```

## 1.3. Storage Summary

| Entity                     | Storage                           | Scope         |
| -------------------------- | --------------------------------- | ------------- |
| `PortableGraphDocument`    | YAML file or Walrus blob          | External      |
| `PublishedGraphProvenance` | localStorage via contract library | Cross-session |
| `GraphTransferState`       | React state                       | Transient     |
| Local saved contract       | localStorage contract library     | Cross-session |

## 1.4. Merge and Conflict Rules

- Imported contracts never silently overwrite an existing saved contract.
- Name collisions resolve through the same unique-name strategy already used by `Save Copy`.
- Failed validation leaves the active contract and saved-contract library unchanged.
- Seeded example contracts remain immutable from the perspective of import replacement.
