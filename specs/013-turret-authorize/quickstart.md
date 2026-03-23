# Quickstart: Turret Extension Authorization

**Feature**: 013-turret-authorize
**Date**: 2026-03-23

## Prerequisites

- Frontier Flow app running (`bun dev`)
- Sui wallet extension installed and connected (e.g. Sui Wallet, Ethos)
- At least one turret deployed on the selected testnet (Stillness or Utopia)
- A compiled and deployed smart contract (via the existing Visual → Build → Deploy workflow)

## Workflow

### 1. Deploy a Contract

1. Open Frontier Flow in the browser
2. Build your turret extension graph in the **Visual** tab
3. Click **Build** to compile
4. Select a testnet target (Stillness or Utopia) and click **Deploy**
5. Sign the transaction in your wallet
6. Wait for deployment confirmation — the footer will show "Deployed" with a package ID

### 2. Open the Authorize Tab

1. After successful deployment, the **Authorize** tab in the header becomes active (no longer greyed out)
2. Click the **Authorize** tab
3. The system fetches your turrets from the selected testnet via GraphQL

### 3. Select Turrets

1. The turret list displays all turrets owned by your connected wallet
2. Each turret shows its ID and any currently authorized extension
3. Check the checkbox next to each turret you want to authorize
4. Turrets already authorized with your current extension are pre-checked and disabled

### 4. Authorize

1. Click **Authorize Selected** to begin the authorization process
2. A progress dialog opens showing each selected turret
3. For each turret, the system:
   - Constructs the authorization transaction (borrow OwnerCap → authorize_extension → return OwnerCap)
   - Prompts your wallet for signing
   - Submits the transaction
   - Waits for on-chain confirmation
4. Each turret gets a green tick once confirmed
5. Failed turrets show an error but don't block remaining turrets
6. After all turrets are processed, a summary shows success/failure counts

### 5. Verify

1. Close the progress dialog
2. The turret list refreshes to show updated extension status
3. The deployment state persists — reload the page and the Authorize tab is still enabled

## Development

### Test flags

| Flag                         | Values           | Effect                                  |
| ---------------------------- | ---------------- | --------------------------------------- |
| `ff_mock_turrets`            | `1`              | Use mock turret data instead of GraphQL |
| `ff_mock_turret_count`       | `<number>`       | Number of mock turrets to generate      |
| `ff_mock_authorize_delay_ms` | `<ms>`           | Simulated delay per authorization       |
| `ff_mock_authorize_fail`     | `<turret-index>` | Force specific turret index to fail     |

### Running tests

```bash
# Unit tests
bun run test -- --reporter verbose src/__tests__/deploymentStateStorage.test.ts
bun run test -- --reporter verbose src/__tests__/turretQueries.test.ts
bun run test -- --reporter verbose src/__tests__/authorizationTransaction.test.ts

# Component tests
bun run test -- --reporter verbose src/__tests__/AuthorizeView.test.tsx
bun run test -- --reporter verbose src/__tests__/AuthorizationProgressModal.test.tsx

# E2E
bun run test:e2e -- tests/e2e/authorize.spec.ts
```

### Key files

| File                                            | Purpose                                  |
| ----------------------------------------------- | ---------------------------------------- |
| `src/components/Header.tsx`                     | Extended PrimaryView type, Authorize tab |
| `src/components/AuthorizeView.tsx`              | Main authorize view                      |
| `src/components/AuthorizeTurretList.tsx`        | Turret selection list                    |
| `src/components/AuthorizeTurretItem.tsx`        | Individual turret row                    |
| `src/components/AuthorizationProgressModal.tsx` | Per-turret progress dialog               |
| `src/hooks/useTurretList.ts`                    | GraphQL turret fetching                  |
| `src/hooks/useAuthorization.ts`                 | Sequential authorization execution       |
| `src/utils/deploymentStateStorage.ts`           | Deployment state localStorage            |
| `src/utils/turretQueries.ts`                    | GraphQL queries                          |
| `src/utils/authorizationTransaction.ts`         | Sui transaction construction             |
| `src/types/authorization.ts`                    | Domain types                             |
| `src/utils/uiStateStorage.ts`                   | Extended with "authorize" view           |
