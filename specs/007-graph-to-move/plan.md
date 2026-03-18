# Implementation Plan: Graph To Move Generation

**Branch**: `007-graph-to-move` | **Date**: 2026-03-18 | **Spec**: `/home/scetrov/source/frontier-flow/specs/007-graph-to-move/spec.md`
**Input**: Feature specification from `/home/scetrov/source/frontier-flow/specs/007-graph-to-move/spec.md`

## Summary

Deliver real graph-to-Move generation by extending the existing five-phase compiler pipeline so supported canvas graphs emit a complete Move package and compile it in-browser through the WASM Sui Move compiler. The implementation will reuse the current IR, validation, sanitization, emission, source-map, and auto-compile infrastructure, while tightening node generator coverage, artifact boundaries, reference-case tests, and diagnostics so the build path always operates on generated contract output rather than placeholder code.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict) for the application and compiler pipeline; Move as generated target artifact  
**Primary Dependencies**: React 19, `@xyflow/react` 12.x, `@zktx.io/sui-move-builder` 0.2.8, `@mysten/sui`, `@mysten/dapp-kit`  
**Storage**: In-memory generated artifact and compilation result for this feature; no persistent artifact storage in scope  
**Testing**: Vitest 4.x, React Testing Library, Playwright, existing compiler fixtures and snapshot-style golden outputs  
**Target Platform**: Browser-based web application on desktop-class clients with in-browser WASM compilation  
**Project Type**: Frontend web application with embedded compiler pipeline  
**Performance Goals**: Deterministic graph-to-Move generation for supported graphs, code preview updates on standard graphs in under 1 second, and successful WASM compilation for small-to-medium supported graphs without blocking the overall workflow  
**Constraints**: Strict TypeScript with no `any`; deterministic code generation; sanitized graph-derived identifiers; critical code-generation paths at or above 90% coverage; no timing-based tests; current WASM compile runs in-browser and is memory-sensitive on large graphs  
**Scale/Scope**: One generated Move module package per active canvas; initial scope limited to the existing contract-aligned supported node subset and graphs up to roughly 50 nodes based on current browser/WASM risk guidance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Type Safety Above All**: PASS. Plan stays inside the existing strict TypeScript compiler pipeline and typed IR/contracts.
- **Visual Feedback is Paramount**: PASS. Diagnostics and compilation status continue to flow through existing preview/footer/build entry points rather than introducing opaque background behavior.
- **Domain-Driven Design**: PASS. Node support is defined by current EVE Frontier-aligned node categories and generator coverage.
- **Predictable Code Generation**: PASS. Deterministic IR ordering, sanitization, and stable generator output are explicit design requirements.
- **Security by Default**: PASS. Sanitization remains a mandatory phase before emission; unsupported or ambiguous graphs fail before compile.
- **Test-First Quality**: PASS. Unit, integration, and E2E coverage are planned around existing compiler fixtures, mocked WASM compilation, and fake timers.
- **Accessibility & Inclusion**: PASS. Existing user-facing build, preview, and diagnostics surfaces remain the delivery mechanism; no inaccessible alternate workflow is introduced.

**Post-Design Re-check**: PASS. Phase 1 artifacts keep the design within existing architecture boundaries and do not require constitution exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/007-graph-to-move/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── generated-artifact.md
│   └── pipeline-interface.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── compiler/
│   ├── pipeline.ts
│   ├── irBuilder.ts
│   ├── validator.ts
│   ├── sanitizer.ts
│   ├── optimiser.ts
│   ├── emitter.ts
│   ├── moveCompiler.ts
│   ├── errorParser.ts
│   ├── types.ts
│   └── generators/
├── hooks/
│   └── useAutoCompile.ts
├── components/
├── types/
│   └── nodes.ts
├── __fixtures__/
│   ├── graphs/
│   ├── move/
│   └── compiler/
└── __tests__/
    └── compiler/

tests/
└── e2e/
```

**Structure Decision**: Keep the existing single-app frontend structure. Graph-to-Move implementation lives in `src/compiler/` and `src/compiler/generators/`, browser orchestration stays in `src/hooks/` plus existing UI components, and verification remains split between `src/__tests__/compiler/` and `tests/e2e/`.

## Complexity Tracking

No constitution violations or extra justification entries are required for this plan.
