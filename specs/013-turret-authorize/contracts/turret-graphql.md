# Contract: Turret GraphQL Queries

**Feature**: 013-turret-authorize
**Date**: 2026-03-23

This document defines the external interface contracts for querying turret data and constructing authorization transactions.

## GraphQL Queries

### Fetch Turrets by Owner

**Endpoint**: `https://graphql.testnet.sui.io/graphql`
**Method**: `POST`
**Content-Type**: `application/json`

**Query**:

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

**Variables**:

```json
{
  "owner": "<wallet-sui-address>",
  "type": "<worldPackageId>::turret::Turret"
}
```

**Response shape**:

```typescript
interface TurretGraphQlResponse {
  readonly address: {
    readonly objects: {
      readonly nodes: ReadonlyArray<{
        readonly address: string;
        readonly contents: {
          readonly json: Record<string, unknown>;
        };
      }>;
    };
  };
}
```

**Error scenarios**:

- HTTP non-200: Network error or server error → retry prompt
- GraphQL errors array: Bad query or invalid variables → display error
- Empty nodes array: User owns no turrets → empty state
- Null address: Invalid wallet address → display error

---

### Fetch OwnerCap for Turret

**Query**:

```graphql
query OwnerCap($owner: SuiAddress!, $type: String!) {
  address(address: $owner) {
    objects(filter: { type: $type }, first: 50) {
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

**Variables**:

```json
{
  "owner": "<wallet-sui-address>",
  "type": "<worldPackageId>::character::OwnerCap<<worldPackageId>::turret::Turret>"
}
```

**Note**: OwnerCap is a generic type parameterized by the assembly type. For turrets, the full type includes the turret type argument.

---

## Sui Transaction: Authorize Extension

### Transaction Structure (per turret)

```typescript
import { Transaction } from "@mysten/sui/transactions";

function buildAuthorizeTurretTransaction(params: {
  readonly worldPackageId: string;
  readonly deployedPackageId: string;
  readonly moduleName: string;
  readonly characterId: string;
  readonly ownerCapId: string;
  readonly turretId: string;
}): Transaction {
  const tx = new Transaction();

  // 1. Borrow OwnerCap from character
  const [ownerCap, receipt] = tx.moveCall({
    target: `${params.worldPackageId}::character::borrow_owner_cap`,
    typeArguments: [`${params.worldPackageId}::turret::Turret`],
    arguments: [tx.object(params.characterId), tx.object(params.ownerCapId)],
  });

  // 2. Authorize extension on turret
  tx.moveCall({
    target: `${params.worldPackageId}::turret::authorize_extension`,
    typeArguments: [
      `${params.deployedPackageId}::${params.moduleName}::TurretAuth`,
    ],
    arguments: [tx.object(params.turretId), ownerCap],
  });

  // 3. Return OwnerCap to character
  tx.moveCall({
    target: `${params.worldPackageId}::character::return_owner_cap`,
    typeArguments: [`${params.worldPackageId}::turret::Turret`],
    arguments: [tx.object(params.characterId), ownerCap, receipt],
  });

  return tx;
}
```

### Transaction Execution

**Signing**: Via `signTransaction` from `@mysten/wallet-standard`
**Execution**: Via `suiClient.executeTransactionBlock`
**Confirmation**: Via `suiClient.waitForTransaction` or transaction effects check
**Chain**: `"sui:testnet"` for testnet targets

### Required IDs

| ID                  | Source                          | Resolution                                                 |
| ------------------- | ------------------------------- | ---------------------------------------------------------- |
| `worldPackageId`    | `PackageReferenceBundle`        | Looked up by `targetId` via `getPackageReferenceBundle()`  |
| `deployedPackageId` | `StoredDeploymentState`         | From persisted deployment state                            |
| `moduleName`        | `StoredDeploymentState`         | From persisted deployment state                            |
| `characterId`       | `objectRegistryId` + derivation | Derived using object registry (same pattern as deployment) |
| `ownerCapId`        | GraphQL query                   | Fetched per-turret before transaction construction         |
| `turretId`          | GraphQL turret query            | From turret list fetch                                     |

### Error Handling

| Error                    | Outcome     | User Message                                                           |
| ------------------------ | ----------- | ---------------------------------------------------------------------- |
| Wallet rejection         | `"failed"`  | "Transaction was rejected by your wallet"                              |
| OwnerCap not found       | `"failed"`  | "Could not find ownership capability for this turret"                  |
| Turret offline/destroyed | `"failed"`  | "Turret is no longer available"                                        |
| Network timeout          | `"warning"` | "Transaction submitted but confirmation timed out — check your wallet" |
| Execution error          | `"failed"`  | "Authorization failed: {error details}"                                |
