# Implementation Plan: Verified Contract Deployment

**Branch**: `012-real-contract-deployment` | **Date**: 2026-03-22 | **Spec**: `/home/scetrov/source/frontier-flow/specs/012-real-contract-deployment/spec.md`
**Input**: Feature specification from `/specs/012-real-contract-deployment/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the current simulated deployment scheduler with a real Sui deployment flow that can publish the compiled package to a local validator or supported remote targets, capture target-confirmed evidence, and preserve deterministic, testable outcome handling. The implementation should keep the existing typed deployment state machine and UI surfaces, but move actual submission and confirmation into an injected deployment executor that returns real package identifiers and transaction digests.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, generated Sui Move artifacts  
**Primary Dependencies**: `@mysten/sui`, `@mysten/dapp-kit`, `@zktx.io/sui-move-builder`, React 19, `@tanstack/react-query`, `@xyflow/react`  
**Storage**: In-memory React state for active attempts, session-visible review history in deployment state, browser localStorage for existing UI state only, maintained source files for published target reference data  
**Testing**: Vitest, Testing Library, Playwright, fake timers for orchestrated stages, script-backed real WASM verification, local-validator integration verification for Sui publish flow  
**Target Platform**: Browser SPA using Sui-compatible wallets and Sui JSON-RPC targets for local validator and supported testnet environments
**Project Type**: Web application  
**Performance Goals**: Start the progress surface immediately after launch, keep UI responsive during signing/submission, classify outcome within 10 seconds of confirmation data becoming available, and preserve repeatable outcome classification across five consecutive verification runs  
**Constraints**: No `any`; no fabricated success data in normal flows; success only after confirmed remote or local publish result; deployment and compilation remain separate lifecycle channels; WCAG 2.1 AA for controls and status surfaces; secrets must not be logged; unit tests must avoid real timing waits  
**Scale/Scope**: One feature spanning deployment orchestration, artifact binding, target validation, confirmation evidence, header/footer/panel status surfaces, and verification coverage for three supported targets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Type Safety Above All**: PASS. The feature extends existing typed deployment and artifact models and will keep Sui execution behind typed service boundaries.
- **Visual Feedback is Paramount**: PASS. Real deployment still preserves explicit progress stages, footer status, and Move-panel review surfaces.
- **Domain-Driven Design**: PASS. Target names and follow-up messaging stay aligned to EVE Frontier deployment environments and extension workflows.
- **Predictable Code Generation**: PASS. Deployment consumes deterministic compiler output and does not weaken generation determinism.
- **Security by Default**: PASS. The plan requires validation of published package references, wallet access, and confirmation evidence before success classification.
- **Test-First Quality**: PASS. The design requires deterministic unit coverage plus controlled local-validator and remote verification flows.
- **Accessibility & Inclusion**: PASS. Existing keyboardable controls/modal surfaces remain the primary interaction model and must continue to expose readable status updates.

### Post-Phase 1 Design Re-check

- **Type Safety Above All**: PASS. The data model and contracts introduce typed deployment request, evidence, and unresolved-confirmation semantics.
- **Visual Feedback is Paramount**: PASS. The contracts retain stage-based progress and persistent outcome review after modal dismissal.
- **Domain-Driven Design**: PASS. Design distinguishes local validator publish from Stillness/Utopia publish while keeping user-facing target language stable.
- **Predictable Code Generation**: PASS. The design isolates target-specific dependency resolution without mutating unrelated compiler behavior.
- **Security by Default**: PASS. Success requires target confirmation, while missing prerequisites, signing rejection, and confirmation timeout remain explicit non-success outcomes.
- **Test-First Quality**: PASS. Quickstart and research define repeatable local and remote verification paths with isolated mocks only in test harnesses.
- **Accessibility & Inclusion**: PASS. UI contract preserves keyboard operation, focus-safe dismissal, and readable error/success summaries.

## Project Structure

### Documentation (this feature)

```text
specs/012-real-contract-deployment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── deployment-execution-contract.md
│   └── package-reference-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx
├── compiler/
│   ├── emitter.ts
│   └── types.ts
├── components/
│   ├── CompilationStatus.tsx
│   ├── DeploymentProgressModal.tsx
│   └── DeploymentTargetControl.tsx
├── data/
│   ├── deploymentTargets.ts
│   └── packageReferences.ts
├── deployment/
│   ├── executor.ts
│   ├── publishLocal.ts
│   ├── publishRemote.ts
│   └── confirmation.ts
├── hooks/
│   └── useDeployment.ts
├── utils/
│   └── deploymentValidation.ts


src/__tests__/
├── CompilationStatus.deployment-popup.test.tsx
├── DeploymentProgressModal.test.tsx
├── DeploymentTargetControl.test.tsx
├── useDeployment.blockers.test.ts
├── useDeployment.progress.test.ts
└── useDeployment.success.test.ts

tests/
└── e2e/
```

**Structure Decision**: Keep the feature inside the existing single-project React application. Reuse the typed deployment model in `src/compiler/types.ts`, extend orchestration in `src/hooks/useDeployment.ts`, preserve current UI surfaces in `src/components/`, keep published target data in `src/data/`, and add a dedicated Sui deployment execution module under `src/` so wallet/RPC execution stays isolated from presentation logic. Verification remains split between `src/__tests__/` and `tests/e2e/`.

## Complexity Tracking

No constitution violations currently require justification.

## Phase 0 Research Summary

- Real Sui publish execution should be isolated behind a deployment executor rather than embedded in UI timers.
- Local deployment should resolve `world` through local dependency wiring, while Stillness/Utopia continue to use maintained published package reference data.
- Successful deployments should store both the package ID and the Sui transaction digest as confirmation evidence.
- An explicit `unresolved` outcome is required when submission succeeds but confirmation cannot be completed within the bounded verification window.
- Existing test flags may remain only inside isolated test harnesses; normal user deployment must never surface simulated success data.

## Phase 1 Design Summary

- The data model adds typed request, evidence, and unresolved-confirmation entities without weakening existing deployment typing.
- The contracts define the execution boundary for real Sui deployment and the maintained package-reference requirements for published targets.
- The quickstart defines repeatable local-validator and remote-target verification steps, including how to validate blocked, cancelled, failed, unresolved, and successful outcomes.
