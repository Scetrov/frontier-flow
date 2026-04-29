# Feature Specification: Node Engine Refactor

**Feature Branch**: `[024-node-engine-refactor]`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "Refactor the visual node engine by combining Proximity and Aggression into Entered / Attacked, preserving deprecated node compatibility, updating Add to Queue ports, renaming Priority to Priority Queue, auto-wiring Add to Queue from Entered / Attacked, normalizing zero weights to 100, and updating automated tests."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Use the current trigger path (Priority: P1)

As a contract author, I want one current trigger node for encounter-driven behavior so I can start a flow without choosing between overlapping legacy options.

**Why this priority**: New authoring should guide users toward the supported trigger model and reduce confusion at the point where every new graph starts.

**Independent Test**: Can be fully tested by opening the toolbox in a fresh graph, adding the current trigger node, and confirming it exposes the downstream data needed for queueing and targeting.

**Acceptance Scenarios**:

1. **Given** a fresh graph, **When** the author opens the toolbox, **Then** they can select `Entered / Attacked` as the current encounter trigger.
2. **Given** a fresh graph, **When** the author reviews available encounter triggers, **Then** `Proximity` and `Aggression` are not offered as authoring choices.
3. **Given** an `Entered / Attacked` node on the canvas, **When** the author connects it to downstream queue or target handling, **Then** the needed outputs are available.

---

### User Story 2 - Reopen older graphs safely (Priority: P1)

As a returning user, I want older saved graphs that still contain legacy encounter triggers to load and render correctly so existing work remains usable.

**Why this priority**: Backward compatibility protects stored user work and avoids regressions for any graph created before the new trigger became the default.

**Independent Test**: Can be fully tested by loading saved graphs that contain `Proximity` and `Aggression` and confirming they render without manual data edits.

**Acceptance Scenarios**:

1. **Given** a saved graph that contains `Proximity`, **When** the graph is opened, **Then** the graph loads and the node renders.
2. **Given** a saved graph that contains `Aggression`, **When** the graph is opened, **Then** the graph loads and the node renders.
3. **Given** a graph containing legacy nodes, **When** it is reopened, **Then** the user can inspect and continue editing the graph without the restore process removing those nodes.

---

### User Story 3 - Build queue flows with fewer manual steps (Priority: P2)

As a contract author, I want queue-related nodes to use consistent naming and connect themselves in the common case so routine graph setup is faster and less error-prone.

**Why this priority**: Queue authoring is a frequent workflow, and reducing redundant labels, ports, and manual edge creation lowers friction without changing the underlying intent of the flow.

**Independent Test**: Can be fully tested by dropping `Add to Queue` into a graph that already contains `Entered / Attacked`, then confirming the expected queue-related connections appear automatically and the redundant output is no longer exposed.

**Acceptance Scenarios**:

1. **Given** a graph with one compatible `Entered / Attacked` node and no conflicting queue connections, **When** the author adds `Add to Queue`, **Then** the new node auto-connects to the compatible priority and target outputs.
2. **Given** an `Add to Queue` node, **When** the author reviews its available ports and labels, **Then** the redundant `Priority Out` port is absent and queue-related labels use `Priority Queue`.
3. **Given** an `Add to Queue` node whose relevant inputs are already connected, **When** another queue node is added, **Then** the system does not create duplicate or conflicting automatic connections.

---

### User Story 4 - Keep queue weights valid (Priority: P2)

As a contract author, I want zero-valued queue weights to normalize to the default high-priority value so invalid weight data never reaches saved output or execution paths.

**Why this priority**: Weight data directly affects queue behavior, and silently preserving zero would produce misleading or invalid results.

**Independent Test**: Can be fully tested by entering `0` as a queue weight, saving or compiling the graph, and verifying the resulting value is treated as `100` while non-zero values remain unchanged.

**Acceptance Scenarios**:

1. **Given** a queue weight input set to `0`, **When** the graph is saved, compiled, or otherwise prepared for execution, **Then** the stored or emitted value is `100`.
2. **Given** a queue weight input set to a non-zero value, **When** the graph is saved, compiled, or otherwise prepared for execution, **Then** that value remains unchanged.

### Edge Cases

- A saved graph may contain multiple legacy trigger nodes alongside the new `Entered / Attacked` node; loading must preserve all existing nodes without exposing deprecated ones in new authoring menus.
- A canvas may contain more than one compatible `Entered / Attacked` node when `Add to Queue` is added; automatic wiring must follow a deterministic rule and avoid creating ambiguous duplicate connections.
- A newly added `Add to Queue` node may already receive manual or imported connections during the same authoring flow; automatic wiring must not overwrite an existing valid connection.
- A queue weight of `0` may originate from direct input, imported graph data, or older saved content; normalization must prevent zero from reaching persisted or emitted output in all supported entry paths.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a new encounter trigger node labeled `Entered / Attacked` for new authoring flows.
- **FR-002**: The `Entered / Attacked` node MUST expose the data needed by existing downstream queueing and target-selection flows.
- **FR-003**: The system MUST continue to load and render saved graphs that contain the legacy `Proximity` node.
- **FR-004**: The system MUST continue to load and render saved graphs that contain the legacy `Aggression` node.
- **FR-005**: Node definitions MUST support a flag that hides deprecated nodes from the toolbox without removing them from graph restore behavior.
- **FR-006**: The toolbox MUST omit all nodes marked as deprecated or hidden from authoring.
- **FR-007**: The `Add to Queue` node MUST no longer expose a `Priority Out` port to authors.
- **FR-008**: Author-facing queue terminology that currently uses `Priority` to describe the queue concept MUST be renamed to `Priority Queue`.
- **FR-009**: When a user adds `Add to Queue` to a canvas that already contains a compatible `Entered / Attacked` node, the system MUST automatically create the expected queue-related connections.
- **FR-010**: Automatic queue wiring MUST avoid creating duplicate connections and MUST NOT replace an already connected compatible input.
- **FR-011**: Any queue weight value that evaluates to `0` MUST be normalized to `100` before it is saved, compiled, or otherwise emitted to the underlying engine.
- **FR-012**: Any non-zero queue weight MUST preserve its user-selected value through save and compilation workflows.
- **FR-013**: Existing authoring, restore, and execution flows unrelated to these queue and trigger changes MUST continue to behave as before.
- **FR-014**: Automated verification MUST cover the new trigger, deprecated toolbox filtering, queue port updates, automatic wiring behavior, and zero-weight normalization.

### Key Entities _(include if feature involves data)_

- **Node Definition**: The catalog entry that describes a node's author-facing name, compatibility status, and available inputs and outputs.
- **Graph Node Instance**: A placed node within a saved or in-progress graph, including both current and legacy trigger variants.
- **Graph Connection**: A directed link between compatible node outputs and inputs used to model queue and target flow.
- **Queue Weight**: The numeric value that determines queue ordering behavior and must never reach execution as zero.

### Assumptions

- Existing saved graphs that use `Proximity` or `Aggression` are still expected to remain editable after load.
- The common authoring case for `Add to Queue` is a canvas with one compatible encounter trigger already present.
- Queue-related label changes apply only where `Priority` refers to queue semantics, not to unrelated concepts that happen to share the word.

### Dependencies

- Saved graph fixtures or representative legacy graph samples must remain available to verify backward compatibility.
- Automated tests must be updated or extended to cover authoring, restore, and output-normalization behavior.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In a fresh authoring session, 100% of encounter-trigger choices presented in the toolbox use the current supported path, with legacy trigger nodes absent from the authoring menu.
- **SC-002**: 100% of representative saved graphs that contain `Proximity` or `Aggression` open and render without requiring manual graph-data edits.
- **SC-003**: In the standard case of a canvas with one compatible `Entered / Attacked` node and no conflicting connections, authors can add `Add to Queue` and reach a connected queue-ready state in a single drop action.
- **SC-004**: 100% of queue weights that would otherwise be emitted as `0` are normalized to `100` before save or execution output is produced.
- **SC-005**: The automated verification suite covering node catalog behavior, toolbox visibility, queue setup, and weight normalization passes with updated expectations.

## Technical Hints _(non-normative)_

- Primary registry files: `/home/scetrov/source/frontier-flow/src/data/node-definitions.ts` and `/home/scetrov/source/frontier-flow/src/types/nodes.ts`.
- Toolbox entry point: `/home/scetrov/source/frontier-flow/src/components/Sidebar.tsx`. Current drag payload uses `application/reactflow`, `application/label`, and `application/x-offset`.
- Canvas drop and auto-wiring entry point: `/home/scetrov/source/frontier-flow/src/components/CanvasWorkspace.tsx`, specifically the `useCanvasInteractions` drop flow.
- Existing trigger socket ids: `aggression` and `proximity` both expose `priority` and `target` outputs in `/home/scetrov/source/frontier-flow/src/data/node-definitions.ts`.
- Current `addToQueue` socket ids: inputs `priority_in`, `target`, `predicate`, `weight`; output `priority_out` in `/home/scetrov/source/frontier-flow/src/data/node-definitions.ts`.
- Existing field-normalization hook: `/home/scetrov/source/frontier-flow/src/data/nodeFieldCatalog.ts` via `normalizeNodeFields(...)`.
- Generator impact is currently split between `/home/scetrov/source/frontier-flow/src/compiler/generators/eventTriggers.ts` and `/home/scetrov/source/frontier-flow/src/compiler/generators/actions.ts`.
- High-value test files for this change: `/home/scetrov/source/frontier-flow/src/__tests__/nodeDefinitions.test.ts`, `/home/scetrov/source/frontier-flow/src/__tests__/Sidebar.test.tsx`, `/home/scetrov/source/frontier-flow/src/__tests__/canvasFlow.test.tsx`, and `/home/scetrov/source/frontier-flow/src/__tests__/socketTypes.test.ts`.
