# 1. Implementation Plan

**Branch**: `019-cache-package-refresh` | **Date**: 2026-04-01 | **Spec**: `specs/019-cache-package-refresh/spec.md`
**Input**: Feature specification from `specs/019-cache-package-refresh/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## 1.1 Summary

Eliminate deploy-grade compilation rate-limit failures for supported targets by treating bundled dependency snapshots as first-class build inputs. The plan is to regenerate and validate the shipped cache artifacts, materialize a complete local dependency tree from cached `resolvedDependencies` instead of only rebuilding `deps/world`, and reserve live GitHub fetches for explicit cache misses or invalid snapshot fallbacks.

## 1.2 Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, ES Modules  
**Primary Dependencies**: `@zktx.io/sui-move-builder/lite`, `@mysten/sui`, Vite, Bun, Vitest  
**Storage**: Static JSON snapshots in `public/deploy-grade-resolution-snapshots/`, runtime in-memory caches, existing localStorage metadata for deployment references  
**Testing**: Vitest via `bun run test:run`, targeted deployment/compiler unit tests  
**Target Platform**: Browser deploy-grade compilation path plus Bun script execution in local/CI environments  
**Project Type**: Web application with browser WASM compilation and build-time cache generation  
**Performance Goals**: Zero upstream package fetches on bundled-cache hits; keep warm deploy-grade compilation within the current 30-second target; no regression to authoring-time compile latency  
**Constraints**: Strict TypeScript without `any`, deterministic checked-in cache artifacts, no change to authoring-time compilation behavior, static asset delivery through Vite/Netlify, preserve deploy-grade linking semantics (`originalWorldPackageId`, sanitization, toolchain warnings)  
**Scale/Scope**: Two maintained remote targets today (`testnet:stillness`, `testnet:utopia`) plus future version tags; snapshot contents already include `MoveStdlib`, `Sui`, and `World` package payloads per shipped artifact

## 1.3 Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 1.3.1 Pre-Research Gate

- **Principle I - Type Safety Above All**: PASS. Planned changes are confined to typed snapshot parsing, validation, and file-map materialization in existing TypeScript modules.
- **Principle IV - Predictable Code Generation**: PASS. The feature does not alter graph-to-Move generation; it changes only how deploy-grade dependencies are sourced.
- **Principle V - Security by Default**: PASS. WASM integrity verification remains in place; cache-first behavior reduces exposure to repeated upstream fetches and does not weaken checksum requirements.
- **Principle VI - Test-First Quality**: PASS with required follow-through. The plan requires new coverage for cache-hit, cache-miss, invalid snapshot, and transitive dependency materialization flows.
- **Principle IX - Artifact Integrity & Lifecycle Separation**: PASS. The work stays inside deploy-grade compilation and preserves the separation from authoring-time compilation.

### 1.3.2 Post-Design Re-Check

- PASS. The design keeps deploy-grade provenance explicit: checked-in bundled snapshots remain upstream-derived artifacts, runtime materialization is deterministic, and fallback behavior is isolated to deploy-grade execution.

## 1.4 Project Structure

### 1.4.1 Documentation (this feature)

```text
specs/019-cache-package-refresh/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── deploy-cache-snapshot.md
│   └── preload-manifest.md
└── tasks.md
```

### 1.4.2 Source Code (repository root)

```text
public/
└── deploy-grade-resolution-snapshots/

scripts/
├── deploy-cache-packages.json
└── preload-deploy-cache.ts

src/
├── compiler/
│   ├── deployGradeCompiler.ts
│   ├── moveBuilderLite.ts
│   └── types.ts
├── data/
│   └── packageReferences.ts
├── deployment/
│   ├── dependencySnapshotLoader.ts
│   ├── executor.ts
│   └── worldSourceFetcher.ts
└── __tests__/
    ├── compiler/
    │   └── deployGradeCompiler.test.ts
    ├── deploymentExecutor.test.ts
    └── worldSourceFetcher.test.ts
```

**Structure Decision**: Keep the work inside the existing single-project web application layout. Runtime logic is concentrated in `src/compiler/` and `src/deployment/`, while the cache-generation pipeline stays in `scripts/` and the bundled artifacts remain under `public/`.

## 1.5 Phase 0 Research Summary

- Bundled snapshots already embed `MoveStdlib`, `Sui`, and `World` package sources inside `resolvedDependencies.dependencies`; the main runtime gap is that deploy-grade compilation currently extracts only `World` into `deps/world`.
- The shipped runtime cache path bypasses `fetchWorldSource()` on a snapshot hit, but the builder can still fetch transitive packages during build because the local file map is incomplete.
- The current snapshot schema is sufficient for this feature; the plan should prefer runtime materialization and preload validation over inventing a new storage format.

## 1.6 Phase 1 Design Direction

### 1.6.1 Runtime Design

- Extend the deploy-grade compiler to transform cached package snapshots into a complete local dependency tree instead of a `world`-only tree.
- Preserve the existing `world`-specific manifest rewriting and sanitization rules, but apply them within a generalized package-materialization path.
- Keep `dependencySnapshotLoader.ts` responsible for cache lookup and structural validation, not for compiler-specific path rewriting.
- Preserve the existing network-backed `fetchWorldSource()` and dependency-resolution path as an explicit fallback when no valid snapshot is available.

### 1.6.2 Cache Generation Design

- Keep `scripts/preload-deploy-cache.ts` as the source of truth for shipped snapshots.
- Add completeness validation to ensure every generated snapshot contains non-empty package payloads for the required package set.
- Regenerate and check in snapshots for the maintained tags after the runtime materialization logic is updated.

### 1.6.3 Testing Design

- Add unit coverage for package extraction/materialization from bundled snapshots, including transitive packages.
- Add executor coverage proving that cache-hit deploy-grade compilation does not invoke the network fetch path.
- Add preload validation coverage or script-level checks ensuring generated snapshots are incomplete only when the script fails.

## 1.7 Complexity Tracking

No constitution violations are expected. No complexity exception is required at planning time.
