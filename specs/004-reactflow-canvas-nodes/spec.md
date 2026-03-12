# Feature Specification: ReactFlow Canvas Node Components

**Feature Branch**: `004-reactflow-canvas-nodes`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "Implement ReactFlow canvas node components extracted from reference code with SUI Move compilation compatibility"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Drag and Drop Verified Nodes onto the Canvas (Priority: P1)

A builder opens Frontier Flow and sees a sidebar listing all available node types. Each node in the toolbox corresponds to a verified operation in the EVE Frontier turret contract (e.g., Proximity trigger, Get Tribe accessor, Is Aggressor check). The builder drags a node from the sidebar and drops it onto the canvas. A fully styled, interactive ReactFlow node appears at the drop position with correctly typed input and output sockets (handles).

**Why this priority**: Without renderable nodes on the canvas, no other feature (connections, code generation, deployment) can function. This is the foundational interactive layer.

**Independent Test**: Can be fully tested by dragging each of the 9 verified node types from the sidebar onto an empty canvas and confirming each renders with the correct header, icon, sockets, and styling.

**Acceptance Scenarios**:

1. **Given** the application is loaded with an empty canvas, **When** the builder drags a "Proximity" node from the sidebar and drops it on the canvas, **Then** a Proximity node appears at the drop position with output sockets for "priority" (vector type) and "target" (entity type).
2. **Given** a node type exists in the sidebar, **When** it is dragged and dropped onto the canvas, **Then** the node renders with the correct header colour, icon, socket labels, socket positions, and socket colours matching the design system.
3. **Given** any verified node type, **When** it is placed on the canvas, **Then** its declared input and output sockets correspond exactly to fields or operations available in the `turret.move` reference contract.

---

### User Story 2 — Connect Nodes with Type-Safe Edges (Priority: P2)

A builder connects the output socket of one node to the input socket of another by clicking and dragging an edge. The system only allows connections between type-compatible sockets (e.g., an entity output can connect to an entity input, but not to a vector input). Valid connection targets visually highlight during the drag. Invalid targets appear dimmed.

**Why this priority**: Typed connections are the mechanism that ensures the visual graph can translate to valid Move code. Without connection validation, builders could construct graphs that produce invalid contracts.

**Independent Test**: Can be tested by attempting to connect each output socket type to each input socket type across all 9 node types, verifying that only compatible pairs succeed.

**Acceptance Scenarios**:

1. **Given** a Proximity node and a Get Tribe node on the canvas, **When** the builder drags from the Proximity "target" output (entity type) to the Get Tribe "rider" input (entity type), **Then** an animated edge is created with entity-coloured styling.
2. **Given** a Proximity node and an Is In List node on the canvas, **When** the builder attempts to drag from the Proximity "priority" output (vector type) to the Is In List "input_item" input (any type), **Then** the connection is accepted because "any" type inputs accept all types.
3. **Given** a Get Tribe node and an Add to Queue node, **When** the builder drags from the Get Tribe "tribe" output (entity type) to the Add to Queue "priority_in" input (vector type), **Then** the connection is rejected because entity and vector types are incompatible.

---

### User Story 3 — Build a Complete Turret Targeting Flow (Priority: P3)

A builder constructs a complete friend-or-foe targeting automation by placing and connecting nodes in this order: Proximity (trigger) → Get Tribe (lookup) → List of Tribe (static data) → Is In List (decision) → Add to Queue (action). This represents the canonical workflow from the reference contract and produces a complete graph that is structurally ready for code generation.

**Why this priority**: Validating that the full canonical workflow can be assembled end-to-end proves the node set is sufficient for the primary use case and that all inter-node connections operate correctly as a system.

**Independent Test**: Can be tested by placing 5 nodes and creating 6 edges matching the reference flow, then verifying all connections are accepted and the resulting graph has no orphaned sockets on the critical path.

**Acceptance Scenarios**:

1. **Given** an empty canvas, **When** the builder places Proximity, Get Tribe, List of Tribe, Is In List, and Add to Queue nodes and connects them following the reference flow, **Then** all connections are accepted and the graph forms a valid directed acyclic graph.
2. **Given** the complete friend-or-foe flow is assembled, **When** the builder adds HP Ratio, Shield Ratio, or Armor Ratio accessor nodes connected from the Proximity target output, **Then** all accessor nodes render with the correct input (target/entity) and output (number/value) sockets and integrate correctly into the flow.

---

### User Story 4 — Delete Nodes and Edges (Priority: P4)

A builder can remove any node or edge from the canvas. Deleting a node also removes all edges connected to it. The builder can select a node and press Delete/Backspace, or click a delete button on the node header.

**Why this priority**: Editing capability is essential for iterating on graph designs, but the core value (placing and connecting nodes) comes first.

**Independent Test**: Can be tested by placing a node, connecting it, then deleting it and verifying the node and all connected edges are removed from the canvas state.

**Acceptance Scenarios**:

1. **Given** a node with two connected edges on the canvas, **When** the builder selects the node and presses Delete, **Then** the node and both connected edges are removed from the canvas.
2. **Given** two connected nodes, **When** the builder clicks on the edge between them and presses Delete, **Then** only the edge is removed; both nodes remain.

---

### Edge Cases

- What happens when a builder drops a node outside the visible canvas viewport? The node should be placed at the nearest valid position within the flow coordinate system.
- What happens when a builder attempts to connect two output sockets together? The connection should be rejected.
- What happens when a builder connects two nodes and then disconnects one side? The dangling edge should be removed automatically.
- What happens when a builder rapidly drags multiple nodes? Each node should receive a unique ID and render independently without overlapping state.
- What happens when a builder connects the same source socket to multiple target sockets? This should be allowed as data can fan out (one output feeding multiple inputs).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render 9 verified node types as interactive ReactFlow custom node components: Proximity, Aggression, Get Tribe, List of Tribe, Is In List, Add to Queue, HP Ratio, Shield Ratio, and Armor Ratio.
- **FR-002**: Each node MUST declare typed input and output sockets (handles) that correspond to operations or data fields available in the `world::turret` reference contract.
- **FR-003**: System MUST enforce type-safe connections between sockets using a compatibility matrix based on Move core types (Signal, Entity, Value, Vector, Any).
- **FR-004**: System MUST visually differentiate socket types using the established colour system: entity (blue), value (green), vector (purple), signal (cream), any (grey).
- **FR-005**: System MUST support drag-and-drop placement of nodes from the sidebar onto the ReactFlow canvas.
- **FR-006**: System MUST assign unique identifiers to each node instance placed on the canvas.
- **FR-007**: System MUST render animated, colour-coded edges between connected nodes, with edge colour determined by the source socket type.
- **FR-008**: System MUST support deletion of individual nodes and edges from the canvas.
- **FR-009**: Deleting a node MUST also remove all edges connected to that node.
- **FR-010**: Each node MUST display a header with the node type name, a category-appropriate icon, and a distinguishing header colour.
- **FR-011**: The Is In List node MUST visually render as a diamond (45° rotated square) to indicate its role as a logic gate / decision node.
- **FR-012**: System MUST reject connections from output-to-output or input-to-input socket pairs.
- **FR-013**: System MUST allow one output socket to connect to multiple input sockets (fan-out).
- **FR-014**: System MUST prevent connections that would create a cycle in the execution graph.

### Verified Node-to-Contract Mapping

Each node type below has been verified against the canonical `turret.move` reference contract. Only nodes with a direct mapping to existing Move functions, struct fields, or patterns are included.

| Node Type    | Category         | Move Mapping                                                                                            | Verified Accessor / Pattern                                         |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Proximity    | Event Trigger    | `get_target_priority_list(turret, owner_character, target_candidate_list, receipt)` entry point          | Function signature in `world::turret` and `extension_examples::turret` |
| Aggression   | Event Trigger    | `BehaviourChangeReason::STARTED_ATTACK` / `STOPPED_ATTACK` + `turret::is_aggressor(&candidate)`        | `is_aggressor` public view fn + `BehaviourChangeReason` enum        |
| Get Tribe    | Data Accessor    | `turret::character_tribe(&candidate)` + `character::tribe(owner_character)`                             | `character_tribe` public view fn                                    |
| List of Tribe| Data Source      | `let tribes: vector<u32> = vector[...]` — static vector literal                                        | Native Move vector literal syntax                                   |
| Is In List   | Logic Gate       | `vector::contains(&tribes, &candidate_tribe)` or equality comparison                                   | `std::vector::contains` stdlib function                             |
| Add to Queue | Action           | `vector::push_back(&mut return_list, turret::new_return_target_priority_list(item_id, weight))`         | `new_return_target_priority_list` public constructor fn              |
| HP Ratio     | Data Accessor    | `candidate.hp_ratio` — reads hp_ratio (u64, 0-100) from TargetCandidate                                | Public struct field on `TargetCandidate`                            |
| Shield Ratio | Data Accessor    | `candidate.shield_ratio` — reads shield_ratio (u64, 0-100) from TargetCandidate                        | Public struct field on `TargetCandidate`                            |
| Armor Ratio  | Data Accessor    | `candidate.armor_ratio` — reads armor_ratio (u64, 0-100) from TargetCandidate                          | Public struct field on `TargetCandidate`                            |

### Nodes Intentionally Excluded

The following node concepts were considered but excluded because they lack a verifiable Move mapping in the current `turret.move` reference contract:

- **Gate nodes** (Can Jump, etc.) — The reference code only covers turret assemblies. Gate assembly contracts are not available for verification.
- **Standing lookup** — While `character_tribe` is accessible, there is no public accessor for a standalone "standing" value in the reference contract.
- **Wallet lookup** — No wallet-related accessor exists in the turret reference contract.
- **Custom script / expression nodes** — Arbitrary user code injection would bypass the safety guarantees of the visual node system and violate input sanitisation rules.

### Key Entities

- **Node Instance**: A placed node on the canvas with a unique ID, type, position, label, and socket definitions. Represents a single operation in the turret targeting logic.
- **Socket (Handle)**: A typed connection point on a node. Has an ID, a Move core type (Signal, Entity, Value, Vector, Any), a direction (input/output), a position, and a label.
- **Edge (Connection)**: A directed link between an output socket on one node and an input socket on another. Carries colour and animation based on the source socket type.
- **Node Type Registry**: The mapping from node type strings to their React components, defining which custom node components ReactFlow should render.

## Assumptions

- The `turret.move` reference contract at the canonical GitHub link is the authoritative source for which operations are valid. Nodes are constrained to what this contract exposes.
- In Sui Move 2024 edition, `public struct` fields (including `hp_ratio`, `shield_ratio`, `armor_ratio` on `TargetCandidate`) are accessible via dot notation from extension modules, even when no explicit accessor function is provided.
- The sidebar component already exists and renders draggable node definitions. This feature extends it with the actual ReactFlow custom node components that render on the canvas.
- The existing `NodeDefinition` type and `nodeDefinitions` array will be updated to match the verified 9-node set.
- Edge styling (colour, animation, stroke width) follows the conventions established in the design system and solution design documentation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 9 verified node types render correctly on the canvas when dragged from the sidebar, with 100% of declared sockets visible and correctly positioned.
- **SC-002**: 100% of type-incompatible socket connections are rejected by the connection validation logic.
- **SC-003**: The canonical friend-or-foe targeting flow (Proximity → Get Tribe → List of Tribe → Is In List → Add to Queue) can be fully assembled on the canvas with all 6 reference edges connecting successfully.
- **SC-004**: Every node's socket definitions map 1:1 to a verified operation, struct field, or function in the `turret.move` reference contract — zero speculative nodes.
- **SC-005**: Users can place, connect, and delete nodes to build a complete targeting automation graph in under 5 minutes on first use.
