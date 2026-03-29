# 1. Quickstart: Turret Input Simulation

**Feature**: `018-simulate-turret-inputs`
**Date**: 2026-03-29

## 1.1. Prerequisites

- Frontier Flow running locally with `bun dev`
- A connected Sui wallet
- A published deployment on `testnet:stillness` or `testnet:utopia`
- At least one turret visible in the existing Authorize tab

## 1.2. Operator Flow

### 1.2.1. Open The Modal

1. Build and deploy a turret extension with the existing Visual → Build → Deploy flow.
2. Open the existing **Authorize** tab.
3. Wait for the owned turret roster to load.
4. Click the new simulation action on a turret row.

Expected result:

- The simulation modal opens for that turret.
- The header shows the selected turret identity and active deployment identity.
- Deployment and turret-bound values are already filled in.

### 1.2.2. Complete The Draft

1. Review the single candidate draft in the modal.
2. Accept or replace any remote suggestions for identity fields.
3. Adjust editable combat-state fields such as ratios, aggression, behavior, and base priority.

Expected result:

- Each field shows whether it came from authorize context, remote suggestion, default, or manual input.
- Missing identity fields offer remote suggestions before falling back to manual entry.

### 1.2.3. Run The Simulation

1. Click **Run Simulation**.
2. The UI validates the current deployment key and turret identity.
3. The app performs a non-mutating dev-inspect call against the deployed extension.

Expected result:

- Success renders a ranked result table.
- A valid empty list renders a dedicated empty-state message.
- Lookup, validation, or execution failures leave the current inputs intact.
- Re-running the same draft keeps the latest successful or failed outcome visible until the next execution finishes.

### 1.2.4. Rerun Or Refresh

1. Change one or more candidate fields.
2. Run the simulation again without closing the modal.
3. If the deployment or turret context changes underneath the modal, refresh or reopen it before rerunning.

Expected result:

- Repeated runs work for the same turret session.
- Stale context disables execution until the modal regains a valid snapshot.

## 1.3. Developer Verification

### 1.3.1. Unit And Component Tests

```bash
bun run test:run -- src/__tests__/turretSimulationCodec.test.ts
bun run test:run -- src/__tests__/turretSimulationExecution.test.ts
bun run test:run -- src/__tests__/turretSimulationQueries.test.ts
bun run test:run -- src/__tests__/turretSimulationCodec.test.ts
bun run test:run -- src/__tests__/turretSimulationExecution.test.ts
bun run test:run -- src/__tests__/TurretSimulationModal.test.tsx
bun run test:run -- src/__tests__/AuthorizeView.test.tsx
```

### 1.3.2. End-To-End Flow

```bash
bun run test:e2e -- tests/e2e/authorize.spec.ts
```

Recommended E2E assertions:

- row action opens the correct modal
- prefilled fields reflect the selected turret and deployment
- remote suggestion application updates multiple related fields
- successful run shows decoded results
- empty result is not treated as an error
- execution failures preserve the edited draft and show actionable details
- stale context blocks reruns until refresh

## 1.4. Reference Files

| File                                       | Purpose                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| `src/components/AuthorizeView.tsx`         | Authorize-page orchestration and modal ownership       |
| `src/components/AuthorizeTurretList.tsx`   | Row-action propagation from the turret roster          |
| `src/components/AuthorizeTurretItem.tsx`   | Turret row UI and simulation trigger                   |
| `src/components/TurretSimulationModal.tsx` | Modal UX, provenance indicators, and result rendering  |
| `src/hooks/useTurretSimulation.ts`         | Session, stale detection, and run lifecycle            |
| `src/utils/turretSimulationCodec.ts`       | BCS encode/decode helpers                              |
| `src/utils/turretSimulationExecution.ts`   | Dev-inspect transaction builder and parser             |
| `src/utils/turretSimulationQueries.ts`     | Remote suggestion lookups                              |
| `src/test/turretSimulationMocks.ts`        | GraphQL and dev-inspect test helpers                   |
| `scripts/debug-turret-priority-mcve.ts`    | Proven reference path for dev-inspect runtime behavior |
