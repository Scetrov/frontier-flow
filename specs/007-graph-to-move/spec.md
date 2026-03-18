# Feature Specification: Graph To Move Generation

**Feature Branch**: `007-graph-to-move`  
**Created**: 2026-03-18  
**Status**: Draft  
**Input**: User description: "Convert the graph into actual Move so that compilation produces a real contract"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a real contract from a supported graph (Priority: P1)

A contract designer builds a supported automation graph on the canvas and expects the system to turn that graph into real Move source that represents the same logic, rather than placeholder code or a mock artifact.

**Why this priority**: This is the core product promise. If the graph does not become a real contract, the compile step has little user value.

**Independent Test**: Create a supported sample graph, generate the contract, and verify that the output is complete Move source for the intended behavior and can be compiled as a real contract artifact.

**Acceptance Scenarios**:

1. **Given** a graph made only of supported node types and valid connections, **When** the user generates contract code, **Then** the system produces a complete Move contract package representing that graph's behavior.
2. **Given** the same supported graph is generated twice without changes, **When** contract code is produced both times, **Then** the output is identical in structure and content.
3. **Given** a supported graph with branching and ordered actions, **When** contract code is produced, **Then** the generated Move preserves the graph's execution flow and data dependencies.

---

### User Story 2 - Know when a graph cannot become real Move yet (Priority: P1)

A contract designer uses a graph that includes unsupported nodes, invalid connections, or incomplete logic and needs a precise explanation of why the graph cannot be converted into a real contract.

**Why this priority**: Silent fallback or partial generation would create false confidence and waste time. Clear failure boundaries are required for trust.

**Independent Test**: Create graphs with unsupported node patterns, missing required inputs, or ambiguous execution order and verify that generation stops with actionable diagnostics tied to the affected graph elements.

**Acceptance Scenarios**:

1. **Given** a graph containing a node that has no defined Move representation, **When** contract generation starts, **Then** generation stops and the system reports that specific node as unsupported.
2. **Given** a graph with missing required inputs or broken connections, **When** contract generation starts, **Then** the system reports the blocking issues before compilation begins.
3. **Given** a graph whose execution order cannot be resolved unambiguously, **When** contract generation starts, **Then** the system reports the ambiguity and does not emit a contract artifact.

---

### User Story 3 - Review generated Move before or after compile (Priority: P2)

A contract designer wants to inspect the generated Move to confirm that the graph was translated faithfully and that the produced contract is readable enough to audit.

**Why this priority**: Real contract generation is more trustworthy when users can inspect the resulting source and compare it to their graph.

**Independent Test**: Generate code from a supported graph and verify that the user can view the produced Move source with stable naming and clearly separated sections that correspond to the graph's logic.

**Acceptance Scenarios**:

1. **Given** a supported graph has been generated successfully, **When** the user opens the generated code view, **Then** the user sees the Move source that will be compiled for that graph.
2. **Given** the user changes only one part of the graph, **When** code is generated again, **Then** the related section of the Move source changes while unrelated sections remain stable.

---

### User Story 4 - Compile a real artifact from generated Move (Priority: P2)

A contract designer wants the compile step to validate the generated Move contract itself, so success means the graph produced something real and deployable rather than a synthetic placeholder.

**Why this priority**: Successful compilation is the proof that graph generation is producing something meaningful for downstream deployment work.

**Independent Test**: Generate a contract from a supported graph, run the compile workflow, and verify that the compiled result comes from the generated Move package and that failures point back to the generated contract content.

**Acceptance Scenarios**:

1. **Given** a supported graph has been translated into Move, **When** the user runs compilation, **Then** the system compiles that generated contract artifact.
2. **Given** compilation fails on generated Move, **When** the failure is shown to the user, **Then** the system identifies the generated contract location and the graph element or rule that caused the failure when available.

### Edge Cases

- A graph is structurally valid but uses a node combination that has no approved Move mapping.
- User-provided names or labels would create invalid or conflicting Move identifiers.
- Two graph branches converge in a way that changes execution order unless an explicit ordering rule is applied.
- The graph includes disconnected subgraphs; only one subgraph can form a valid contract entry path.
- The graph is empty or has no valid entry node.
- A previously supported graph becomes partially unsupported after the user edits one node or connection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST convert any supported graph into complete Move source that represents the graph's intended contract behavior.
- **FR-002**: The system MUST preserve graph semantics in the generated contract, including entry conditions, data flow, branching, and ordered actions.
- **FR-003**: The system MUST define and enforce a supported graph subset for real Move generation instead of attempting best-effort output for unsupported constructs.
- **FR-004**: The system MUST stop generation and report a blocking diagnostic when a graph contains unsupported nodes, unsupported connection patterns, or unresolved execution order.
- **FR-005**: The system MUST stop generation and report blocking diagnostics when required graph inputs, outputs, or entry paths are missing.
- **FR-006**: The system MUST produce deterministic output so that identical graphs always generate identical Move source.
- **FR-007**: The system MUST generate readable Move source with stable naming and structure so users can inspect and review the contract output.
- **FR-008**: The system MUST sanitize graph-derived names and values so generated identifiers and literals are valid for the target contract language.
- **FR-009**: The system MUST generate a complete contract artifact for compilation, including all required source content and package metadata for a supported graph.
- **FR-010**: The system MUST ensure the compile workflow operates on the generated Move artifact rather than placeholder or handwritten fallback code.
- **FR-011**: The system MUST surface generation diagnostics before compilation when the graph cannot be translated safely into Move.
- **FR-012**: The system MUST expose the generated Move source to the user for inspection during the preview and compile workflow.
- **FR-013**: The system MUST keep a stable relationship between generated contract sections and originating graph elements so diagnostics can be traced back to the graph.
- **FR-014**: The system MUST verify the generated output against representative supported graphs using approval-style reference cases.
- **FR-015**: The system MUST verify that unsupported or incomplete graphs fail with explicit diagnostics rather than partial contract output.

### Key Entities *(include if feature involves data)*

- **Supported Graph**: A graph whose nodes, sockets, and connection patterns have approved real-Move representations and enough information to form a contract.
- **Generated Contract Artifact**: The full set of contract source files and metadata produced from a graph and submitted to compilation.
- **Generation Diagnostic**: A blocking or non-blocking message explaining why a graph can or cannot be translated into Move, including the affected graph element.
- **Graph-To-Contract Mapping Rule**: The approved translation rule that defines how a graph node, connection, or flow pattern becomes Move source.
- **Contract Section Trace**: The persistent link between a portion of generated contract output and the graph element that produced it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of agreed reference graphs in the supported subset generate complete Move contract artifacts without manual editing.
- **SC-002**: 100% of generated artifacts from supported reference graphs compile successfully in the product's compile workflow.
- **SC-003**: 100% of unsupported reference graphs fail before compilation with at least one diagnostic that identifies the blocking graph element or rule.
- **SC-004**: Re-generating an unchanged graph produces no diff in the generated Move output across repeated runs.
- **SC-005**: Users can open and inspect generated Move for any supported graph in one step from the existing code preview or compile flow.
- **SC-006**: In validation sessions using supported sample graphs, reviewers can trace every major generated contract section back to the corresponding graph path without external documentation.
- **SC-007**: At least 90% of generation-related defects found during feature testing are caught by reference-graph tests before release.

### Assumptions

- Initial real-Move generation will target the currently contract-aligned node set rather than every future node type.
- Unsupported graph features are acceptable in the short term if they fail clearly and do not produce misleading contract output.
- Existing preview and compile entry points will remain the primary user-facing surfaces for generated contract inspection and validation.
- The generated contract should stay readable and deterministic because users will compare it against both the graph and reference contract expectations.
