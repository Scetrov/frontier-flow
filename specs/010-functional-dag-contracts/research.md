# Phase 0 Research: Functional DAG Contracts

## Decision 1: Use an explicit supported-DAG matrix anchored to DAG fixtures derived from `Scetrov/smart-turrets`

**Decision**: Define support through a curated reference DAG library derived from the contracts in `Scetrov/smart-turrets`, using [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md) as the concrete example catalog for the current seed strategies, where every case is marked `supported` or `unsupported`, with an expected functional outcome or expected blocking diagnostic.

**Rationale**: The spec requires deterministic behavior and clear failure boundaries. The contract examples document the concrete smart-turrets seed behaviors, compile-time knobs, and validation expectations that the generated DAGs need to preserve. An explicit support matrix prevents silent broadening of scope, keeps planning and implementation aligned, and turns regression testing into a fixed contract rather than an informal expectation.

**Alternatives considered**:

- Infer support dynamically from whatever generator code exists at runtime.
- Treat all structurally valid DAGs as implicitly supported.

## Decision 2: Treat the generated contract artifact as the single source of truth across preview, compile, deploy, and authorization workflows

**Decision**: All downstream workflows should consume the same generated package artifact for the active DAG, including preview panels, compile/build actions, deploy preparation, and extension authorization readiness for an existing turret.

**Rationale**: This removes divergence between what users inspect and what the compiler or deploy flow actually uses. It also makes deterministic tests simpler because a single artifact boundary can be asserted across workflows.

**Alternatives considered**:

- Keep separate preview-only and compile-only representations.
- Keep placeholder deploy artifacts while generation matures.

## Decision 3: Enforce determinism through canonical ordering, stable naming, and dual semantic plus snapshot testing

**Decision**: The pipeline should formalize canonical graph traversal, stable identifier derivation, normalized artifact layout, and Vitest regression coverage that combines semantic assertions with approved snapshots.

**Rationale**: Snapshot-only testing is too brittle, and semantic-only testing can miss output drift that matters to users and deployment workflows. Combining both yields strong regression protection for a deterministic compiler surface.

**Alternatives considered**:

- Bytecode-only comparison.
- Semantic assertions only.

## Decision 4: Scope "fully functional" to existing-turret authorization readiness, not full turret lifecycle automation

**Decision**: The feature includes compile-ready artifacts and readiness for extension registration or authorization against an existing turret, while explicitly excluding anchor, online, offline, and other full world-lifecycle automation.

**Rationale**: This matches the accepted clarification and keeps the feature centered on DAG-generated contract functionality without expanding into still-uncertain lifecycle orchestration from external platform docs.

**Alternatives considered**:

- Stop at compile-ready artifacts.
- Include full turret lifecycle automation.

## Decision 5: Handle external world-package integration through explicit dependency readiness states and fail-safe diagnostics

**Decision**: The design should model dependency resolution for world-package compilation and authorization prerequisites as explicit readiness states that can block compilation or authorization preparation with structured diagnostics.

**Rationale**: External package addresses, dependency manifests, and authorization details are not fully settled by the project docs. Explicit readiness states let the system remain deterministic and user-safe even when those inputs are unavailable.

**Alternatives considered**:

- Hardcode a single world dependency strategy in the plan.
- Ignore dependency readiness until implementation.

## Decision 6: Make Vitest the primary regression surface while still compiling every supported reference DAG before release

**Decision**: Use Vitest for the bulk of deterministic technical testing, including pipeline phase tests, fixture-based reference DAG tests, semantic validations, and snapshot approval tests. Every supported reference DAG must still compile before release, while Playwright remains focused on end-to-end workflow confidence and `test:real-wasm` remains an integration surface rather than the only compile gate.

**Rationale**: The user explicitly requires deterministic technical tests to avoid regressions, and the constitution treats code generation as a critical path requiring very high automated coverage. Vitest gives the fastest feedback loop and the best fit for these compiler-focused guarantees, while release confidence still requires successful compilation for every supported DAG in the inventory.

**Alternatives considered**:

- Rely primarily on Playwright journeys.
- Rely primarily on real-WASM compilation.
