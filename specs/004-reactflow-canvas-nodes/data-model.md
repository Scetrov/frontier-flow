# Data Model: ReactFlow Canvas Node Components

**Feature**: 004-reactflow-canvas-nodes | **Date**: 2026-03-12

## 1. Core Type Definitions

### 1.1 SocketType

```typescript
type SocketType =
  | "rider"
  | "tribe"
  | "standing"
  | "wallet"
  | "priority"
  | "target"
  | "boolean"
  | "list"
  | "number"
  | "string"
  | "any";
```

**Move core type mapping:**

| Move Core | Domain Types                        |
| --------- | ----------------------------------- |
| Signal    | `boolean`                           |
| Entity    | `rider`, `tribe`, `target`          |
| Value     | `standing`, `wallet`, `number`, `string` |
| Vector    | `list`, `priority`                  |
| Any       | `any`                               |

### 1.2 SocketDefinition

```typescript
interface SocketDefinition {
  readonly id: string;
  readonly type: SocketType;
  readonly position: "left" | "right" | "top" | "bottom";
  readonly direction: "input" | "output";
  readonly label: string;
}
```

**Validation rules:**
- `id` must be unique within a node
- `direction: "input"` sockets use ReactFlow `Handle` type `"target"`
- `direction: "output"` sockets use ReactFlow `Handle` type `"source"`
- Position determines which side of the node body the handle renders

### 1.3 NodeCategory

```typescript
type NodeCategory =
  | "event-trigger"
  | "data-accessor"
  | "data-source"
  | "logic-gate"
  | "action";
```

### 1.4 NodeDefinition (Extended)

```typescript
interface NodeDefinition {
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly category: NodeCategory;
  readonly sockets: readonly SocketDefinition[];
}
```

**Relationships:**
- Extends the existing interface from `src/types/nodes.ts` with `category` and `sockets`
- Each `NodeDefinition` maps 1:1 to a ReactFlow custom node component
- The `type` field is the key in the `nodeTypes` registry

### 1.5 NodeData (ReactFlow Runtime)

```typescript
interface NodeData {
  readonly label: string;
  readonly sockets: readonly SocketDefinition[];
  readonly category: NodeCategory;
}
```

**Usage:** Passed as the `data` prop to ReactFlow nodes at instance creation time.

## 2. Socket Compatibility Matrix

```typescript
const socketCompatibility: Record<SocketType, readonly SocketType[]> = {
  rider: ["rider", "any"],
  tribe: ["tribe", "any"],
  standing: ["standing", "number", "any"],
  wallet: ["wallet", "any"],
  priority: ["priority", "any"],
  target: ["target", "rider", "any"],
  boolean: ["boolean", "any"],
  list: ["list", "any"],
  number: ["number", "standing", "any"],
  string: ["string", "any"],
  any: ["rider", "tribe", "standing", "wallet", "priority", "target", "boolean", "list", "number", "string", "any"],
};
```

**Rules:**
- Symmetric where indicated (e.g., `standing` ↔ `number`)
- `any` is universally compatible with all types
- `target` can connect to `rider` (target is a superset of rider in the domain)
- Connections are directional: only `output` → `input`

## 3. Node Definitions (Complete 9-Node Set)

### 3.1 Proximity (Event Trigger)

| Socket     | Position | Type       | Direction | Description                |
| ---------- | -------- | ---------- | --------- | -------------------------- |
| `priority` | right    | `priority` | output    | Priority queue to populate |
| `target`   | right    | `target`   | output    | Detected entity reference  |

**Move mapping:** `get_target_priority_list()` entry point

### 3.2 Aggression (Event Trigger)

| Socket      | Position | Type       | Direction | Description                |
| ----------- | -------- | ---------- | --------- | -------------------------- |
| `priority`  | right    | `priority` | output    | Priority queue to populate |
| `aggressor` | right    | `rider`    | output    | The attacking rider        |
| `victim`    | right    | `rider`    | output    | The attacked rider         |

**Move mapping:** `is_aggressor` field check + `BehaviourChangeReason` enum

### 3.3 Get Tribe (Data Accessor)

| Socket     | Position | Type       | Direction | Description      |
| ---------- | -------- | ---------- | --------- | ---------------- |
| `rider`    | left     | `rider`    | input     | Rider to expand  |
| `tribe`    | right    | `tribe`    | output    | Rider's tribe    |
| `standing` | right    | `standing` | output    | Rider's standing |
| `wallet`   | right    | `wallet`   | output    | Rider's wallet   |

**Move mapping:** `character_tribe(&candidate)` + `character::tribe(owner_character)`

### 3.4 List of Tribe (Data Source)

| Socket  | Position | Type   | Direction | Description        |
| ------- | -------- | ------ | --------- | ------------------ |
| `items` | right    | `list` | output    | List of tribe data |

**Move mapping:** `let tribes: vector<u32> = vector[...]`

### 3.5 Is In List (Logic Gate)

| Socket       | Position | Type      | Direction | Description              |
| ------------ | -------- | --------- | --------- | ------------------------ |
| `input_item` | left     | `any`     | input     | Item to check (any type) |
| `input_list` | top      | `list`    | input     | List to check against    |
| `yes`        | right    | `boolean` | output    | True if item in list     |
| `no`         | right    | `boolean` | output    | True if item not in list |

**Move mapping:** `vector::contains(&tribes, &candidate_tribe)`
**Special:** Renders as 45° rotated diamond

### 3.6 Add to Queue (Action)

| Socket         | Position | Type       | Direction | Description              |
| -------------- | -------- | ---------- | --------- | ------------------------ |
| `priority_in`  | left     | `priority` | input     | Priority queue reference |
| `predicate`    | left     | `boolean`  | input     | Execution predicate      |
| `entity`       | left     | `any`      | input     | Entity to add (any type) |
| `priority_out` | right    | `priority` | output    | Modified priority queue  |

**Move mapping:** `vector::push_back(&mut return_list, turret::new_return_target_priority_list(item_id, weight))`

### 3.7 HP Ratio (Data Accessor)

| Socket     | Position | Type     | Direction | Description              |
| ---------- | -------- | -------- | --------- | ------------------------ |
| `target`   | left     | `target` | input     | Target entity to inspect |
| `hp_ratio` | right    | `number` | output    | HP ratio value (0-100)   |

**Move mapping:** `candidate.hp_ratio`

### 3.8 Shield Ratio (Data Accessor)

| Socket         | Position | Type     | Direction | Description                |
| -------------- | -------- | -------- | --------- | -------------------------- |
| `target`       | left     | `target` | input     | Target entity to inspect   |
| `shield_ratio` | right    | `number` | output    | Shield ratio value (0-100) |

**Move mapping:** `candidate.shield_ratio`

### 3.9 Armor Ratio (Data Accessor)

| Socket        | Position | Type     | Direction | Description               |
| ------------- | -------- | -------- | --------- | ------------------------- |
| `target`      | left     | `target` | input     | Target entity to inspect  |
| `armor_ratio` | right    | `number` | output    | Armor ratio value (0-100) |

**Move mapping:** `candidate.armor_ratio`

## 4. State Transitions

Nodes and edges are stateless in the data model sense — their state is managed by ReactFlow's `useNodesState` and `useEdgesState` hooks. The relevant state transitions are:

| Action           | Nodes State Change           | Edges State Change                  |
| ---------------- | ---------------------------- | ----------------------------------- |
| Drop node        | `concat(newNode)`            | None                                |
| Connect sockets  | None                         | `addEdge(connection)`               |
| Delete node      | `filter(n => n.id !== id)`   | `filter(e => !connected(e, id))`    |
| Delete edge      | None                         | `filter(e => e.id !== id)`          |
| Move node (drag) | `applyNodeChanges(changes)`  | None (edges follow handles)         |

## 5. Edge Data Shape

```typescript
interface FlowEdge {
  readonly id: string;
  readonly source: string;        // Source node ID
  readonly target: string;        // Target node ID
  readonly sourceHandle: string;  // Source socket ID
  readonly targetHandle: string;  // Target socket ID
  readonly animated: true;
  readonly style: {
    readonly stroke: string;      // CSS variable from source socket type
    readonly strokeWidth: number;  // 2 for most, 3 for Vector
  };
  readonly markerEnd: {
    readonly type: "arrowclosed";
    readonly color: string;       // Matches stroke colour
  };
}
```
