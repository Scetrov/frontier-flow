# 1. Contract: Node Engine Refactor

## 1.1. Node Catalog Contract

### 1.1.1. Current Authoring Trigger

| Node Type         | Label                | Category        | Output Handles       |
| ----------------- | -------------------- | --------------- | -------------------- |
| `enteredAttacked` | `Entered / Attacked` | `event-trigger` | `priority`, `target` |

### 1.1.2. Legacy Trigger Compatibility

| Node Type    | Runtime Support        | Toolbox Visibility | Notes                            |
| ------------ | ---------------------- | ------------------ | -------------------------------- |
| `aggression` | Must remain hydratable | Hidden             | Legacy saved-graph compatibility |
| `proximity`  | Must remain hydratable | Hidden             | Legacy saved-graph compatibility |

## 1.2. `addToQueue` Socket Contract

| Handle Id     | Direction | Required Behavior                              |
| ------------- | --------- | ---------------------------------------------- |
| `priority_in` | Input     | Accepts inherited or explicitly wired priority input |
| `target`      | Input     | Accepts inherited or explicitly wired target input   |
| `predicate`   | Input     | Remains unchanged                              |
| `weight`      | Input     | Remains available for explicit weight override |

`priority_out` is removed from the public node contract and must not appear in the authoring definition after this feature lands.

## 1.3. Toolbox Visibility Contract

- The toolbox data source must exclude deprecated authoring nodes.
- Canvas restore and render must continue to support legacy nodes that are no longer authorable.
- Existing deprecated/retired semantics must remain consistent for all node types, not only the new trigger change.

## 1.4. Trigger-Input Wiring Contract

When an author invokes `Wire trigger inputs` on an `addToQueue` node:

1. The system checks for at least one compatible `enteredAttacked` node.
2. The system selects the first compatible trigger in stable node order.
3. The system proposes up to two edges: `priority -> priority_in` and `target -> target`.
4. The system creates only edges that do not already exist and do not target an input that is already connected.
5. If no compatible trigger exists, the queue node remains unchanged and no helper edges are created.

## 1.5. Restore Compatibility Contract

- Saved graphs containing `aggression` or `proximity` must load without migration failure.
- Saved edges pointing to removed handles, including `priority_out`, are discarded during restore instead of crashing the canvas.
- Hydrated node socket metadata comes from the canonical registry, not stale persisted payload data.

## 1.6. Queue Weight Contract

- Queue weights must never reach compiled output as `0`.
- Any queue weight value that evaluates to `0` canonicalizes to `100`.
- Non-zero values remain unchanged across restore, edit, IR build, and compilation.
