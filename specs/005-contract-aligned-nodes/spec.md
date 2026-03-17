# Feature Specification: Contract-Aligned Nodes

**Feature Branch**: `005-contract-aligned-nodes`  
**Created**: 2026-03-17  
**Status**: Draft  
**Input**: User description: "Extract contract-derived nodes from CONTRACTS.md and implement accurate sidebar node definitions with correct typed inputs and outputs matching deployable EVE Frontier turret strategies"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Contract-accurate node palette in sidebar (Priority: P1)

A user opens Frontier Flow and sees the sidebar toolbox populated with nodes that directly correspond to the scoring concepts found in the eight exemplar turret strategy contracts documented in `docs/CONTRACTS.md`. Each node has typed input and output sockets that faithfully represent the data the contract logic consumes and produces. The user can immediately tell what data a node needs, what it emits, and how it fits into a turret targeting graph — without reading raw Move code.

**Why this priority**: This is the foundational deliverable. Without accurate, contract-derived node definitions the entire visual programming model is disconnected from deployable reality. Every subsequent story depends on these definitions existing.

**Independent Test**: Can be fully tested by opening the sidebar, verifying every listed node matches a concept from the contracts, and confirming each socket's type, direction, and label are correct. Delivers value by providing users a trustworthy mapping between visual nodes and on-chain logic.

**Acceptance Scenarios**:

1. **Given** the application loads, **When** the user views the sidebar, **Then** the sidebar contains exactly the node set defined in the "Node Catalogue" section below, grouped by category.
2. **Given** a node definition exists, **When** the user inspects its sockets, **Then** every socket's id, type, direction, position, and label match the specification in this document.
3. **Given** the node definitions are loaded, **When** the user drags any node onto the canvas, **Then** the node renders with the correct socket handles at the positions specified.

---

### User Story 2 — Drag-and-drop contract nodes onto the canvas (Priority: P1)

A user drags a contract-derived node (e.g., "Score Candidate", "Count Aggressors") from the sidebar onto the canvas. The node appears with its full set of typed sockets. The user can then connect sockets between nodes, and only type-compatible connections are allowed per the existing socket compatibility matrix.

**Why this priority**: Drag-and-drop is the core interaction model. If nodes exist in the sidebar but cannot be placed and connected, the tool provides no interactive value.

**Independent Test**: Can be fully tested by dragging each new node type onto the canvas and attempting both valid and invalid connections. Delivers value by letting users compose turret strategy graphs visually.

**Acceptance Scenarios**:

1. **Given** the user drags a "Score Candidate" node from the sidebar, **When** they drop it on the canvas, **Then** a node with the correct label, colour, category, and sockets appears.
2. **Given** two nodes are on the canvas, **When** the user connects a `target` output to a `target` input, **Then** the connection is accepted.
3. **Given** two nodes are on the canvas, **When** the user attempts to connect a `number` output to a `tribe` input, **Then** the connection is rejected per the compatibility matrix.

---

### User Story 3 — Remove obsolete placeholder nodes (Priority: P2)

The existing node definitions include nodes that were created as early placeholders and do not map to any real contract concept (or map inaccurately). These are replaced by the new contract-aligned definitions, ensuring the sidebar only contains nodes that can produce deployable code.

**Why this priority**: Keeping inaccurate placeholder nodes alongside contract-accurate nodes would confuse users and undermine trust. However, this cleanup is secondary to getting the correct nodes in place.

**Independent Test**: Can be fully tested by confirming that each node in the sidebar corresponds to a documented contract concept and that no orphaned or inaccurate nodes remain.

**Acceptance Scenarios**:

1. **Given** the updated node definitions are deployed, **When** the user views the sidebar, **Then** only nodes listed in the "Node Catalogue" below appear.
2. **Given** old placeholder node types no longer exist, **When** any saved graph references a removed node type, **Then** the application handles the unknown type gracefully (no crash; the node is omitted or flagged).

---

### User Story 4 — Node definitions are unit-tested for accuracy (Priority: P2)

Every node definition is covered by unit tests that validate its type, label, category, colour, and socket configuration. Tests also verify that the full set of expected node types is present and that no unexpected types exist.

**Why this priority**: Test coverage ensures that future changes don't silently break the contract-to-node mapping. This is the safety net for the P1 stories.

**Independent Test**: Can be fully tested by running the unit test suite. Delivers value by protecting the contract-aligned mapping against regressions.

**Acceptance Scenarios**:

1. **Given** the test suite runs, **When** all node definition tests execute, **Then** every node's socket count, types, directions, and labels match this specification.
2. **Given** a developer adds or removes a node definition, **When** they run the tests, **Then** the "expected node types" snapshot test fails until the canonical list is updated.

---

### Edge Cases

- What happens when a node type referenced in a saved graph no longer exists in the definitions? The application must not crash; the node should be omitted from the canvas with a console warning.
- What happens when two nodes with `any`-typed sockets are connected? The connection must be accepted per the existing compatibility matrix (`any` connects to all types).
- What happens if the sidebar is rendered with zero definitions? The existing empty-state message ("No node definitions available.") must still display.

## Requirements *(mandatory)*

### Functional Requirements

#### Node Catalogue — derived from `docs/CONTRACTS.md`

The analysis of the eight turret strategy contracts reveals the following reusable scoring and data-access concepts. Each concept becomes a node with precisely defined sockets. Socket types follow the existing `SocketType` union: `rider`, `tribe`, `standing`, `wallet`, `priority`, `target`, `boolean`, `list`, `number`, `string`, `any`.

**Assumptions**: (1) The `TargetCandidateArg` struct fields map to data-accessor output sockets. (2) "Scoring modifier" nodes each accept a `target` and a `number` (base weight) input and emit a modified `number` weight output. (3) Filtering/exclusion logic maps to logic-gate nodes that emit boolean include/exclude signals. (4) Strategy-level configuration (e.g., GroupSpecialistConfig, RoundRobinConfig, ThreatLedgerConfig, TypeBlocklistConfig) is represented as dedicated configuration-source nodes. (5) Node colours follow the design system: event-triggers use `var(--brand-orange)`, data-accessors use `var(--socket-entity)`, data-sources use `var(--socket-vector)`, logic-gates use `var(--socket-signal)`, actions use `var(--socket-vector)`, scoring nodes (a new sub-type of data-accessor) use `var(--socket-value)`.

---

##### Event Trigger Nodes (category: `event-trigger`)

- **FR-001**: System MUST provide an **Aggression** event trigger node.
  - Outputs: `priority` (priority), `target` (target)
  - Colour: `var(--brand-orange)`
  - Rationale: Every contract begins with receiving a candidate list triggered by aggression or proximity events. This node represents the entry point where the turret detects a hostile action (BEHAVIOUR_STARTED_ATTACK or is_aggressor).

- **FR-002**: System MUST provide a **Proximity** event trigger node.
  - Outputs: `priority` (priority), `target` (target)
  - Colour: `var(--brand-orange)`
  - Rationale: Represents the BEHAVIOUR_ENTERED event — a candidate entering the turret's envelope.

---

##### Data Accessor Nodes (category: `data-accessor`)

- **FR-003**: System MUST provide a **Get Tribe** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `tribe` (tribe), `owner_tribe` (tribe)
  - Colour: `var(--socket-entity)`
  - Rationale: Extracts `character_tribe` and the owner's tribe from the candidate data. Used by every contract for tribe-based exclusion.

- **FR-004**: System MUST provide an **HP Ratio** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `hp_ratio` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Reads `hp_ratio` from the candidate. Used by `aggressor_first`, `low_hp_finisher`, and `last_stand` for damage-based scoring.

- **FR-005**: System MUST provide a **Shield Ratio** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `shield_ratio` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Reads `shield_ratio` from the candidate. Used by `aggressor_first` for shield-break bonus and `last_stand` raid mode.

- **FR-006**: System MUST provide an **Armor Ratio** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `armor_ratio` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Reads `armor_ratio` from the candidate. Used by `aggressor_first` for armor-break bonus and `last_stand` raid mode.

- **FR-007**: System MUST provide a **Get Group ID** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `group_id` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Extracts the `group_id` field from a candidate, used by `group_specialist` and `size_priority` to apply class-based bonuses.

- **FR-008**: System MUST provide a **Get Behaviour** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `behaviour` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Extracts the `behaviour_change` field (ENTERED=1, STARTED_ATTACK=2, STOPPED_ATTACK=3). Used by every contract to determine behaviour-based bonuses and exclusions.

- **FR-009**: System MUST provide an **Is Aggressor** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `is_aggressor` (boolean)
  - Colour: `var(--socket-signal)`
  - Rationale: Reads the `is_aggressor` boolean from the candidate struct. Core to every contract's exclusion and bonus logic.

- **FR-010**: System MUST provide a **Get Priority Weight** data accessor node.
  - Inputs: `target` (target)
  - Outputs: `weight` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Reads the `priority_weight` base value from the candidate. Every scoring function starts accumulation from this value.

---

##### Scoring Modifier Nodes (category: `data-accessor`)

- **FR-011**: System MUST provide a **Behaviour Bonus** scoring modifier node.
  - Inputs: `behaviour` (number), `weight_in` (number)
  - Outputs: `weight_out` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Applies the behaviour-specific bonus (STARTED_ATTACK_BONUS, ENTERED_BONUS, or zero) to the running weight. Present in all eight contracts.

- **FR-012**: System MUST provide an **Aggressor Bonus** scoring modifier node.
  - Inputs: `is_aggressor` (boolean), `weight_in` (number)
  - Outputs: `weight_out` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Adds the AGGRESSOR_BONUS when the candidate is an aggressor. Present in all eight contracts.

- **FR-013**: System MUST provide a **Damage Bonus** scoring modifier node.
  - Inputs: `hp_ratio` (number), `shield_ratio` (number), `armor_ratio` (number), `weight_in` (number)
  - Outputs: `weight_out` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Computes damage-based weight bonuses. Used by `aggressor_first` (per-layer multipliers), `low_hp_finisher` (EHP total), and `last_stand` raid mode (combined damage).

- **FR-014**: System MUST provide a **Size Tier Bonus** scoring modifier node.
  - Inputs: `group_id` (number), `weight_in` (number)
  - Outputs: `weight_out` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Maps group_id to a hull-size tier (1–6) and adds `tier × TIER_WEIGHT`. From `size_priority` contract.

- **FR-015**: System MUST provide a **Group Bonus Lookup** scoring modifier node.
  - Inputs: `group_id` (number), `config` (list), `weight_in` (number)
  - Outputs: `weight_out` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Looks up the candidate's group_id in a GroupSpecialistConfig bonus table and adds the matching weight. From `group_specialist` contract.

- **FR-016**: System MUST provide a **Threat Bonus** scoring modifier node.
  - Inputs: `tribe` (tribe), `config` (list), `weight_in` (number)
  - Outputs: `weight_out` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Reads a tribe's accumulated threat score from the threat ledger and adds `threat / THREAT_WEIGHT_DIVISOR`. From `threat_ledger` contract.

- **FR-017**: System MUST provide a **History Penalty** scoring modifier node.
  - Inputs: `target` (target), `config` (list), `weight_in` (number)
  - Outputs: `weight_out` (number)
  - Colour: `var(--socket-value)`
  - Rationale: Subtracts HISTORY_PENALTY from recently-targeted candidates (floor at 1). From `round_robin` contract.

---

##### Logic Gate Nodes (category: `logic-gate`)

- **FR-018**: System MUST provide an **Exclude Owner** logic gate node.
  - Inputs: `target` (target)
  - Outputs: `include` (boolean)
  - Colour: `var(--socket-signal)`
  - Rationale: Returns false when the candidate is the turret owner (`character_id == owner_character_id`). Present in all eight contracts.

- **FR-019**: System MUST provide an **Exclude Same Tribe** logic gate node.
  - Inputs: `tribe` (tribe), `owner_tribe` (tribe), `is_aggressor` (boolean)
  - Outputs: `include` (boolean)
  - Colour: `var(--socket-signal)`
  - Rationale: Returns false when the candidate shares the owner's tribe and is not an aggressor. Present in seven of eight contracts (excluded in `last_stand` raid mode).

- **FR-020**: System MUST provide an **Exclude Stopped Attack** logic gate node.
  - Inputs: `behaviour` (number)
  - Outputs: `include` (boolean)
  - Colour: `var(--socket-signal)`
  - Rationale: Returns false when `behaviour_change == BEHAVIOUR_STOPPED_ATTACK (3)`. Present in all eight contracts.

- **FR-021**: System MUST provide an **Exclude NPC** logic gate node.
  - Inputs: `target` (target)
  - Outputs: `include` (boolean)
  - Colour: `var(--socket-signal)`
  - Rationale: Returns false when `character_id == 0` (NPC). From `player_screen` contract.

- **FR-022**: System MUST provide an **Is In List** logic gate node.
  - Inputs: `input_item` (any), `input_list` (list)
  - Outputs: `yes` (boolean), `no` (boolean)
  - Colour: `var(--socket-signal)`
  - Rationale: Generic list-membership check. Used by `type_blocklist` (check blocked_type_ids) and `round_robin` (check history). Retained from the existing node set.

- **FR-023**: System MUST provide a **Count Aggressors** logic gate node.
  - Inputs: `candidates` (list)
  - Outputs: `count` (number), `is_raid` (boolean)
  - Colour: `var(--socket-signal)`
  - Rationale: Counts the number of aggressors in the candidate list and outputs whether the count meets the raid threshold. From `last_stand` contract.

---

##### Data Source Nodes (category: `data-source`)

- **FR-024**: System MUST provide a **Group Bonus Config** data source node.
  - Outputs: `config` (list)
  - Colour: `var(--socket-vector)`
  - Rationale: Represents the `GroupSpecialistConfig` shared object containing `group_id → weight_bonus` mappings.

- **FR-025**: System MUST provide a **Round Robin Config** data source node.
  - Outputs: `config` (list)
  - Colour: `var(--socket-vector)`
  - Rationale: Represents the `RoundRobinConfig` shared object containing the targeting history ring buffer.

- **FR-026**: System MUST provide a **Threat Ledger Config** data source node.
  - Outputs: `config` (list)
  - Colour: `var(--socket-vector)`
  - Rationale: Represents the `ThreatLedgerConfig` shared object containing per-tribe threat scores.

- **FR-027**: System MUST provide a **Type Blocklist Config** data source node.
  - Outputs: `blocked_types` (list)
  - Colour: `var(--socket-vector)`
  - Rationale: Represents the `TypeBlocklistConfig` shared object containing blocked type_ids.

- **FR-028**: System MUST provide a **List of Tribe** data source node.
  - Outputs: `items` (list)
  - Colour: `var(--socket-vector)`
  - Rationale: Provides a static tribe list used for the canonical targeting flow. Retained from the existing node set.

---

##### Action Nodes (category: `action`)

- **FR-029**: System MUST provide an **Add to Queue** action node.
  - Inputs: `priority_in` (priority), `predicate` (boolean), `target` (target), `weight` (number)
  - Outputs: `priority_out` (priority)
  - Colour: `var(--socket-vector)`
  - Rationale: Appends a scored, included candidate to the return priority list. This is the terminal action node in every targeting flow. Updated from the existing definition to accept the computed weight.

---

#### General Requirements

- **FR-030**: System MUST remove all node definitions that do not correspond to a contract concept listed above. The existing node set will be replaced entirely by the definitions in this specification.
- **FR-031**: System MUST assign each node definition a unique `type` string identifier that is stable across versions (used as the ReactFlow node type key and for graph serialization).
- **FR-032**: All socket types used in node definitions MUST be members of the existing `SocketType` union. If any new socket type is needed, the union and compatibility matrix MUST be updated first.
- **FR-033**: Each node MUST render using the existing `BaseNode` component, receiving its definition via the standard `FlowNodeData` interface.
- **FR-034**: The sidebar MUST display all node definitions grouped by category, in the order: event-trigger, data-accessor, logic-gate, data-source, action.
- **FR-035**: Unit tests MUST verify every node definition's type, label, description, colour, category, and full socket list. A snapshot test MUST assert the complete list of expected node types.
- **FR-036**: Existing unit tests and E2E tests that reference removed node types MUST be updated to use the new node types.

### Key Entities

- **NodeDefinition**: A static descriptor for a draggable node type. Key attributes: type (unique string), label (display name), description (tooltip text), colour (CSS variable), category (one of five), sockets (ordered list of SocketDefinition).
- **SocketDefinition**: Declares a typed handle on a node. Key attributes: id (unique within node), type (SocketType), position (left/right/top/bottom), direction (input/output), label (display text).
- **TargetCandidateArg**: The on-chain struct shared by all turret contracts. Fields: item_id, type_id, group_id, character_id, character_tribe, hp_ratio, shield_ratio, armor_ratio, is_aggressor, priority_weight, behaviour_change. Each field maps to a data-accessor node output.
- **Strategy Config Objects**: GroupSpecialistConfig, RoundRobinConfig, ThreatLedgerConfig, TypeBlocklistConfig — on-chain configuration objects that map to data-source nodes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of nodes in the sidebar map to a documented contract concept from `docs/CONTRACTS.md`.
- **SC-002**: Users can compose a complete targeting graph for any of the eight exemplar strategies using only the provided nodes.
- **SC-003**: Every node definition has ≥1 unit test validating its socket configuration, achieving ≥90% coverage on node definition files.
- **SC-004**: Zero type-mismatch connections are possible between incompatible sockets, verified by the existing socket compatibility matrix tests.
- **SC-005**: All existing E2E tests pass after the node definition migration, with updated selectors where needed.
