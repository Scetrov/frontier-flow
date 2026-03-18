# Research: Graph To Move Generation

## Decision 1: Reuse the existing five-phase compiler pipeline as the implementation backbone

**Decision**: Implement graph-to-Move generation by extending the current `irBuilder -> validator -> sanitizer -> optimiser -> emitter -> moveCompiler` flow rather than creating a separate generation path.

**Rationale**: The repository already has typed IR, diagnostics, source maps, and a browser-side WASM compile wrapper. Reusing that path preserves determinism, keeps preview and build behavior aligned, and avoids duplicating graph validation logic.

**Alternatives considered**:
- Build a parallel graph-to-Move service layer outside `src/compiler/`: rejected because it would duplicate validation and emission rules.
- Emit Move directly from React Flow components: rejected because it would violate separation-of-concerns and constitution requirements for predictable code generation.

## Decision 2: Scope the first release to the current contract-aligned supported node subset

**Decision**: Treat only existing node types with approved generator coverage as supported for real contract emission in this feature.

**Rationale**: The spec requires real contract output and explicit failure for unsupported constructs. Bounding the first release to the contract-aligned subset keeps semantics trustworthy and prevents partial or misleading generation.

**Alternatives considered**:
- Attempt best-effort emission for all nodes: rejected because silent degradation would undermine compiler trust.
- Block the feature until every future node type is supported: rejected because it delays delivery of a usable, testable subset.

## Decision 3: Keep WASM compilation in-browser through `@zktx.io/sui-move-builder/lite`

**Decision**: Compile the generated Move package in the browser using the existing lazy-loaded WASM compiler wrapper.

**Rationale**: The repository already pins `@zktx.io/sui-move-builder` and exposes a lazy-init wrapper in `src/compiler/moveCompiler.ts`. This satisfies the feature requirement that the build path compile something real while preserving the current product workflow.

**Alternatives considered**:
- Move compilation to a backend service: rejected for this phase because the product already assumes in-browser compilation and the user explicitly wants the WASM Sui Move compiler path.
- Use a native CLI in development only: rejected because it would diverge from the runtime experience.

## Decision 4: Represent the generated contract as an in-memory package artifact

**Decision**: Define the generated output as an artifact containing `Move.toml`, a single source file under `sources/`, a source map, and the resulting compiled bytecode modules.

**Rationale**: This matches how the current WASM compiler wrapper consumes files, provides a stable boundary for testing, and keeps deployment persistence out of scope for this feature.

**Alternatives considered**:
- Store only raw Move source: rejected because the compiler consumes a package, not a bare source string.
- Persist compiled artifacts immediately: rejected because artifact storage belongs to later deployment work.

## Decision 5: Keep diagnostics split into pre-compile validation and post-compile error parsing

**Decision**: Preserve the current two-stage diagnostics model: fail unsupported or incomplete graphs before compilation, then map compiler output back to graph nodes using source-map entries.

**Rationale**: This gives users fast feedback for known graph issues while still supporting real compiler errors tied back to canvas elements.

**Alternatives considered**:
- Send every invalid graph through WASM compilation: rejected because it produces worse UX and noisier errors.
- Only show compiler errors without graph mapping: rejected because it weakens traceability and violates the goal of actionable feedback.

## Decision 6: Validate behavior with reference graphs, golden Move outputs, and mocked WASM compilation in unit tests

**Decision**: Expand the existing fixture-based compiler tests with supported graph references, unsupported graph cases, golden Move outputs, and mocked WASM compile results.

**Rationale**: The constitution requires deterministic code generation and critical-path coverage. Existing test directories, graph fixtures, Move fixtures, and mock compiler patterns already support this approach.

**Alternatives considered**:
- Rely mostly on E2E coverage: rejected because generator regressions need fast, fine-grained feedback.
- Run real WASM compilation in all unit tests: rejected because it is slower, harder to isolate, and already intentionally mocked in the repository.

## Decision 7: Defer Web Worker migration and artifact persistence, but keep them visible as follow-on work

**Decision**: Keep initial compilation on the current browser path and document Web Worker execution plus artifact persistence as follow-on design constraints rather than part of this feature scope.

**Rationale**: The feature goal is real graph-to-Move generation and compilation, not a redesign of runtime execution or deployment storage. The existing codebase already flags memory and responsiveness risk for larger graphs.

**Alternatives considered**:
- Bundle worker migration into this feature: rejected because it expands scope away from generation correctness.
- Ignore runtime constraints entirely: rejected because the plan should account for current browser/WASM limits.
