# Quickstart: Functional DAG Contracts

## Goal

Implement deterministic DAG-to-contract generation for the current contract-aligned node model, with Vitest-first regression coverage strong enough to protect future generator changes.

## Prerequisites

- Bun installed
- Dependencies installed from the repository root
- Active branch: `010-functional-dag-contracts`

## Implementation Sequence

1. Formalize the supported reference DAG library and support matrix.
2. Tighten the compiler pipeline contract so the generated package artifact is the canonical output consumed by preview, compile, deploy, and deployment-status flows.
3. Make contract identity, traversal order, and trace ordering deterministic.
4. Add or refine readiness states for external dependency resolution and existing-turret deployment handoff.
5. Build deterministic Vitest coverage before expanding browser-level coverage.

## Deterministic Test Baseline

Run these commands from the repository root:

```bash
bun run typecheck
bun run test:run
```

Critical regression commands during implementation:

```bash
bun run test:run -- src/__tests__/compiler
bun run test:run -- src/__tests__/App.compilation.test.tsx
bun run test:run -- src/__tests__/MoveSourcePanel.test.tsx
```

Integration confidence gates:

```bash
bun run test:real-wasm
bun run test:e2e
```

## Required Test Strategy

- Use Vitest for canonical generator-phase tests and reference DAG regression cases.
- Prefer semantic assertions plus approved snapshots for generated artifacts.
- Use fake timers or injected clocks for compile timing and debounce behavior.
- Treat unsupported DAGs as first-class fixtures with expected blockers.
- Keep real-WASM validation as a smoke gate, not the primary regression surface.

## Done Criteria for Implementation

- Supported reference DAGs generate identical artifacts across repeated runs.
- Unsupported reference DAGs fail before compilation with explicit blockers.
- Preview/build/deploy/deployment-status workflows consume the same artifact boundary.
- Deployment status is available for existing turrets without implying full lifecycle automation.
- Critical-path compiler and validation coverage remains at or above project thresholds.

## Verification Notes

- FR-021: `bun run test:run -- src/__tests__/compiler/referenceDagValidation.test.ts` verifies the supported reference DAG inventory emits deterministic artifacts and blocks unsupported cases before compilation.
- FR-031: `bun run test:run -- src/__tests__/compiler src/__tests__/CompilationStatus.test.tsx src/__tests__/MoveSourcePanel.test.tsx` covers deterministic output, supported-versus-unsupported boundaries, and artifact traceability through the compiler and UI surfaces.
- FR-032: `bun run test:e2e -- generated-contracts.spec.ts authorization-readiness.spec.ts` confirms preview, build, and deployment-status flows consume the same artifact contract in the browser.
- Validation run on this branch: `bun run typecheck`, `bun run lint`, `bun run test:run`, `bun run build`, `bun run test:real-wasm`, and the targeted Playwright specs above passed.
- Real-WASM smoke validation now succeeds for the supported smart-turret reference DAG inventory after removing the unused explicit `Sui` dependency from generated package manifests.
