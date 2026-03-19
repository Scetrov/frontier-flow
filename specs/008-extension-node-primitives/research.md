# Research: Extension Node Primitive Refactor

## Decision 1: Replace runtime-dead config nodes with explicit primitive nodes plus typed editable fields

**Decision**: Remove config-object node patterns that cannot influence the runtime contract behavior and replace them with a combination of explicit predicate/value nodes and typed editable node fields.

**Rationale**: The current codebase contains config-oriented node types that emit hard-coded values and cannot be configured per instance. Keeping them would preserve misleading UX and undermine deterministic behavior. Explicit fields and primitive nodes align the UI with what the compiler and runtime actually consume.

**Alternatives considered**:

- Keep config nodes and document their limitations: rejected because it preserves deceptive behavior.
- Keep config nodes only for legacy graphs: rejected because it prolongs a broken abstraction instead of converging on a stable model.

## Decision 2: Model boolean composition through first-class operator nodes (`NOT`, `AND`, `OR`, `XOR`)

**Decision**: Add dedicated boolean operator nodes and direct predicate replacements such as `Is Same Tribe` instead of continuing to encode multiple decisions inside bundled exclusion nodes.

**Rationale**: The existing node system already supports boolean outputs and action predicates, and the compiler generator pattern for boolean logic is straightforward to extend. First-class operators let users compose behavior transparently, make node semantics easier to test, and reduce duplication across bundled logic nodes.

**Alternatives considered**:

- Add only a subset of operators (`NOT` and `AND`): rejected because the spec explicitly requires all four operators and users need a complete primitive set.
- Keep bundled exclusion nodes and add operators alongside them: rejected because it blurs the product direction and complicates migration.

## Decision 3: Store editable node values in typed field metadata attached to node definitions and persisted node data

**Decision**: Extend the node definition model with field metadata and persist concrete field values with each saved flow node so list-based values such as tribes and type IDs survive save, load, restore, and migration.

**Rationale**: The current `FlowNodeData` shape is overwritten during hydration, so value editing cannot work reliably without a durable schema and serialization contract. A field schema defined at the node-definition level provides a single source of truth for rendering, validation, persistence, and migration.

**Alternatives considered**:

- Store editable values in a separate sidecar localStorage map: rejected because it breaks portability of saved contracts.
- Store free-form JSON blobs on nodes: rejected because it weakens validation and type safety.

## Decision 4: Seed the Load panel from a bundled example contract library merged with user-saved contracts

**Decision**: Introduce a curated example-contract source that is injected into the contract library on initial load while preserving user-created contracts and keeping example entries distinguishable.

**Rationale**: The current Load panel already reads from a contract library persisted in localStorage, so seeding examples through that boundary keeps the product flow stable. Bundled examples provide an onboarding path for the primitive-node model without requiring a new panel or backend service.

**Alternatives considered**:

- Replace the existing default kitchen-sink flow only: rejected because the spec calls for pre-populated examples in the Load panel, not just a starting canvas.
- Fetch example contracts remotely: rejected because the app is currently local-first and no backend is in scope.

## Decision 5: Add an explicit migration registry to the restore path and auto-migrate only exact legacy mappings

**Decision**: Handle legacy saved graphs through a dedicated migration layer in the restore path that converts deprecated node types only when the mapping to primitive nodes is exact; otherwise the graph loads safely with a remediation notice.

**Rationale**: The current restore flow silently drops unknown node types, which is unacceptable for a refactor that removes or renames nodes. A migration registry localizes compatibility logic, preserves user work where safe, and turns unsupported legacy content into visible corrective action instead of silent loss.

**Alternatives considered**:

- Drop incompatible legacy nodes with console warnings: rejected because it violates the clarified spec and risks hidden user data loss.
- Preserve deprecated node implementations indefinitely: rejected because it keeps broken abstractions alive and blocks the refactor’s product goal.

## Decision 6: Keep verification focused on deterministic unit/component tests plus one end-to-end seeded-example flow

**Decision**: Validate the feature with unit tests for node schemas, migration rules, and persistence; component tests for field editing and Load panel seeding; and Playwright coverage for loading a seeded example and editing list values.

**Rationale**: The codebase already uses Vitest, React Testing Library, and Playwright, and the constitution requires both test-first quality and UI/interaction coverage for UX changes. This mix covers the highest-risk behavior without expanding the feature into large integration infrastructure work.

**Alternatives considered**:

- Rely on manual validation only: rejected because migration and persistence regressions are too easy to miss.
- Add only E2E coverage: rejected because generator, migration, and serialization behavior need smaller deterministic tests as well.

## Decision 7: Keep the implementation inside the existing Bun + React + HTML/CSS frontend architecture

**Decision**: Implement the refactor inside the current Bun/Vite frontend app using React components, semantic HTML, and the existing CSS/Tailwind stack rather than introducing new framework layers or a backend service.

**Rationale**: The current repository structure, constitution, and user constraint all point to a frontend-only solution built with Bun, HTML, and CSS-backed UI primitives. This keeps the work aligned with the existing toolchain and avoids architectural churn that does not help the feature.

**Alternatives considered**:

- Introduce a dedicated form/state library for node editing: rejected for the initial feature because the current editing needs are narrow and can be handled with typed local component state.
- Build a backend-backed contract catalogue: rejected because the scope is local-first and no server interface is required.
