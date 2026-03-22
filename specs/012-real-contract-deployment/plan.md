# Implementation Plan: Verified Contract Deployment

**Branch**: `012-real-contract-deployment` | **Date**: 2026-03-22 | **Spec**: `/home/scetrov/source/frontier-flow/specs/012-real-contract-deployment/spec.md`
**Input**: Feature specification from `/specs/012-real-contract-deployment/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Replace the simulated deployment flow with a real Sui publishing workflow that can deploy the current compiled contract to a project-controlled local validator and supported remote targets, persist confirmed deployment evidence, classify non-success outcomes accurately, and remain repeatable and testable. The implementation will preserve the existing typed deployment state model and UI surfaces, but move execution into a dedicated Sui deployment layer that handles publish, confirmation, and verification explicitly.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, generated Sui Move artifacts  
**Primary Dependencies**: `@mysten/sui`, `@mysten/dapp-kit`, `@zktx.io/sui-move-builder`, React 19, `@tanstack/react-query`, `@xyflow/react`  
**Storage**: In-memory React state for active attempts and session review history, browser localStorage for existing UI state only, maintained source data for published target references  
**Testing**: Vitest, Testing Library, Playwright, fake timers for deterministic state progression, project-controlled local-validator verification, real remote verification, repeatability reruns  
**Target Platform**: Browser SPA using Sui-compatible wallets plus Sui JSON-RPC targets for local validator and supported remote environments  
**Project Type**: Web application  
**Performance Goals**: Open progress UI immediately on launch, keep the deploy workflow responsive during signing/submission, surface confirmation evidence within 10 seconds of target confirmation becoming available, and preserve deterministic outcome classification across five repeated verification runs  
**Constraints**: No `any`; no fabricated success data in normal flows; success only after target confirmation; deployment and compilation remain separate lifecycle channels; WCAG 2.1 AA keyboard and status accessibility; no logged secrets; tests must avoid timing-based flakiness  
**Scale/Scope**: One feature spanning deployment execution, artifact binding, validation, evidence surfaces, accessibility requirements, and verification across three supported targets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Type Safety Above All**: PASS. The feature extends the existing typed deployment and artifact model and keeps Sui execution behind typed boundaries.
- **Visual Feedback is Paramount**: PASS. The feature preserves explicit deploy controls, staged progress, footer/status review, and Move-panel parity.
- **Domain-Driven Design**: PASS. Target language and deployment semantics remain aligned to EVE Frontier environments and extension workflows.
- **Predictable Code Generation**: PASS. Deployment consumes deterministic compiler output and does not weaken generation guarantees.
- **Security by Default**: PASS. Target prerequisites, reference validation, signing rejection, and confirmation evidence remain explicit non-success checks.
- **Test-First Quality**: PASS. The plan requires unit, UI, E2E, local-validator, remote verification, and repeatability coverage.
- **Accessibility & Inclusion**: PASS. The plan explicitly includes keyboard, focus, and status-surface accessibility in both implementation and verification.

### Post-Phase 1 Design Re-check

- **Type Safety Above All**: PASS. The data model defines typed deployment requests, attempts, evidence, and review entries.
- **Visual Feedback is Paramount**: PASS. The execution contract preserves ordered stages and visible non-success summaries.
- **Domain-Driven Design**: PASS. The design clearly separates local validator and Stillness/Utopia behavior while preserving user-facing target terminology.
- **Predictable Code Generation**: PASS. Target-specific dependency preparation stays isolated from unrelated compiler behavior.
- **Security by Default**: PASS. Success requires explicit confirmation; failed, cancelled, blocked, and unresolved attempts remain non-success outcomes.
- **Test-First Quality**: PASS. Quickstart and tasks explicitly cover project-controlled local verification, real remote verification, and repeatability.
- **Accessibility & Inclusion**: PASS. The plan now includes deploy-control accessibility, modal focus/live-region behavior, and accessible review surfaces.

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
│   ├── DeploymentTargetControl.tsx
│   └── MoveSourcePanel.tsx
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
└── __tests__/

tests/
└── e2e/
```

**Structure Decision**: Keep the feature inside the existing single-project React application. Extend the existing typed deployment state in `src/compiler/types.ts`, keep UI rendering in `src/components/`, orchestrate workflow in `src/hooks/useDeployment.ts` and `src/App.tsx`, isolate Sui execution in `src/deployment/`, and keep published target metadata in `src/data/`. Verification remains split between component and hook tests in `src/__tests__/` and workflow/browser verification in `tests/e2e/`.

## Complexity Tracking

No constitution violations currently require justification.

## Phase 0 Research Summary

- Real Sui execution should be isolated behind an executor rather than implemented through UI timers.
- The Sui transaction digest should be used as the confirmation reference for successful deployments.
- Published target reference bundles remain source-controlled for Stillness and Utopia, while local deployment uses local dependency wiring.
- Missing confirmation requires an explicit non-success outcome rather than fallback success semantics.
- Simulated deployment remains valid only in isolated test harnesses.
- Verification must cover both a project-controlled local validator and a real remote deployment workflow.

## Phase 1 Design Summary

- The data model defines typed deployment requests, attempts, evidence, progress, and review entries.
- The execution contract defines ordered stages, success evidence, and non-success classification for real Sui publishing.
- The package-reference contract defines source-controlled Stillness/Utopia reference requirements and local target exceptions.
- The quickstart defines local-validator verification, real remote verification, non-success validation, and repeatability reruns.
