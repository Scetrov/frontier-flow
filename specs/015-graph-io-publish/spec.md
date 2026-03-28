# 1. Feature Specification: Graph Import, Export, and Publish

**Feature Branch**: `015-graph-io-publish`  
**Created**: 2026-03-28  
**Status**: Draft  
**Input**: User description: "I would like to implement a comprehensive import/export/publish mechansim for graphs (nodes + edges).

1. import allows importing from a YAML file, or from Mysten's Walrus,
2. export allows exporting to a YAML file.
3. publich allows publishing to Mysten's Walrus service.

This should be integrated into a clean UI under Save/Save Copy/Delete."

## 1.1. User Scenarios & Testing *(mandatory)*

### 1.1.1. User Story 1 - Move Graphs In and Out of Frontier Flow (Priority: P1)

A user working on a graph can export the active graph to a YAML file, share or archive it outside the browser, and later import that YAML file back into Frontier Flow without rebuilding the graph by hand.

**Why this priority**: Portable file-based import and export is the foundation for backup, sharing, and migration. It delivers immediate value even before remote publishing exists.

**Independent Test**: A user exports an existing graph to YAML, clears or switches the current graph, imports the YAML file, and sees the graph restored with the expected contract name, nodes, edges, and layout.

**Acceptance Scenarios**:

1. **Given** a user has an active saved contract, **When** they choose Export and confirm the download, **Then** the system generates a YAML file containing the graph data needed to restore that contract later.
2. **Given** a user selects a valid exported YAML file, **When** they import it, **Then** the system validates the file and adds the imported graph to the saved contract library without silently overwriting another contract.
3. **Given** a user imports a YAML file whose graph name already exists locally, **When** the import completes, **Then** the system preserves both graphs by creating a distinct saved contract entry.

---

### 1.1.2. User Story 2 - Publish Graphs to Walrus and Reopen Them Later (Priority: P1)

A user can publish the active graph to Mysten Walrus, receive a reusable Walrus reference, and later import a graph from Walrus using that reference so the graph can be restored on another device or shared with collaborators.

**Why this priority**: Remote publish and retrieval turns graph persistence into a shareable workflow rather than a single-device backup feature.

**Independent Test**: A user publishes a graph to Walrus, receives a reference, enters that reference into the import flow, and restores the published graph into the saved contract library.

**Acceptance Scenarios**:

1. **Given** a user has an active saved contract and the app is ready to access Walrus, **When** they choose Publish, **Then** the graph is uploaded successfully and the user receives a Walrus reference they can copy and reuse.
2. **Given** a user provides a valid Walrus reference, **When** they import from Walrus, **Then** the system loads the published graph, validates it, and saves it as a contract entry in the local library.
3. **Given** the Walrus object cannot be found or accessed, **When** the user attempts import, **Then** the system explains the failure without altering the current active graph.

---

### 1.1.3. User Story 3 - Use Transfer Actions From the Existing Save Controls (Priority: P2)

A user managing saved contracts can discover import, export, and publish actions in the same drawer area that already contains Save, Save Copy, and Delete, so graph transfer actions feel like part of one coherent workflow instead of separate tooling.

**Why this priority**: The feature needs to be discoverable where users already manage graph persistence. A fragmented UI would reduce adoption and create duplicate concepts.

**Independent Test**: A user opens the saved contract drawer, finds Save, Save Copy, Delete, Import, Export, and Publish in one coherent control group, and can complete each transfer action without leaving the graph workspace.

**Acceptance Scenarios**:

1. **Given** a user opens the saved contract controls, **When** the drawer is visible, **Then** import, export, and publish actions are presented alongside the existing save actions in a clean, keyboard-accessible layout.
2. **Given** an action requires additional input such as selecting a file or entering a Walrus reference, **When** the user starts that action, **Then** the system presents the required prompts inline or in a focused dialog without obscuring the purpose of the task.
3. **Given** a transfer action is in progress or fails, **When** the UI updates, **Then** the user sees progress and actionable feedback in the same workflow area.

---

### 1.1.4. User Story 4 - Safely Recover From Invalid or Conflicting Imports (Priority: P2)

A user can attempt imports without risking accidental loss of the current graph, because invalid files, unsupported schema versions, and conflicting graph names are handled explicitly before the active contract is changed.

**Why this priority**: Import is a destructive-feeling action unless the product clearly protects existing work. Trust in the feature depends on safe failure behavior.

**Independent Test**: A user attempts to import malformed YAML, a Walrus reference that points to invalid graph data, and a graph whose name already exists locally; in each case the current graph remains intact and the user receives a clear outcome.

**Acceptance Scenarios**:

1. **Given** the user selects a malformed or unsupported YAML file, **When** validation fails, **Then** the system rejects the import and keeps the current graph unchanged.
2. **Given** imported graph data references missing or inconsistent nodes and edges, **When** validation runs, **Then** the system blocks the import and identifies the data problem.
3. **Given** an imported graph would conflict with an existing local contract name, **When** the user completes the import, **Then** the system preserves the existing contract and creates a non-conflicting imported copy.

### 1.1.5. Edge Cases

- Importing a YAML file with a schema version newer than the app understands must fail safely with a message that the file format is unsupported.
- Importing graph data that contains edges pointing to missing nodes must fail before any local contract data is changed.
- Importing from Walrus must fail safely if the reference is malformed, the object is unavailable, or the returned content is not a valid graph document.
- Exporting or publishing an empty or incomplete graph must still produce a consistent result if the graph is otherwise storable locally.
- Starting an import while the active contract has unsaved name edits must not silently discard the draft name.

## 1.2. Requirements *(mandatory)*

### 1.2.1. Functional Requirements

- **FR-001**: The system MUST allow users to export the active saved contract to a YAML file.
- **FR-002**: The exported YAML document MUST contain the graph content required to restore the contract, including contract identity, node data, edge data, and graph layout state.
- **FR-003**: The system MUST include a document version in every exported graph so imports can be validated against known schema expectations.
- **FR-004**: The system MUST allow users to import a graph from a local YAML file.
- **FR-005**: The system MUST validate imported YAML before changing the saved contract library or active graph selection.
- **FR-006**: The system MUST reject imports whose content is malformed, incomplete, unsupported, or internally inconsistent.
- **FR-007**: The system MUST preserve existing saved contracts during import and MUST NOT silently overwrite an existing contract.
- **FR-008**: If an imported graph name conflicts with an existing saved contract name, the system MUST save the imported graph under a distinct name.
- **FR-009**: The system MUST add a successfully imported graph to the saved contract library and make it available through the existing saved contract selector.
- **FR-010**: The system MUST allow users to publish the active saved contract to Mysten Walrus.
- **FR-011**: A successful Walrus publish MUST return a reusable Walrus reference that the user can review and copy.
- **FR-012**: The system MUST allow users to import a graph from Mysten Walrus by supplying a Walrus reference.
- **FR-013**: Walrus import MUST retrieve, validate, and restore graph data using the same safety rules as local YAML import.
- **FR-014**: The system MUST present import, export, and publish actions within the existing saved contract management UI alongside Save, Save Copy, and Delete.
- **FR-015**: The transfer actions MUST be usable without leaving the visual graph workspace.
- **FR-016**: The UI MUST clearly distinguish local save actions from transfer actions so users can tell whether they are updating the local contract library, downloading a file, or sending data to Walrus.
- **FR-017**: The system MUST provide user-visible progress and completion feedback for import, export, and publish actions.
- **FR-018**: The system MUST provide actionable error feedback that identifies whether a failure came from file selection, document validation, Walrus lookup, or Walrus publish.
- **FR-019**: Failed import or publish attempts MUST leave the active graph and saved contract library unchanged.
- **FR-020**: Users MUST be able to cancel or dismiss an import or publish flow before completion without creating a partial saved contract.
- **FR-021**: Successfully published graphs SHOULD retain enough provenance in the local saved contract entry for the user to identify that the graph has a Walrus-backed copy.
- **FR-022**: Exported YAML and Walrus-published graph data MUST round-trip without loss of node count, edge count, node positions, or contract-level metadata needed to reopen the graph.
- **FR-023**: Seeded example contracts MUST remain protected from accidental destructive overwrite during import flows.
- **FR-024**: The system MUST preserve existing Save, Save Copy, and Delete behaviors for local contract management.

### 1.2.2. Key Entities *(include if feature involves data)*

- **Portable Graph Document**: A versioned graph snapshot that represents one saved contract in a transfer-safe format, including contract identity, descriptive metadata, node definitions, edge definitions, and layout state.
- **Saved Contract Entry**: A locally available graph record in the contract library that can be active, duplicated, deleted, exported, published, or replaced by importing a new copy.
- **Walrus Graph Reference**: A user-facing reference returned after publish and accepted during Walrus import to locate a previously published graph.
- **Graph Transfer Session**: The transient state of an import, export, or publish action, including source or destination, validation result, progress, success data, and failure details.

## 1.3. Success Criteria *(mandatory)*

### 1.3.1. Measurable Outcomes

- **SC-001**: In round-trip acceptance testing, 100% of exported graphs can be re-imported with the same node count, edge count, and saved contract name or a clearly renamed equivalent when conflicts occur.
- **SC-002**: Users can export or import a typical working graph of up to 250 nodes and 400 edges in under 5 seconds on a standard development machine, excluding manual file selection time.
- **SC-003**: Users can publish a typical working graph to Walrus and receive a reusable reference in under 30 seconds, excluding any user approval steps outside Frontier Flow.
- **SC-004**: In validation testing, 100% of malformed YAML files, invalid Walrus references, and inconsistent graph payloads fail without changing the active saved contract.
- **SC-005**: In usability testing, at least 90% of participants can locate import, export, and publish actions under the saved contract controls without assistance.
- **SC-006**: In acceptance testing, 100% of transfer failures identify the correct failure surface as one of file input, graph validation, Walrus retrieval, or Walrus publish.
- **SC-007**: Existing local contract management flows using Save, Save Copy, contract switching, and Delete continue to pass their current regression tests after the feature is introduced.

## 1.4. Assumptions

- The existing saved contract library remains the primary in-app source of truth for working graphs, and imported or published graphs extend that workflow rather than replace it.
- Mysten Walrus can store and return graph payloads in a way the product can address through a reusable user-facing reference.
- A versioned YAML graph document is an acceptable portable interchange format for users who want backup, migration, or manual file sharing.
- Imported graphs should enter the local saved contract library as discrete contract entries rather than replacing the active graph without an explicit user action.

## 1.5. Dependencies & Constraints

- The feature must integrate into the existing saved contract drawer used for Save, Save Copy, and Delete rather than introducing a separate persistence surface.
- Existing local auto-save behavior for the active contract must remain intact and understandable after transfer actions are added.
- Walrus availability, connectivity, and user access to publish or retrieve data are external dependencies that can affect transfer outcomes.
- The feature must remain compatible with the current saved contract model already used for nodes, edges, and local graph persistence.
