# 1. Feature Specification: Remove Reference-Template Shortcut

**Feature Branch**: `022-remove-reference-template-shortcut`
**Created**: 2026-04-27
**Status**: In Progress
**Input**: User description: "Remove the reference-template shortcut from the Move codegeneration pipeline so all contracts are emitted from the actual validated graph, not from prewritten canned templates."

## 1.1. User Scenarios & Testing

### 1.1.1. User Story 1 - Emit Move from the Validated Graph (Priority: P1)

As a contract author, I want the compiler to emit Move from the validated graph so graph edits always affect the generated contract.

**Why this priority**: Hidden module-name shortcuts break trust in the compiler and can silently ignore graph changes.

**Independent Test**: Compile a supported fixture graph, mutate one semantic edge, recompile, and verify the emitted Move changes while still resolving to the same module.

**Acceptance Scenarios**:

1. **Given** a supported graph fixture, **When** the pipeline emits Move, **Then** the output is produced from the validated graph path rather than a canned module-name template.
2. **Given** the same graph is compiled twice, **When** no semantic inputs change, **Then** the emitted Move and artifact fingerprint remain identical.
3. **Given** a semantic graph edge is removed or changed, **When** the pipeline recompiles, **Then** the emitted Move changes accordingly.

---

### 1.1.2. User Story 2 - Fail or Compile Based on Real Graph Semantics (Priority: P1)

As a developer, I want supported fixtures to compile only when their graphs express the required semantics so missing behavior is surfaced explicitly.

**Why this priority**: Template fallback masked incomplete graphs and made it impossible to know whether the graph model was actually sufficient.

**Independent Test**: Compile the supported smart-turret fixtures and verify each one either emits graph-driven Move or fails with a graph-attributed diagnostic.

**Acceptance Scenarios**:

1. **Given** a supported fixture whose graph is semantically complete, **When** it is compiled, **Then** the pipeline emits a real artifact through the generic emitter path.
2. **Given** a fixture whose graph is missing semantics previously supplied by a template, **When** it is compiled, **Then** the pipeline fails clearly instead of silently restoring hidden logic.
3. **Given** a module display name that sanitizes to a known fixture module, **When** the graph is compiled, **Then** the output still reflects the graph rather than the module name alone.

---

### 1.1.3. User Story 3 - Keep Deterministic Artifacts After Shortcut Removal (Priority: P2)

As a maintainer, I want deterministic graph-driven artifacts after removing the shortcut so regression tests and artifact fingerprints remain trustworthy.

**Why this priority**: Deterministic output is a project-level requirement for graph-to-Move generation and artifact review.

**Independent Test**: Run the compiler-focused test suite and typecheck after the refactor, then confirm artifact snapshots reflect the new graph-driven output intentionally.

**Acceptance Scenarios**:

1. **Given** unchanged graph input, **When** the compiler runs repeatedly, **Then** the emitted Move, source map, and artifact fingerprint are stable.
2. **Given** reference-template behavior has been removed, **When** artifact snapshots change, **Then** the new values correspond to graph-driven output changes.
3. **Given** the compiler test suite is executed, **When** validation completes, **Then** no active code path still references reference-template selection.

### 1.1.4. Edge Cases

- A display-name alias that sanitizes to `turret_aggressor_first`, `turret_low_hp_finisher`, `turret_player_screen`, or `turret_size_priority` must not bypass graph-driven emission.
- A fixture that compiled only because of injected template semantics must either gain those semantics explicitly in the graph/generator model or fail with a clear diagnostic.
- Determinism checks must still pass even though artifact ids change once the emitted Move changes.
- The compiler must not retain dead imports, docs, comments, or tests that imply reference-template selection is still active.

## 1.2. Requirements

### 1.2.1. Functional Requirements

- **FR-001**: The compiler MUST emit Move only from the validated graph-driven generation path.
- **FR-002**: The compiler MUST NOT emit canned Move based solely on module name or sanitized display name.
- **FR-003**: The reference-template module and its active usages MUST be removed from the compiler pipeline.
- **FR-004**: Compiler tests MUST assert graph-driven behavior rather than template selection behavior.
- **FR-005**: Supported fixtures MUST either compile through the generic pipeline or fail with clear diagnostics if their graphs are incomplete.
- **FR-006**: Deterministic output guarantees for unchanged graphs MUST be preserved after the refactor.
- **FR-007**: Comments and documentation describing reference-template selection as part of the active pipeline MUST be removed or rewritten.

### 1.2.2. Key Entities

- **Validated IR Graph**: The sanitized, ordered graph representation consumed by Move generators and the emitter.
- **Generated Contract Artifact**: The emitted Move package artifact, source map, and deterministic fingerprint produced by the compiler pipeline.
- **Supported Smart-Turret Fixture**: A graph fixture expected to compile or fail based on explicit graph semantics rather than hidden template behavior.

## 1.3. Success Criteria

### 1.3.1. Measurable Outcomes

- **SC-001**: 100% of compiler emission paths for supported fixtures go through the graph-driven emitter path only.
- **SC-002**: 100% of targeted compiler tests under `src/__tests__/compiler` pass after the shortcut is removed.
- **SC-003**: Recompiling the same graph yields identical output and artifact fingerprints in regression tests.
- **SC-004**: A semantic graph mutation changes emitted Move for the affected fixture in regression coverage.
- **SC-005**: No active source, test, or docs references remain that describe reference-template selection as a live compiler behavior.

## 1.4. Assumptions

- The current generic emitter path is the intended long-term architecture for TypeScript-to-Move generation.
- Some smart-turret fixtures may still be semantically incomplete after template removal and will need explicit follow-up work.
- Compiler-focused validation is sufficient for the current scope; broader repo validation is only needed if compiler changes widen further.

## 1.5. Dependencies & Constraints

- The implementation must preserve strict TypeScript typing and deterministic Move generation.
- The generated target artifact remains Move; no alternate backend is in scope.
- Hidden special cases must not be reintroduced elsewhere in the TypeScript compiler pipeline.