# Feature Specification: WASM Contract Compilation Pipeline

**Feature Branch**: `006-wasm-compile-pipeline`  
**Created**: 2026-03-18  
**Status**: Draft  
**Input**: User description: "Compile the contract into WASM using @zktx.io/sui-move-builder. Auto-compile on idle, footer status indicator (Idle/Compiling/Compiled/Error with coloured dots), Header Build button, comprehensive code generation tests at node and contract level, and error/warning surfacing for issues like unconnected nodes."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Node-to-code generation from the internal graph representation (Priority: P1)

A user has placed and connected nodes on the canvas. Behind the scenes, the system converts the internal graph representation (React Flow nodes, edges, and their typed socket definitions) into valid Sui Move source code. Each node type maps to a deterministic code fragment, and connected graphs produce a complete compilable Move module. The code generation pipeline transforms the graph through multiple phases: IR construction, validation, sanitisation, optimisation, and code emission — with a source map linking every emitted line back to its originating canvas node.

**Why this priority**: Without code generation, there is nothing to compile. This is the foundational transformation that every other story depends on.

**Independent Test**: Can be fully tested by constructing graphs programmatically (unit tests), running them through the code generation pipeline, and asserting that the emitted Move source matches expected snapshots at both the individual-node and full-contract level. Delivers value by proving the visual-to-code mapping is correct and deterministic.

**Acceptance Scenarios**:

1. **Given** a single event-trigger node with no connections, **When** the code generator processes it, **Then** it emits the correct Move function signature and entry-point boilerplate for that trigger type.
2. **Given** a valid fully-connected graph representing a turret scoring strategy, **When** the code generator processes the graph, **Then** the emitted Move module compiles without errors and matches the expected snapshot.
3. **Given** two identical graphs, **When** each is independently processed by the code generator, **Then** both produce byte-for-byte identical Move source (deterministic output).
4. **Given** a graph with user-supplied node labels containing special characters, **When** the code generator processes it, **Then** labels are sanitised to valid Move identifiers without injection risk.

---

### User Story 2 — Graph validation with error and warning surfacing (Priority: P1)

Before code generation proceeds, the system validates the graph for structural completeness and type safety. Nodes with unconnected required inputs produce warnings or errors. Disconnected subgraphs, missing event triggers, type mismatches, and cyclic dependencies are detected. Validation results are surfaced in the UI — errors prevent compilation and are visually highlighted on the offending nodes; warnings are displayed but do not block compilation.

**Why this priority**: Without validation, the compiler would receive invalid Move code and produce cryptic errors that cannot be traced back to the user's graph. Validation is the safety gate between the visual editor and the compilation step.

**Independent Test**: Can be fully tested by constructing graphs with known validation issues (unconnected inputs, disconnected nodes, type mismatches, cycles) and asserting the validator returns the correct diagnostics with node references. Delivers value by catching user mistakes early with actionable feedback.

**Acceptance Scenarios**:

1. **Given** a node with a required input socket that has no incoming edge, **When** validation runs, **Then** a warning diagnostic is emitted referencing that node and socket.
2. **Given** a graph with a disconnected node that has no edges at all, **When** validation runs, **Then** a warning diagnostic identifies the orphaned node.
3. **Given** a graph with no event-trigger node, **When** validation runs, **Then** an error diagnostic is emitted stating that the graph requires at least one entry point.
4. **Given** a graph where all nodes are connected with valid types, **When** validation runs, **Then** no diagnostics are emitted and compilation proceeds.
5. **Given** validation diagnostics exist, **When** they are surfaced in the UI, **Then** each diagnostic is associated with a specific node and the node is visually marked (e.g., coloured border or icon overlay).

---

### User Story 3 — In-browser WASM compilation with auto-compile on idle (Priority: P1)

After the user edits the graph (adds, removes, moves, or connects nodes), the system waits for a configurable idle period (default: a few seconds of no edits). Once the idle threshold is reached, the system automatically triggers the code generation and WASM compilation pipeline using `@zktx.io/sui-move-builder/lite`. The WASM binary is lazy-loaded on first compilation to avoid impacting initial page load. If the graph has validation errors, compilation is skipped and the error state is shown instead.

**Why this priority**: Auto-compilation on idle is the core developer experience — it provides instant feedback without manual intervention. This is what makes the tool feel responsive and interactive.

**Independent Test**: Can be fully tested by simulating graph edits, waiting for the idle timeout, and asserting that the compilation pipeline fires and produces the expected result (compiled bytecode or error diagnostics). Timer behaviour can be tested with fake timers. Delivers value by making the edit-compile loop seamless.

**Acceptance Scenarios**:

1. **Given** the user modifies the graph, **When** no further edits occur for the idle duration, **Then** the system automatically triggers code generation and compilation.
2. **Given** the user is actively editing (adding nodes, connecting edges), **When** each edit resets the idle timer, **Then** compilation does not trigger until editing pauses.
3. **Given** a compilation is in progress, **When** the user makes another edit, **Then** the in-flight compilation is cancelled (or its result discarded) and a new idle timer starts.
4. **Given** the WASM module has not been loaded yet, **When** the first compilation triggers, **Then** the WASM binary is lazy-loaded before compilation begins.
5. **Given** the graph has validation errors, **When** the idle timer fires, **Then** compilation is skipped and the status shows Error with the validation diagnostics.

---

### User Story 4 — Footer compilation status indicator (Priority: P1)

The footer displays a persistent compilation status indicator consisting of a coloured dot and a label. The four states are:

- **Idle** (blue dot): No compilation activity; the graph has been modified but the idle timer has not yet elapsed.
- **Compiling** (orange dot): Compilation is in progress.
- **Compiled** (green dot): The last compilation succeeded.
- **Error** (red dot): The last compilation or validation failed.

The status updates in real time as the compilation lifecycle progresses. When in the Error state, clicking the indicator (or an adjacent element) reveals the error details.

**Why this priority**: Users need immediate, glanceable feedback about whether their graph is valid and compiled. Without a status indicator, they have no way to know if their changes have been processed or if errors exist.

**Independent Test**: Can be fully tested by rendering the footer in each of the four states and asserting the correct colour, label, and behaviour. Delivers value by providing constant compilation feedback.

**Acceptance Scenarios**:

1. **Given** the application loads with nodes on the canvas, **When** the footer renders, **Then** the status indicator shows "Idle" with a blue dot.
2. **Given** compilation begins, **When** the status transitions to Compiling, **Then** the indicator shows "Compiling" with an orange dot.
3. **Given** compilation succeeds, **When** the status transitions to Compiled, **Then** the indicator shows "Compiled" with a green dot.
4. **Given** compilation or validation fails, **When** the status transitions to Error, **Then** the indicator shows "Error" with a red dot.
5. **Given** the user modifies the graph after a successful compilation, **When** the idle timer has not yet elapsed, **Then** the status reverts to "Idle" with a blue dot.

---

### User Story 5 — Manual Build button in the Header (Priority: P2)

The header contains a "Build" button that allows the user to manually trigger the code generation and compilation pipeline at any time, without waiting for the idle timer. The button is disabled while a compilation is already in progress. Clicking Build follows the same pipeline as auto-compile: validate → generate → compile → update status.

**Why this priority**: While auto-compile handles most cases, some users prefer explicit control. The Build button provides a familiar manual trigger. It is lower priority because the auto-compile already covers the primary use case.

**Independent Test**: Can be fully tested by simulating a click on the Build button and asserting that the compilation pipeline fires, the status indicator transitions correctly, and the button is disabled during compilation. Delivers value by giving users explicit control.

**Acceptance Scenarios**:

1. **Given** nodes exist on the canvas, **When** the user clicks the Build button, **Then** the compilation pipeline runs and the footer status updates accordingly.
2. **Given** a compilation is in progress, **When** the user views the Build button, **Then** the button is disabled with a visual indicator (e.g., muted colour or spinner).
3. **Given** the graph is empty (no nodes), **When** the user clicks Build, **Then** a validation error is shown and compilation does not proceed.
4. **Given** the Build button is clicked, **When** a compilation was already in progress from auto-compile, **Then** the in-flight compilation is not duplicated.

---

### User Story 6 — Compiler error traceability to canvas nodes (Priority: P2)

When the WASM compiler returns errors, the raw Move compiler output is parsed into structured diagnostics. Each diagnostic is mapped back to the originating canvas node using the source map generated during code emission. Errors are displayed in an accessible format — associated with specific nodes on the canvas and surfaced in the footer or a dedicated diagnostics panel. Users can click an error to highlight the responsible node on the canvas.

**Why this priority**: Compiler error traceability transforms opaque Move compiler output into actionable visual feedback. This is critical for the user experience but depends on stories 1–4 being in place first.

**Independent Test**: Can be fully tested by feeding known Move compiler error outputs and source maps to the parser and asserting the correct node mappings. Delivers value by making compiler errors understandable and actionable.

**Acceptance Scenarios**:

1. **Given** the WASM compiler returns an error referencing a specific source line, **When** the error parser processes it, **Then** the diagnostic includes the React Flow node ID from the source map.
2. **Given** a diagnostic is associated with a canvas node, **When** the user views the error, **Then** the error message includes a human-readable reference to the node.
3. **Given** the compiler returns multiple errors, **When** the error parser processes them, **Then** all errors are extracted and individually mapped.
4. **Given** a compiler error references a line that has no source map entry, **When** the error parser processes it, **Then** the diagnostic is still surfaced with the raw message and "unknown node" attribution.

---

### Edge Cases

- What happens when the canvas is empty (zero nodes)? Validation produces an error stating no entry point exists; the status indicator shows Error.
- What happens when the WASM binary fails to load (network error, corrupt binary)? The status shows Error with a message indicating the compiler could not be initialised.
- What happens when the user rapidly toggles between graphs (contract library switching)? Each switch cancels any in-flight compilation and restarts the idle timer for the new graph.
- What happens when a compilation produces warnings but no errors? The status shows Compiled (green) and warnings are displayed in a non-blocking manner.
- What happens when the browser runs out of memory during compilation of a very large graph? The error is caught and surfaced as a compilation Error with an appropriate message.
- What happens when the user's graph has only disconnected nodes with no edges? Validation warns about each disconnected node and errors about no valid entry point.

## Requirements _(mandatory)_

### Functional Requirements

#### Code Generation Pipeline

- **FR-001**: System MUST transform the React Flow graph (nodes, edges, socket definitions) into a normalised Intermediate Representation (IR) as the first pipeline phase.
- **FR-002**: System MUST validate the IR for structural completeness — every required input socket on every node must have an incoming edge, or a diagnostic must be emitted.
- **FR-003**: System MUST validate the IR for type safety — connected sockets must have compatible types per the existing socket compatibility matrix.
- **FR-004**: System MUST validate the IR for topological soundness — the graph must be a directed acyclic graph (DAG); cycles must be detected and reported.
- **FR-005**: System MUST detect and report disconnected nodes (nodes with no edges) as warnings.
- **FR-006**: System MUST detect and report the absence of an event-trigger node as an error — every valid contract requires at least one entry point.
- **FR-007**: System MUST sanitise all user-supplied values (node labels, contract names) against a strict allowlist before they reach the code emitter, preventing injection of arbitrary Move code.
- **FR-008**: System MUST emit valid Sui Move source code from the validated IR, with each node type mapping to a deterministic code fragment.
- **FR-009**: System MUST produce a source map during code emission that links every emitted line to its originating React Flow node ID.
- **FR-010**: Code generation MUST be deterministic — identical graphs must always produce byte-for-byte identical Move source.

#### WASM Compilation

- **FR-011**: System MUST compile generated Move source code using `@zktx.io/sui-move-builder` entirely in the browser via WASM.
- **FR-012**: System MUST lazy-load the WASM binary on first compilation to avoid impacting initial page load time.
- **FR-013**: System MUST auto-trigger compilation after the editor has been idle (no graph edits) for a configurable duration (default: a few seconds).
- **FR-014**: System MUST reset the idle timer on every graph edit (node add, node remove, node move, edge add, edge remove, edge reconnect).
- **FR-015**: System MUST cancel or discard the result of an in-flight compilation if the user edits the graph before it completes.
- **FR-016**: System MUST skip compilation and show Error status when the graph has validation errors.

#### UI — Footer Status Indicator

- **FR-017**: Footer MUST display a compilation status indicator with a coloured dot and text label.
- **FR-018**: The indicator MUST support four states: Idle (blue dot), Compiling (orange dot), Compiled (green dot), Error (red dot).
- **FR-019**: The indicator MUST update in real time as compilation status changes.
- **FR-020**: When in Error state, the indicator MUST provide access to the error details (e.g., click to expand, tooltip, or adjacent panel).

#### UI — Header Build Button

- **FR-021**: Header MUST display a "Build" button that manually triggers the compilation pipeline.
- **FR-022**: The Build button MUST be disabled while a compilation is in progress.
- **FR-023**: Clicking Build MUST follow the same pipeline as auto-compile: validate → generate → compile → update status.

#### Error Surfacing and Traceability

- **FR-024**: System MUST parse raw Move compiler error output into structured diagnostics containing severity, message, source line, and originating node ID.
- **FR-025**: System MUST map compiler errors back to canvas nodes using the source map from code emission.
- **FR-026**: Validation warnings and errors MUST be visually indicated on the affected nodes on the canvas (e.g., coloured border, icon overlay).
- **FR-027**: Compiler errors MUST be surfaced in the UI in a human-readable format, not as raw compiler output.

#### Testing

- **FR-028**: System MUST have unit tests for each node type's individual code generation output (node-level code gen tests).
- **FR-029**: System MUST have integration tests that construct complete graphs and verify the emitted Move module matches expected snapshots (contract-level code gen tests).
- **FR-030**: System MUST have unit tests for the graph validation phase covering: unconnected inputs, disconnected nodes, missing entry points, type mismatches, and cyclic dependencies.
- **FR-031**: System MUST have unit tests for the compiler error parser covering: single errors, multiple errors, warnings, unmappable lines, and malformed output.
- **FR-032**: System MUST have unit tests for the idle timer debounce behaviour, including reset on edit, cancel on new edit during compilation, and correct trigger after idle period.
- **FR-033**: System MUST mock `@zktx.io/sui-move-builder` in unit tests using pre-compiled bytecode fixtures, as the WASM binary is too large for unit test execution.

### Key Entities

- **Intermediate Representation (IR)**: A normalised, framework-agnostic representation of the node graph used as the stable interface between pipeline phases.
- **Source Map**: A collection of entries mapping each emitted Move source line to the React Flow node ID that produced it.
- **Compiler Diagnostic**: A structured representation of a compiler error or warning, including severity, message, source line, and traced node ID.
- **Compilation Status**: A state machine with four states (Idle, Compiling, Compiled, Error) that drives the footer indicator and Build button behaviour.
- **Idle Timer**: A debounced timer that triggers auto-compilation after a period of no graph edits.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users see a valid Move module generated from a fully-connected graph within 1 second of code generation triggering.
- **SC-002**: Auto-compilation triggers within 1 second of the idle timer elapsing, with no user intervention required.
- **SC-003**: The compilation status indicator reflects the current pipeline state within 200ms of each state transition.
- **SC-004**: 100% of validation errors (unconnected inputs, disconnected nodes, missing entry points, type mismatches, cycles) are detected before code reaches the compiler.
- **SC-005**: 100% of compiler errors are parsed into structured diagnostics and traced back to originating canvas nodes when a source map entry exists.
- **SC-006**: Unit test coverage for the code generation pipeline (IR construction, validation, sanitisation, emission) meets or exceeds 90%.
- **SC-007**: Users can identify and fix graph errors based solely on the surfaced diagnostics, without reading raw Move compiler output.
- **SC-008**: The WASM binary loads transparently on first compile — users experience no perceptible delay beyond the initial load.
- **SC-009**: Deterministic output is maintained: identical graphs always produce identical Move source across compilations.

### Assumptions

- The `@zktx.io/sui-move-builder/lite` package provides a stable API for in-browser Move compilation and returns structured error output parseable by regex.
- The WASM binary is loaded from the npm package bundle (not a separate CDN), and its integrity is ensured by the package manager's lockfile and checksums.
- The idle auto-compile duration will be tuned through user testing; an initial default of 2–3 seconds is reasonable.
- The existing socket compatibility matrix and node type definitions from spec 005 are the canonical input for this feature.
- Code generation templates and the IR schema will be defined during the planning phase; this spec intentionally avoids prescribing implementation details.
- Browser memory constraints are accepted as a known limitation (R-14 in Risk Register); very large graphs may fail to compile.
