# Implementation Plan: Bytecode Deployment Targets

**Branch**: `011-bytecode-deployment` | **Date**: 2026-03-21 | **Spec**: `/home/scetrov/source/frontier-flow/specs/011-bytecode-deployment/spec.md`
**Input**: Feature specification from `/home/scetrov/source/frontier-flow/specs/011-bytecode-deployment/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a first-class deployment workflow for compiled Move bytecode that lets users choose `local`, `testnet:stillness`, or `testnet:utopia` next to the existing Build control, validates deployment blockers before submission, routes deployment through the existing generated-artifact pipeline, surfaces deployment results and errors through the existing footer/status popup, and opens a dedicated progress modal for in-flight deployment stages. The implementation should extend the current artifact deployment metadata and wallet integration rather than introduce a parallel deployment state model disconnected from compilation results.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), React 19, generated Sui Move artifacts  
**Primary Dependencies**: React 19, `@mysten/dapp-kit`, `@mysten/sui`, `@tanstack/react-query`, Tailwind CSS 4, `@xyflow/react`, `@zktx.io/sui-move-builder`  
**Storage**: In-memory React state for active deployment progress; browser localStorage for existing UI state and optionally persisted target preference; generated artifact remains the source of truth for deployment metadata  
**Testing**: Vitest, Testing Library, Playwright, existing hook/component test scaffolds, fake timers for staged workflow timing  
**Target Platform**: Browser-based SPA on desktop and mobile, connecting to Sui-compatible wallets and local or testnet deployment endpoints  
**Project Type**: Web application  
**Performance Goals**: Deployment modal opens immediately on start; first visible progress update within 2 seconds; footer/status surface updates within 200ms of deployment state changes; no regression to existing compile idle/build responsiveness  
**Constraints**: Strict TypeScript with no `any`; compilation and deployment remain separate lifecycle channels per ADR-008; WCAG 2.1 AA keyboard-accessible controls and modal; no logged secrets; no hard-coded environment assumptions outside maintained resource data; tests must avoid real timing waits when unit-level orchestration can use fake timers  
**Scale/Scope**: Single-page feature spanning header controls, canvas/workspace orchestration, footer/status surfaces, generated artifact metadata, resource data, wallet-backed signing, and session-scoped deployment result review for 3 supported deployment targets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Type Safety Above All**: PASS. The feature will extend the existing typed artifact and status models rather than introduce untyped deployment payloads.
- **Visual Feedback is Paramount**: PASS. The core UX requires an explicit target selector, progress modal, and footer/status popup updates for every deployment phase.
- **Domain-Driven Design**: PASS. UI copy and target naming stay aligned with EVE Frontier environments: `Stillness`, `Utopia`, and local development.
- **Predictable Code Generation**: PASS. Deployment consumes an already compiled artifact and does not alter deterministic generation rules.
- **Security by Default**: PASS. Blockers and wallet approval states are surfaced without exposing secrets; target package references are validated before use.
- **Test-First Quality**: PASS. The plan requires unit, integration, and Playwright coverage for new workflow states and blocker handling.
- **Accessibility & Inclusion**: PASS. The deploy control, dropdown behavior, status popup, and modal will require semantic roles, keyboard operation, and live region updates.

### Post-Phase 1 Design Re-check

- **Type Safety Above All**: PASS. Data-model and contract artifacts define typed deployment target, progress, and result structures.
- **Visual Feedback is Paramount**: PASS. Design keeps deployment as a peer lifecycle surface and adds explicit progress UI rather than background-only async work.
- **Domain-Driven Design**: PASS. Target metadata and messaging remain anchored in EVE Frontier package references and turret-extension deployment language.
- **Predictable Code Generation**: PASS. Design preserves the existing generated-artifact handoff boundary and avoids mutating compile output during deployment.
- **Security by Default**: PASS. Design treats missing or stale package references, disconnected wallets, and rejected signatures as blockers with safe failure states.
- **Test-First Quality**: PASS. Quickstart and contracts define required unit/E2E coverage paths before implementation.
- **Accessibility & Inclusion**: PASS. Modal and popup contracts require keyboard dismissal, focus management, and readable stage/error messaging.

## Project Structure

### Documentation (this feature)

```text
specs/011-bytecode-deployment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── deployment-ui-contract.md
│   └── package-reference-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── App.tsx
├── main.tsx
├── compiler/
│   ├── generators/
│   └── types.ts
├── components/
│   ├── CanvasWorkspace.tsx
│   ├── CompilationStatus.tsx
│   ├── Header.tsx
│   ├── MoveSourcePanel.tsx
│   └── WalletStatus.tsx
├── data/
├── hooks/
│   └── useAutoCompile.ts
└── __tests__/

tests/
└── e2e/
```

**Structure Decision**: Keep the feature inside the existing single-project React application. Extend artifact and deployment typing under `src/compiler/`, place orchestration in `src/hooks/` and app/workspace wiring in `src/App.tsx` plus `src/components/`, store maintained target/package references in `src/data/`, and cover behavior through existing unit tests under `src/__tests__/` and workflow tests under `tests/e2e/`.

## Complexity Tracking

No constitution violations currently require justification.

