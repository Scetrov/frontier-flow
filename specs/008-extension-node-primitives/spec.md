# Feature Specification: Extension Node Primitive Refactor

**Feature Branch**: `[008-extension-node-primitives]`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "Refactor extension nodes to remove non-functional config objects, replace awkward all-in-one logic with primitive boolean operations and clearer predicate nodes, add editable interfaces for array-based inputs, and pre-populate example contracts in the Load panel."

## Clarifications

### Session 2026-03-19

- Q: How should legacy saved graphs that reference removed config-based or composite nodes be handled? A: Automatically migrate them to primitive nodes when an exact mapping exists; otherwise load safely and show a remediation notice for the unsupported portion.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compose target logic from primitive nodes (Priority: P1)

A builder restructures target-selection logic using small, composable predicate and boolean nodes instead of relying on bundled exclusion nodes that hide multiple decisions inside a single node.

**Why this priority**: This is the core product change. If builders cannot recreate targeting rules through clear primitive nodes, the rest of the refactor does not deliver value.

**Independent Test**: Can be fully tested by creating a rule such as "exclude same tribe unless aggressor" using direct predicate nodes plus `NOT`, `AND`, `OR`, or `XOR`, and confirming the rule can be expressed without any hidden configuration object.

**Acceptance Scenarios**:

1. **Given** a builder is creating a turret targeting rule, **When** they select primitive predicate nodes and boolean operator nodes, **Then** they can express the intended logic without using any config-object field that is not actually applied at runtime.
2. **Given** a builder previously depended on a bundled node such as a same-tribe exclusion rule, **When** they rebuild that logic with primitive nodes, **Then** the resulting graph uses direct predicates such as "Is Same Tribe" plus boolean operators rather than opaque combined behavior.

---

### User Story 2 - Edit list-based node values directly (Priority: P2)

A builder edits list-based values, such as type identifiers or tribe lists, through a dedicated interface instead of relying on awkward raw-value entry or hard-coded defaults.

**Why this priority**: Primitive nodes become practical only if builders can configure list inputs cleanly. Without this, the refactor reduces convenience without restoring usability.

**Independent Test**: Can be fully tested by creating or opening a node that uses a list input, adding multiple entries, removing one, and correcting an invalid value, then confirming the final valid list remains available when reopening the node.

**Acceptance Scenarios**:

1. **Given** a node requires a list of tribes or type identifiers, **When** the builder edits that node, **Then** they are presented with a list-editing interface that supports adding, updating, and removing entries.
2. **Given** a builder enters an invalid or incomplete list value, **When** they attempt to keep that value, **Then** the interface clearly identifies the problem and prevents the invalid value from being treated as a valid saved list.

---

### User Story 3 - Start from pre-populated example contracts (Priority: P3)

A builder opens the Load panel and immediately sees the provided example contracts ready to load, so they can inspect proven patterns and start from a working baseline.

**Why this priority**: Pre-populated examples reduce the learning curve for the new primitive-node model and provide a stable reference for regression checking.

**Independent Test**: Can be fully tested by opening the Load panel in a clean workspace and verifying that the provided example contracts are already listed, named, and loadable without prior manual setup.

**Acceptance Scenarios**:

1. **Given** a builder opens the Load panel for the first time in a clean workspace, **When** the panel is displayed, **Then** the provided example contracts are already present and selectable.
2. **Given** a builder has unsaved work on the canvas, **When** they choose a pre-populated example contract to load, **Then** the application requires an explicit confirmation before replacing the current graph.

### Edge Cases

- What happens when an older saved graph references a removed config-object field or a removed composite node? The graph must still open without crashing, must automatically migrate each legacy element that has an exact primitive-node equivalent, and must surface a clear notice for each legacy element that cannot be converted safely.
- What happens when a list-based input contains duplicate, blank, or invalid entries? The editor must prevent invalid values from being accepted silently and must leave the user with a clear, recoverable correction path.
- What happens when the provided example contract set is empty or unavailable? The Load panel must remain usable, explain that no examples are currently available, and continue to show any user-created saved contracts.
- What happens when a builder combines boolean nodes into an incomplete expression? The graph must identify the incomplete rule clearly and must not present it as a ready-to-load valid contract.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST remove non-functional config-object inputs and fields from the extension-node authoring experience wherever those values cannot affect runtime behavior.
- **FR-002**: The system MUST represent target-selection logic through primitive predicate nodes and explicit boolean operator nodes instead of relying on all-in-one exclusion nodes for new or revised behavior.
- **FR-003**: The system MUST provide boolean operator nodes for `NOT`, `AND`, `OR`, and `XOR`.
- **FR-004**: The system MUST provide direct predicate nodes for conditions that builders need to combine explicitly, including a direct "Is Same Tribe" predicate rather than only exposing that concept inside a bundled exclusion node.
- **FR-005**: The system MUST retire or replace bundled nodes whose primary purpose can be expressed through the supported primitive predicate and boolean node set.
- **FR-006**: Users MUST be able to recreate the existing supported example targeting behaviors by combining the available primitive predicate nodes, value nodes, and boolean operators.
- **FR-007**: The system MUST provide a dedicated editing interface for list-based node values, including lists of tribe values and lists of type identifiers.
- **FR-008**: The list-editing interface MUST allow builders to add, modify, and remove individual entries before saving the node value.
- **FR-009**: The system MUST validate each list entry according to the expected value type and MUST prevent invalid entries from being accepted as valid saved values.
- **FR-010**: The system MUST preserve valid list-based values so they remain available when the builder revisits the node later.
- **FR-011**: The Load panel MUST be pre-populated with the provided example contracts without requiring the user to create them manually.
- **FR-012**: Each pre-populated example contract MUST display a stable, human-readable name so builders can distinguish and select the correct example.
- **FR-013**: Loading a pre-populated example contract MUST require explicit user confirmation before replacing unsaved work already present on the canvas.
- **FR-014**: The system MUST automatically migrate previously saved graphs that reference removed config-object inputs or retired composite nodes whenever an exact primitive-node equivalent exists.
- **FR-015**: The system MUST load previously saved graphs that contain non-convertible legacy content without crashing and MUST present a clear, actionable notice describing which node or value needs manual correction.

### Key Entities *(include if feature involves data)*

- **Primitive Predicate Node**: A single-purpose condition node that evaluates one target attribute or relationship, such as whether a target is from the same tribe.
- **Boolean Operator Node**: A logic-composition node that combines one or more boolean results into a new boolean result using `NOT`, `AND`, `OR`, or `XOR`.
- **List-Based Value Set**: A user-editable collection of values, such as tribe identifiers or type identifiers, attached to a node input.
- **Example Contract Entry**: A provided contract template shown in the Load panel with a stable name and loadable graph content.
- **Legacy Graph Reference**: Saved graph content that still points to a removed config-object input or retired composite node and therefore requires exact auto-migration or user-visible remediation.

## Assumptions

- The provided example contracts are the curated examples already intended to ship with the product, not a new workflow for authoring additional seeded examples.
- The Load panel already exists and remains the entry point for selecting saved or seeded contracts.
- Primitive-node refactoring applies to the extension-node set involved in turret targeting logic and does not require unrelated canvas behaviors to change.
- Existing user-created saved contracts remain in scope for safe loading, with exact legacy-to-primitive mappings migrated automatically and only non-convertible elements left for manual follow-up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Builders can recreate each provided example contract's targeting logic using the supported primitive predicate and boolean node set without relying on hidden or non-functional config-object values.
- **SC-002**: In a clean workspace, 100% of the provided example contracts appear in the Load panel the first time the panel is opened.
- **SC-003**: A builder can express a rule equivalent to "exclude same tribe unless aggressor" in 3 minutes or less using the available primitive nodes and boolean operators.
- **SC-004**: 100% of list-based node inputs used by the supported example contracts can be created, edited, reopened, and corrected through the dedicated list-editing interface.
- **SC-005**: 100% of legacy saved graphs containing removed config-object inputs or retired composite nodes either auto-migrate successfully when an exact mapping exists or load with a clear remediation notice instead of failing silently or crashing.
