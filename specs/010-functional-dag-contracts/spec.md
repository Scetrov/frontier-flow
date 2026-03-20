# Feature Specification: Functional DAG Contracts

**Feature Branch**: `010-functional-dag-contracts`  
**Created**: 2026-03-20  
**Status**: Draft  
**Input**: User description: "Get the Move contracts generated from each DAG to be fully functional by reviewing the docs and defining a comprehensive specification for end-to-end generation, validation, compilation, testing, and deployment readiness."

## Clarifications

### Session 2026-03-20

- Q: What is the scope boundary for "fully functional" generated contracts? → A: Include compile-ready contracts plus extension registration or authorization readiness for an existing turret, but exclude full turret lifecycle automation.
- Q: How broad is the required reference DAG inventory? → A: Derive the inventory from the contracts in `Scetrov/smart-turrets`, with the long-term target that all of those contracts become fully supported.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a functional contract from every supported DAG (Priority: P1)

A contract designer builds or opens any DAG that stays within the supported node set and expects the system to produce a complete extension contract that preserves the graph's logic, satisfies the platform's contract-entry requirements, and is ready for compilation without manual editing.

**Why this priority**: This is the product's central promise. If a supported DAG does not become a functional contract, the canvas is only a diagramming tool and not a contract authoring system.

**Independent Test**: Run each supported reference DAG fixture through generation and compile validation. The story passes when every supported reference DAG fixture produces a complete contract package that can enter the normal compile workflow and preserves the trigger, filtering, scoring, and queueing semantics defined for that DAG.

**Acceptance Scenarios**:

1. **Given** a DAG made only of supported nodes, valid connections, and required field values, **When** the user generates the contract, **Then** the system produces a complete contract artifact for that DAG with no manual patching required.
2. **Given** the same supported DAG is generated multiple times without changes, **When** the contract artifact is produced each time, **Then** the output remains identical in structure and content.
3. **Given** two supported DAGs that express different targeting strategies, **When** their contracts are generated, **Then** each contract preserves its own trigger conditions, filtering rules, scoring rules, and output behavior.

---

### User Story 2 - Fail early when a DAG cannot become a functional contract (Priority: P1)

A contract designer uses a DAG with missing required inputs, unsupported node combinations, ambiguous execution order, or missing contract-critical semantics and needs the system to stop before compilation with precise, actionable diagnostics.

**Why this priority**: Best-effort generation would create false confidence and waste time. Clear failure boundaries are required for trust, especially when users intend to deploy the result on-chain.

**Independent Test**: Construct invalid and unsupported DAGs that cover structural, semantic, and contract-boundary failures. The story passes when generation halts before compilation and the system identifies the blocking graph elements or rules.

**Acceptance Scenarios**:

1. **Given** a DAG contains a node or pattern with no approved contract mapping, **When** generation starts, **Then** the system stops and reports the unsupported element before emitting a contract artifact.
2. **Given** a DAG is structurally incomplete, **When** generation starts, **Then** the system reports the blocking issues, including the affected nodes or sockets, before compilation is attempted.
3. **Given** a DAG would produce ambiguous or unsafe execution semantics, **When** generation starts, **Then** the system reports the ambiguity and does not emit a contract artifact.

---

### User Story 3 - Verify that generated contracts are functionally correct against the `smart-turrets` DAG inventory (Priority: P2)

A product reviewer or QA engineer needs a fixed library of reference DAGs derived from the contracts in `Scetrov/smart-turrets`, using [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md) as the concrete example catalog, so the generation pipeline can prove coverage of the intended trigger, filtering, scoring, and queueing patterns used by the app's visual contract model.

**Why this priority**: Generating one contract correctly is insufficient. The system must prove broad coverage across the known strategy patterns represented by the `smart-turrets` contract inventory and exemplar turret logic.

**Independent Test**: Execute the reference-DAG validation suite derived from `Scetrov/smart-turrets` and grounded in the example behaviors documented in [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md), and confirm that every supported DAG compiles into a contract that preserves that DAG's approved trigger, filtering, scoring, and queueing behavior, while every unsupported DAG fails for an explicitly documented reason.

**Acceptance Scenarios**:

1. **Given** the reference DAG library derived from `Scetrov/smart-turrets` and cataloged in [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md) is available, **When** validation runs, **Then** every DAG has an expected outcome recorded as successful generation and compilation or explicit unsupported status.
2. **Given** a reference DAG is marked as supported, **When** contract generation and compilation are executed, **Then** the resulting artifact compiles successfully and preserves that DAG's approved trigger, filtering, scoring, and queueing behavior.
3. **Given** a regression changes the generated behavior or compile output for a supported reference DAG, **When** validation runs, **Then** the regression is detected before release.

---

### User Story 4 - Review, compile, and prepare each generated contract for deployment, authorization, and upgrade flows (Priority: P2)

A contract designer wants to inspect the generated contract, compile it, and carry it forward into the existing deploy, extension-authorization, or upgrade path with confidence that the artifact matches the target platform's extension requirements for an existing turret.

**Why this priority**: Functional generation is only valuable if the resulting artifact can move through the rest of the product workflow. This closes the gap between visual authoring and on-chain use.

**Independent Test**: Generate a contract from a supported DAG, inspect the artifact, compile it, and verify it can proceed through the existing deployment and extension-registration preparation flow for an existing turret without requiring handwritten fixes.

**Acceptance Scenarios**:

1. **Given** a supported DAG has been generated successfully, **When** the user opens the generated contract view, **Then** the user sees the exact source that will be compiled and deployed for that DAG.
2. **Given** a generated contract compiles successfully, **When** the user enters the existing deploy or upgrade flow, **Then** the workflow uses that generated artifact rather than a placeholder or fallback contract.
3. **Given** a generated contract compiles successfully and the user targets an existing turret, **When** the user enters the extension registration or deployment-status flow, **Then** the workflow uses the generated artifact and provides the required readiness information or actions for attaching that artifact to the turret.
4. **Given** compilation, deployment-preparation, or deployment-status preparation fails, **When** the failure is surfaced, **Then** the user sees a diagnostic that includes a human-readable message, severity, the relevant generated contract section, the related graph context where available, and a remediation hint.

### Edge Cases

- A DAG is structurally valid but cannot produce a functional contract because a required platform contract rule is missing from the graph model.
- A DAG contains multiple entry paths, but only one yields a valid contract execution path.
- Two graph branches converge in a way that changes targeting semantics unless evaluation order is made deterministic.
- User-supplied names, labels, or field values would produce invalid or conflicting contract identifiers.
- A DAG mixes supported node types with one retired or migrated node restored from saved data.
- A generated contract is valid for preview but cannot be compiled because external platform dependencies or package metadata are unavailable.
- A contract compiles successfully but cannot proceed to deployment-status preparation because required extension registration details for an existing turret are missing or invalid.
- A user expects the feature to handle turret anchor, online, offline, or other full lifecycle steps that are explicitly outside this feature's scope.

## Requirements _(mandatory)_

### Functional Requirements

#### Supported DAG Coverage

- **FR-001**: The system MUST define a supported DAG subset that is sufficient to generate fully functional contracts from the current contract-aligned node model.
- **FR-002**: The system MUST treat every DAG in the reference library derived from the contracts in `Scetrov/smart-turrets` as either supported with an approved expected behavior or explicitly unsupported with a documented reason.
- **FR-003**: The system MUST preserve each supported DAG's trigger conditions, filtering behavior, scoring behavior, and queueing behavior in the generated contract artifact.
- **FR-004**: The system MUST generate complete contract artifacts for supported DAGs, including all source content and metadata required by the existing compile workflow.

#### Contract Correctness and Platform Compatibility

- **FR-005**: The system MUST generate contracts that satisfy the target platform's required extension entry contract, input shape, output shape, and ownership context.
- **FR-006**: The system MUST generate contracts that consume and return candidate-priority data using the platform-approved contract boundary rather than internal placeholder shapes.
- **FR-007**: The system MUST generate contracts that correctly handle required extension lifecycle values so the artifact is compilable and operationally valid.
- **FR-008**: The system MUST derive deterministic contract identity and naming that avoid collisions within the supported workflow.
- **FR-009**: The system MUST sanitize graph-derived identifiers and user-supplied values before they can affect generated contract content.

#### Validation and Failure Boundaries

- **FR-010**: The system MUST validate structural completeness before generation, including required inputs, required outputs, valid entry paths, and incompatible or missing connections.
- **FR-011**: The system MUST validate semantic completeness before generation, including unsupported node combinations, unresolved execution order, missing contract-critical semantics, and invalid field values.
- **FR-012**: The system MUST stop contract generation when a DAG cannot be translated safely into a functional artifact.
- **FR-013**: The system MUST surface blocking diagnostics before compilation and MUST identify the relevant graph elements or governing rule for each blocking issue.
- **FR-014**: The system MUST distinguish blocking failures from non-blocking warnings so users can tell whether generation may proceed.

#### Deterministic Generation and Traceability

- **FR-015**: The system MUST produce deterministic contract output so identical DAGs always generate identical artifacts.
- **FR-016**: The system MUST maintain a stable relationship between generated contract sections and the graph elements that produced them.
- **FR-017**: The system MUST expose the generated contract artifact to users for inspection before or during compilation, deployment-preparation, and extension-authorization preparation workflows.
- **FR-018**: The system MUST surface compilation failures as diagnostics that include a human-readable message, severity, generated contract section, related graph context wherever that mapping is available, and a remediation hint.

#### Reference DAG Validation

- **FR-019**: The system MUST maintain a reference DAG library derived from the contracts in `Scetrov/smart-turrets` and cataloged in [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md), covering the supported trigger, filtering, scoring, and action patterns described by the current product docs and exemplar turret strategies.
- **FR-020**: The system MUST define the expected functional outcome for every reference DAG, including the contract behavior it represents, the concrete example seed it maps to from [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md), and the expected generation result.
- **FR-021**: The system MUST verify every supported reference DAG through generation and compilation checks before release.
- **FR-022**: The system MUST verify unsupported reference DAGs fail with explicit diagnostics rather than partial or misleading contract output.

#### Workflow Integration

- **FR-023**: The existing compile workflow MUST operate on the generated contract artifact for the active DAG rather than on placeholder or handwritten fallback content.
- **FR-024**: The existing preview workflow MUST show the generated contract artifact for the active DAG.
- **FR-025**: The existing deploy, extension registration or authorization preparation, or upgrade preparation workflow MUST use the generated contract artifact produced from the active DAG once generation succeeds.
- **FR-026**: The system MUST preserve the active graph-to-artifact relationship across compile, preview, deployment-preparation, and extension-authorization preparation steps so users do not act on stale output.
- **FR-027**: The feature MUST support readiness for attaching a generated contract to an existing turret through the platform's extension registration or authorization flow.
- **FR-028**: The feature MUST explicitly exclude full turret lifecycle automation, including anchor, online, offline, unanchor, or equivalent world-lifecycle operations.

#### Testing and Regression Protection

- **FR-029**: The system MUST provide canonical reference validation for generated artifacts from supported reference DAGs.
- **FR-030**: The system MUST provide behavioral tests or equivalent verification for contract-critical semantics such as inclusion and exclusion logic, scoring accumulation, and output list construction.
- **FR-031**: The system MUST provide regression coverage for deterministic output, supported-versus-unsupported boundaries, and graph-to-contract traceability.
- **FR-032**: The system MUST verify that generated artifacts remain usable in the product's compile workflow whenever generation rules, node definitions, or exemplar DAGs change.

### Key Entities _(include if feature involves data)_

- **Supported DAG**: A graph whose nodes, connections, field values, and execution semantics are fully covered by approved contract-generation rules.
- **Reference DAG**: A curated DAG used to prove supported coverage, document expected behavior, and guard against regressions in generation and compilation.
- **Functional Contract Artifact**: The complete generated contract package for a DAG, including source content, contract identity information, and compile-ready metadata.
- **Generation Rule**: The approved mapping that turns a graph pattern into contract behavior while preserving trigger, filter, scoring, and output semantics.
- **Generation Diagnostic**: A warning or blocking message that explains why a DAG can or cannot become a functional contract, tied to graph context or governing rules.
- **Contract Section Trace**: The persistent link between a portion of generated contract output and the DAG elements that produced it.
- **Deployment-Ready Artifact**: A functional contract artifact that has passed generation and compilation and can be used by the existing deployment or extension-authorization preparation workflow for an existing turret.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of supported reference DAGs generate complete contract artifacts without manual source edits.
- **SC-002**: 100% of supported reference DAGs derived from the `Scetrov/smart-turrets` inventory compile successfully in the product workflow into contracts that preserve their approved trigger, filtering, scoring, and queueing behavior.
- **SC-003**: 100% of unsupported reference DAGs fail before compilation with at least one blocking diagnostic that identifies the relevant graph element or governing rule.
- **SC-004**: Re-generating an unchanged supported DAG produces no diff in the resulting contract artifact across repeated runs.
- **SC-005**: Reviewers can inspect the generated contract for any supported DAG in one step from the existing preview or compile flow.
- **SC-006**: For every supported reference DAG, reviewers can trace each major generated contract section back to the originating DAG path without external tooling.
- **SC-007**: Contract-generation regressions affecting supported reference DAGs are detected before release by the reference validation suite.
- **SC-008**: For 100% of supported DAG validation runs, users can move from successful generation to compile readiness and authorization-readiness review without regenerating, reloading, or manually reselecting the generated artifact.

## Assumptions

- The initial scope focuses on DAGs expressible with the current contract-aligned node catalogue and existing graph editor model rather than future node families.
- The reference DAG inventory is derived from the contracts in `Scetrov/smart-turrets`, with [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md) serving as the concrete example catalog for the current seed strategies, and newly added contracts in that inventory expand the remaining support backlog until all are fully supported.
- If a DAG depends on behavior that is not yet expressible in the graph model or not yet supported by the approved generation rules, the correct behavior is to fail clearly rather than emit partial output.
- Existing preview, compile, deploy, and extension-authorization preparation surfaces remain the primary user-facing entry points for generated contract inspection and downstream use.
- Platform-specific extension requirements already identified in the attached docs are treated as mandatory constraints for “fully functional” output.
- External platform questions that remain open in the docs do not block specification of internal product behavior; the feature must still fail safely and clearly where those external constraints cannot yet be resolved.
- Full turret lifecycle automation remains out of scope for this feature even when generated contracts are otherwise deployment-ready.
