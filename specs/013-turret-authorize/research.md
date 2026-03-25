# Research: Turret Extension Authorization

**Feature**: 013-turret-authorize
**Date**: 2026-03-23

## R1: GraphQL Turret Query Pattern

**Decision**: Use the existing `postGraphQl` pattern from `characterProfile.ts` to query turret objects by owner address and type filter.

**Rationale**: The project already has a proven GraphQL querying pattern in `src/utils/characterProfile.ts` that handles error handling, abort signals, and response validation. The Sui GraphQL endpoint supports filtering objects by type, which matches the turret query requirement.

**Alternatives considered**:

- Direct Sui RPC (`getOwnedObjects`): Simpler but less flexible for filtering and field selection; GraphQL already established in codebase.
- REST API: No turret-specific REST endpoint exists in the EVE Frontier world API.

**Query pattern**:

```graphql
query Turrets($owner: SuiAddress!, $type: String!) {
  address(address: $owner) {
    objects(filter: { type: $type }, first: 100) {
      nodes {
        address
        contents {
          json
        }
      }
    }
  }
}
```

**Type**: `{worldPackageId}::turret::Turret` — world package ID from `PackageReferenceBundle`.

**Endpoint**: `https://graphql.testnet.sui.io/graphql` — already used by `characterProfile.ts`.

---

## R2: Authorization Transaction Construction

**Decision**: Follow the established EVE Frontier convention: borrow OwnerCap → authorize_extension → return OwnerCap, using the Sui TypeScript SDK `Transaction` builder.

**Rationale**: The pattern is documented in `world-contracts/ts-scripts/builder_extension/authorize-turret.ts` and is the canonical way to authorize turret extensions. The project already uses `@mysten/sui/transactions` for deployment.

**Alternatives considered**:

- Batch multiple turrets in one transaction: Not feasible because each `borrow_owner_cap` returns a unique receipt that must be consumed before borrowing again.
- Parallel transactions: Rejected due to potential OwnerCap conflicts.

**Transaction structure** (per turret):

```typescript
// 1. Borrow OwnerCap
const [ownerCap, receipt] = tx.moveCall({
  target: `${worldPackageId}::character::borrow_owner_cap`,
  typeArguments: [`${worldPackageId}::turret::Turret`],
  arguments: [tx.object(characterId), tx.object(ownerCapId)],
});

// 2. Authorize extension
tx.moveCall({
  target: `${worldPackageId}::turret::authorize_extension`,
  typeArguments: [`${deployedPackageId}::${moduleName}::TurretAuth`],
  arguments: [tx.object(turretId), ownerCap],
});

// 3. Return OwnerCap
tx.moveCall({
  target: `${worldPackageId}::character::return_owner_cap`,
  typeArguments: [`${worldPackageId}::turret::Turret`],
  arguments: [tx.object(characterId), ownerCap, receipt],
});
```

**Critical dependency**: The `characterId` and `ownerCapId` must be resolved before building the transaction. `characterId` is derived from `objectRegistryId` (in PackageReferenceBundle). `ownerCapId` must be fetched per-turret via GraphQL or Sui RPC.

---

## R3: Wallet Signing Integration

**Decision**: Reuse the existing signing pattern from `useDeployment.ts` — `signTransaction` from `@mysten/wallet-standard` → `suiClient.executeTransactionBlock`.

**Rationale**: The codebase already has a proven wallet signing flow with comprehensive error classification (wallet-rejected, confirmation-timeout, execution-error). Reusing this avoids introducing a parallel signing path.

**Alternatives considered**:

- `useSignAndExecuteTransaction` hook from dapp-kit: Simpler API but less control over error classification; existing codebase uses the lower-level pattern for richer error handling.

**Wallet hooks used**: `useCurrentAccount`, `useCurrentWallet`, `useSuiClient` from `@mysten/dapp-kit`.

**Error classification**:

- `Rejected|Denied|Cancelled` → outcome "cancelled"
- Confirmation timeout → outcome "unresolved"
- Other errors → outcome "failed"

---

## R4: Deployment State Persistence

**Decision**: Introduce a new localStorage key `frontier-flow:deployment` to persist deployment state independently from the contract library and UI state.

**Rationale**: The contract library (`frontier-flow:contracts`) stores graph topology — it should not be polluted with deployment metadata. The UI state (`frontier-flow:ui-state`) stores view preferences. Deployment state (package ID, target, digest, module name) is a separate concern.

**Alternatives considered**:

- Extend `frontier-flow:contracts` with deployment fields: Rejected because it couples deployment lifecycle with contract storage, and the contract library schema is already at version 2 with defined semantics.
- Extend `frontier-flow:ui-state`: Rejected because deployment state is not a UI preference.
- Session storage: Rejected because user explicitly wants persistence across reloads.

**Stored shape**:

```typescript
interface StoredDeploymentState {
  readonly version: 1;
  readonly packageId: string;
  readonly moduleName: string;
  readonly targetId: DeploymentTargetId;
  readonly transactionDigest: string;
  readonly deployedAt: string; // ISO 8601
  readonly contractName: string; // for stale detection
}
```

**Validation on load**: Compare `contractName` and `targetId` with current state; discard if mismatched.

---

## R5: Turret Selector UI Pattern

**Decision**: Reuse the `NumericOptionEditor` checkbox pattern from `NodeFieldEditor.tsx` — specifically the `ff-node-field-editor__choice` / `ff-node-field-editor__checkbox` / `ff-node-field-editor__checkbox-indicator` CSS classes and the label+hidden-checkbox+custom-indicator pattern.

**Rationale**: This is the existing "tribe/ship selector" style referenced in the spec. The component uses semantic `<label>` + `<input type="checkbox">` + custom indicator, which is accessible and follows the project's design language.

**Alternatives considered**:

- Custom radio buttons: Not appropriate; multiple turrets can be selected simultaneously.
- Plain HTML checkboxes: Inconsistent with the project's sci-fi design aesthetic.

**Pattern**:

```tsx
<label className={`ff-turret-item${isSelected ? " is-selected" : ""}`}>
  <input type="checkbox" className="ff-turret-item__checkbox" />
  <span className="ff-turret-item__checkbox-indicator" />
  <span className="ff-turret-item__label">{turretId}</span>
  {extensionBadge}
</label>
```

---

## R6: PrimaryView Extension

**Decision**: Extend `PrimaryView` from `"visual" | "move"` to `"visual" | "move" | "authorize"`. Correspondingly extend `StoredPrimaryView` in `uiStateStorage.ts`.

**Rationale**: The existing pattern uses a union type in `Header.tsx` and mirrors it in `uiStateStorage.ts`. Adding a third literal is the minimal change to support the new tab.

**Alternatives considered**:

- Separate routing system (react-router): Over-engineering for a three-tab app. The existing pattern is simple and works well.
- Keeping authorize as a sub-view of move: Doesn't match user expectation of a top-level tab.

**Changes required**:

- `Header.tsx`: Extend `PrimaryView`, add third `NavigationButton`, handle disabled state
- `uiStateStorage.ts`: Extend `StoredPrimaryView`, update `parseUiState` validation
- `App.tsx`: Add `AuthorizeView` rendering branch in `AppMainContent`

---

## R7: Authorization Progress Modal

**Decision**: Create a new `AuthorizationProgressModal` component modelled after `DeploymentProgressModal` but tracking per-turret status instead of per-stage status.

**Rationale**: The deployment modal tracks a single transaction through stages (validating → preparing → signing → submitting → confirming). The authorization modal needs to track multiple turrets, each with their own status. The visual patterns (backdrop, panel, focus trap, aria attributes) should be reused.

**Alternatives considered**:

- Reuse `DeploymentProgressModal` directly: Not feasible because the data shape is fundamentally different (stages vs. turrets).
- Inline progress in the turret list: Less clear separation between selection and execution phases; modal pattern matches the existing UX convention.

**Turret status states**: `"pending" | "submitting" | "confirming" | "confirmed" | "failed" | "warning"`

---

## R8: OwnerCap Resolution

**Decision**: Query OwnerCap for each turret via GraphQL before constructing the authorization transaction. The OwnerCap is stored as a dynamic field on the Character object.

**Rationale**: The `authorize-turret.ts` reference implementation uses a `getOwnerCap` helper that queries the OwnerCap by turret ID. The OwnerCap must be resolved at transaction construction time.

**Alternatives considered**:

- Fetch all OwnerCaps in a single batch query: Possible optimization but adds GraphQL complexity; start with per-turret resolution.
- Assume OwnerCap ID format: Not safe; OwnerCap IDs are dynamic.

**Pattern**: Query owned objects of type `OwnerCap<Turret>` filtered by the turret's object ID.
