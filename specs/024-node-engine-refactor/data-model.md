# 1. Data Model: Node Engine Refactor

## 1.1. Node Definition Catalog Entry

Represents a canonical node type in `src/data/node-definitions.ts`.

| Field         | Type                 | Notes                                                                                               |
| ------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| `type`        | string               | Stable React Flow/runtime key such as `enteredAttacked`, `aggression`, `proximity`, or `addToQueue` |
| `label`       | string               | Author-facing toolbox/canvas label                                                                  |
| `description` | string               | Short explanation shown in previews and nodes                                                       |
| `category`    | enum                 | Existing node category grouping                                                                     |
| `sockets`     | `SocketDefinition[]` | Ordered handle metadata used for render and validation                                              |
| `deprecation` | optional object      | Existing status model used for legacy visibility and messaging                                      |

**Validation rules**:

- `enteredAttacked` must expose `priority` and `target` outputs.
- `aggression` and `proximity` must remain hydratable runtime entries even when hidden from the toolbox.
- `addToQueue` must not expose `priority_out` after the refactor.

## 1.2. Flow Node Instance

Represents one placed React Flow node in a saved or active graph.

| Field              | Type                 | Notes                                                                   |
| ------------------ | -------------------- | ----------------------------------------------------------------------- |
| `id`               | string               | Stable graph-local identifier                                           |
| `type`             | string               | Must map to a catalog entry during hydration                            |
| `position`         | object               | React Flow coordinates                                                  |
| `data.fields`      | map                  | Persisted node fields after normalization                               |
| `data.sockets`     | `SocketDefinition[]` | Hydrated from the canonical definition, not trusted from saved payloads |
| `data.deprecation` | optional object      | Canvas messaging for legacy nodes                                       |

**State transitions**:

1. Toolbox drag/drop creates a new node from the canonical definition.
2. Restore hydrates a saved node by replacing render metadata from the current definition catalog.
3. Legacy trigger nodes remain renderable after hydration but are no longer authorable from the toolbox.

## 1.3. Flow Edge Connection

Represents a directional connection between two node handles.

| Field          | Type   | Notes                                                    |
| -------------- | ------ | -------------------------------------------------------- |
| `id`           | string | Deterministic enough for React Flow identity and restore |
| `source`       | string | Source node id                                           |
| `sourceHandle` | string | Source socket id                                         |
| `target`       | string | Target node id                                           |
| `targetHandle` | string | Target socket id                                         |

**Validation rules**:

- Only compatible socket types may connect.
- Duplicate edge tuples for the same source/sourceHandle/target/targetHandle are invalid.
- Restored edges whose handles no longer exist, such as legacy `priority_out`, are dropped during restore.

## 1.4. Queue Weight Value

Represents the final numeric queue weight used by `addToQueue`.

| Source                  | Meaning                                            |
| ----------------------- | -------------------------------------------------- |
| Connected `priority_in` | Inherited upstream candidate priority              |
| Connected `weight`      | Explicit override from a scoring or numeric source |
| Persisted/imported `0`  | Must normalize to `100` before save/compile output |

**Validation rules**:

- A value of `0` is not emitted; it canonicalizes to `100`.
- Non-zero values are preserved.
- Normalization must work for fresh edits and restored graph data.

## 1.5. Auto-Wire Evaluation

Represents the transient decision made when a new `addToQueue` node is dropped.

| Field            | Type   | Notes                                                             |
| ---------------- | ------ | ----------------------------------------------------------------- |
| `queueNodeId`    | string | Newly created `addToQueue` node                                   |
| `triggerNodeId`  | string | Selected `enteredAttacked` source node                            |
| `candidateEdges` | list   | Potential `priority -> priority_in` and `target -> target` edges  |
| `skippedReasons` | list   | Existing input already connected, missing trigger, duplicate edge |

**State transitions**:

1. New `addToQueue` node is created.
2. Canvas scans for a compatible `enteredAttacked` node.
3. Missing deterministic edges are created.
4. Existing or conflicting inputs are left unchanged.
