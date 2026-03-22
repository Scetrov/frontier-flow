# Research: Bytecode Deployment Targets

## Decision 1: Keep deployment lifecycle metadata on the generated artifact, but own in-flight modal progress outside the footer component

**Decision**: Extend the existing generated artifact deployment metadata for target, blocker, stage, and package-result details, while keeping active progress-modal state in app-level deployment orchestration rather than inside the footer/status component.

**Rationale**: ADR-008 requires compilation and deployment to stay as separate lifecycle channels while still using the artifact as the source of truth for deployment readiness. `CompilationStatus.tsx` already renders a deployment indicator from `artifact.deploymentStatus`, but it is not the right place to own a long-running modal or wallet-driven async orchestration. `CanvasWorkspace.tsx` already emits compilation state upward, so `App.tsx` is the correct layer to own cross-surface deployment progress that must survive view changes and modal dismissal.

**Alternatives considered**:

- Store all deployment state inside `CompilationStatus.tsx`. Rejected because the footer would become the orchestration owner for async wallet submission and modal lifetime.
- Fold deployment into `useAutoCompile`. Rejected because compilation and deployment must remain separate lifecycle channels and have different triggers, blockers, and test boundaries.

## Decision 2: Model deployment targets explicitly and validate against maintained target resource data

**Decision**: Introduce a typed deployment target model for `local`, `testnet:stillness`, and `testnet:utopia`, backed by maintained package-reference data for Stillness and Utopia derived from the published EVE Frontier resources page.

**Rationale**: The feature spec depends on stable target labels and environment-specific package identifiers. A typed target model avoids magic strings spread through components and tests. A maintained data module gives deterministic behavior in the app and test suite without introducing runtime scraping or network dependence.

**Alternatives considered**:

- Fetch the EVE Frontier docs at runtime. Rejected because deployment validation would become network-dependent and fragile to documentation markup changes.
- Hard-code package IDs inline in UI components. Rejected because it scatters target knowledge and makes updates error-prone.

## Decision 3: Reuse existing status surfaces and add a dedicated deployment modal instead of inventing a new notification system

**Decision**: Extend `Header.tsx` with the deploy target selector and deploy action, extend `CompilationStatus.tsx` and `MoveSourcePanel.tsx` with richer deployment summaries and errors, and add a dedicated deployment progress modal for stage-based feedback.

**Rationale**: The current app already has a Build button in the header, a footer status surface with deployment-specific expansion support, and artifact preview metadata in `MoveSourcePanel.tsx`. Reusing those surfaces preserves product consistency and satisfies the requirement that deployment errors appear in the status popup, while the modal handles the separate need for progress tracking.

**Alternatives considered**:

- Add a separate top-level deployment page or side panel. Rejected because the feature is part of the existing graph authoring loop and must stay adjacent to Build.
- Merge deployment error details into compile diagnostics only. Rejected because ADR-008 explicitly separates deployment lifecycle from compilation status.

## Decision 4: Keep wallet and network integration inside dapp-kit root providers, but map deployment targets in feature-level orchestration

**Decision**: Continue using the root `SuiClientProvider` and `WalletProvider` from `main.tsx`, and add deployment-specific target validation, endpoint selection, and signing orchestration in a dedicated deployment hook rather than in the wallet header component.

**Rationale**: The wallet infrastructure already exists and is tested. The feature needs deployment-target awareness, blocker detection, and package-reference validation, not a new general wallet-management experience. Target-specific behavior belongs in deployment orchestration so it can combine artifact readiness, wallet state, and package metadata.

**Alternatives considered**:

- Add an independent network selector separate from deployment target. Rejected because the spec defines deployment targets as the user-facing choice and a second selector would create ambiguity.
- Push deployment logic into `WalletStatus.tsx`. Rejected because wallet display and deployment orchestration are separate responsibilities.

## Decision 5: Test the workflow at three layers: UI controls, orchestration hook, and end-to-end deployment flow

**Decision**: Add unit tests for header target selection and disabled states, unit tests for deployment status rendering and hook orchestration, and Playwright coverage for modal/progress/popup behavior.

**Rationale**: The constitution requires test-first quality, UI coverage for UX changes, and fake timers instead of brittle timing assertions. Existing tests already cover `Header`, `WalletStatus`, `CompilationStatus`, `MoveSourcePanel`, and `useAutoCompile`, so the deployment feature should follow those patterns rather than rely on a single broad integration test.

**Alternatives considered**:

- E2E-only coverage. Rejected because blocker matrices and stage transitions would be hard to exhaustively test and debug.
- Unit-only coverage. Rejected because target selection, wallet dialogs, modal focus, and status popup interactions need browser-level confirmation.

## Decision 6: Treat deployment blockers as first-class states, not generic errors

**Decision**: Represent stale artifacts, missing wallets, invalid target package references, unreachable endpoints, rejected signatures, and confirmation failures as explicitly classified deployment outcomes.

**Rationale**: The spec requires user-actionable blocker messaging and the ability to distinguish pre-flight blockers from cancellations and runtime failures. Existing deployment status fields already include `blockedReasons` and `nextActionSummary`, which provides a natural extension point for this classification.

**Alternatives considered**:

- Collapse all failures into a single `error` string. Rejected because the status popup and progress modal need stage-specific, user-actionable messaging.
- Treat cancellation as a failure. Rejected because the spec explicitly requires cancellations to remain distinct from unsuccessful deployments.
