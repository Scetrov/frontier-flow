# Data Model: Turret Extension Authorization

**Feature**: 013-turret-authorize
**Date**: 2026-03-23

## Entities

### StoredDeploymentState

Persists the result of a successful contract deployment to localStorage so the Authorize tab can function across page reloads.

| Field               | Type                 | Description                                                              |
| ------------------- | -------------------- | ------------------------------------------------------------------------ |
| `version`           | `1` (literal)        | Schema version for forward compatibility                                 |
| `packageId`         | `string`             | Sui package ID of the deployed contract                                  |
| `moduleName`        | `string`             | Move module name within the package                                      |
| `targetId`          | `DeploymentTargetId` | Deployment target (`"local"`, `"testnet:stillness"`, `"testnet:utopia"`) |
| `transactionDigest` | `string`             | On-chain transaction digest confirming deployment                        |
| `deployedAt`        | `string`             | ISO 8601 timestamp of deployment                                         |
| `contractName`      | `string`             | Name of the contract in the contract library (for stale detection)       |

**Validation rules**:

- On load, `contractName` must match the active contract name in the contract library
- On load, `targetId` must match the currently selected deployment target
- If either validation fails, the stored state is discarded

**State transitions**: Created on successful deployment → Loaded on app start → Discarded when contract name or target changes → Deleted when user deploys a new version (replaced)

**Relationships**: Gates the `AuthorizeView` — the view is only accessible when a valid `StoredDeploymentState` exists.

---

### TurretInfo

Represents a turret fetched from the Sui GraphQL endpoint. Read-only view model — never written back to chain from this entity.

| Field              | Type                          | Description                                                                        |
| ------------------ | ----------------------------- | ---------------------------------------------------------------------------------- |
| `objectId`         | `string`                      | Sui object address of the turret                                                   |
| `displayName`      | `string \| null`              | Human-readable name if available, otherwise null (fall back to truncated objectId) |
| `currentExtension` | `TurretExtensionInfo \| null` | Currently authorized extension, or null if none                                    |

**Validation rules**:

- `objectId` must be a valid Sui address (0x-prefixed hex)
- List is fetched fresh each time the Authorize tab is opened or refreshed

**Relationships**: Each turret may have zero or one `TurretExtensionInfo`. A turret is selected (via checkbox) to create an `AuthorizationTarget`.

---

### TurretExtensionInfo

Describes the currently authorized extension on a turret, if any.

| Field                 | Type      | Description                                                     |
| --------------------- | --------- | --------------------------------------------------------------- |
| `packageId`           | `string`  | Package ID of the authorized extension                          |
| `moduleName`          | `string`  | Module name within the extension package                        |
| `typeName`            | `string`  | Fully qualified auth type (e.g. `0xabc::my_module::TurretAuth`) |
| `isCurrentDeployment` | `boolean` | Whether this extension matches the currently deployed contract  |

**Validation rules**:

- `isCurrentDeployment` is computed by comparing `packageId` + `moduleName` against the active `StoredDeploymentState`

---

### AuthorizationTarget

A turret selected by the user for authorization. Created when the user checks a turret's checkbox and confirms the selection.

| Field               | Type                        | Description                                 |
| ------------------- | --------------------------- | ------------------------------------------- |
| `turretObjectId`    | `string`                    | Sui object ID of the turret                 |
| `ownerCapId`        | `string`                    | Resolved OwnerCap object ID for this turret |
| `status`            | `AuthorizationTurretStatus` | Current status in the authorization process |
| `transactionDigest` | `string \| null`            | Transaction digest once submitted           |
| `errorMessage`      | `string \| null`            | Error description if authorization failed   |

**State transitions** (discriminated union):

```text
"pending" → "submitting" → "confirming" → "confirmed"
                                        → "warning" (timeout)
              → "failed" (wallet rejection or on-chain error)
```

---

### AuthorizationTurretStatus

Discriminated union tracking the lifecycle of a single turret's authorization.

| State          | Description                                           |
| -------------- | ----------------------------------------------------- |
| `"pending"`    | Queued, not yet started                               |
| `"submitting"` | Transaction being signed and submitted                |
| `"confirming"` | Transaction submitted, awaiting on-chain confirmation |
| `"confirmed"`  | Authorization event confirmed — green tick            |
| `"failed"`     | Transaction failed (wallet rejection, on-chain error) |
| `"warning"`    | Transaction submitted but confirmation timed out      |

---

### UiState (extended)

Existing entity with one field change.

| Field        | Change        | Description                                                |
| ------------ | ------------- | ---------------------------------------------------------- |
| `activeView` | Type extended | `"visual" \| "move"` → `"visual" \| "move" \| "authorize"` |

**Validation rules**: On load, if stored value is `"authorize"` but no valid deployment state exists, fall back to `"visual"`.

---

## Entity Relationship Diagram

```text
StoredDeploymentState ──gates──▶ AuthorizeView
                                    │
                                    ├── fetches ──▶ TurretInfo[]
                                    │                  │
                                    │                  └── has? ──▶ TurretExtensionInfo
                                    │
                                    └── creates ──▶ AuthorizationTarget[]
                                                       │
                                                       └── tracks ──▶ AuthorizationTurretStatus
```

## localStorage Keys

| Key                        | Entity                        | Version |
| -------------------------- | ----------------------------- | ------- |
| `frontier-flow:deployment` | `StoredDeploymentState`       | 1       |
| `frontier-flow:ui-state`   | `UiState` (extended)          | 1       |
| `frontier-flow:contracts`  | `ContractLibrary` (unchanged) | 2       |
