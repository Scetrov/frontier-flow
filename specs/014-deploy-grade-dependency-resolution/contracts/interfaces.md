# Interface Contracts: Deploy-Grade Dependency Resolution

**Feature**: 014-deploy-grade-dependency-resolution  
**Date**: 2026-03-25

## 1. World Source Fetcher

Responsible for obtaining upstream world package source files for a given deployment target.

### Input

```typescript
interface FetchWorldSourceRequest {
  /** GitHub repository URL for world-contracts */
  readonly repositoryUrl: string;
  /** Version tag to fetch (e.g., "v0.0.18") */
  readonly versionTag: string;
  /** Subdirectory within the repo (e.g., "contracts/world") */
  readonly subdirectory: string;
  /** Optional abort signal */
  readonly signal?: AbortSignal;
}
```

### Output

```typescript
interface FetchWorldSourceResult {
  /** File path → content map of the package subtree */
  readonly files: Readonly<Record<string, string>>;
  /** Version tag that was fetched */
  readonly sourceVersionTag: string;
  /** Timestamp of fetch */
  readonly fetchedAt: number;
}
```

### Error Cases

- `WorldSourceFetchError` — network failure, 404, rate limit, or CORS rejection
- `WorldSourceTimeoutError` — signal abort or >60s elapsed

---

## 2. Deploy-Grade Compiler

Responsible for compiling an extension against the real world dependency graph.

### 2.1. Input

```typescript
interface DeployGradeCompileRequest {
  /** The generated extension artifact (from code generation) */
  readonly artifact: GeneratedContractArtifact;
  /** World package source files fetched from upstream */
  readonly worldSource: FetchWorldSourceResult;
  /** Target deployment configuration */
  readonly target: PackageReferenceBundle;
  /** Cached resolution to skip re-resolution (optional) */
  readonly cachedResolution?: CachedDependencyResolution;
  /** Progress callback for UI feedback */
  readonly onProgress?: (event: DeployCompileProgressEvent) => void;
  /** Optional abort signal */
  readonly signal?: AbortSignal;
}
```

### 2.2. Output

```typescript
interface DeployGradeCompileResult {
  /** Compiled bytecode modules */
  readonly modules: Uint8Array[];
  /** Hex-encoded on-chain dependency package IDs */
  readonly dependencies: string[];
  /** Blake2b-256 digest */
  readonly digest: number[];
  /** Resolved dependencies for caching */
  readonly resolvedDependencies: ResolvedDependencies;
  /** Target this was compiled for */
  readonly targetId: string;
  /** Source version tag used */
  readonly sourceVersionTag: string;
  /** Builder toolchain version used */
  readonly builderToolchainVersion: string;
}

type DeployCompileProgressEvent =
  | { readonly phase: "fetching-source" }
  | {
      readonly phase: "resolving-dependencies";
      readonly current: number;
      readonly total: number;
    }
  | { readonly phase: "compiling" }
  | { readonly phase: "complete" };
```

### 2.3. Error Cases

- `DependencyResolutionError` — builder failed to resolve the world dependency graph
- `DeployCompilationError` — compilation succeeded in authoring mode but failed in deploy-grade mode
- `ToolchainMismatchWarning` — informational, not an error; surfaced to UI

---

## 3. Remote Publisher (updated)

Extends the existing `publishRemote.ts` contract to accept deploy-grade compilation results.

### 3.1. Input (updated)

```typescript
interface RemotePublishRequest {
  /** Deploy-grade compiled result (replaces artifact re-compilation) */
  readonly compileResult: DeployGradeCompileResult;
  /** Owner wallet address */
  readonly ownerAddress: string;
  /** Target deployment configuration */
  readonly target: DeploymentTarget;
  /** Package references for the target */
  readonly references: PackageReferenceBundle;
  /** Transaction executor (wallet signing) */
  readonly execute: (tx: Transaction) => Promise<{ digest: string }>;
  /** Optional callbacks */
  readonly onSubmitting?: () => void;
  readonly signal?: AbortSignal;
}
```

### 3.2. Output

```typescript
interface RemotePublishResult {
  readonly transactionDigest: string;
}
```

---

## 4. Turret Authorizer

Responsible for constructing and executing turret authorization transactions.

### 4.1. Input

```typescript
interface AuthorizeTurretRequest {
  /** Turret object IDs to authorize */
  readonly turretIds: readonly string[];
  /** Deployed extension package ID */
  readonly extensionPackageId: string;
  /** Extension module name (e.g., "builder_extensions") */
  readonly extensionModuleName: string;
  /** World package references for the target */
  readonly references: PackageReferenceBundle;
  /** User's character object ID */
  readonly characterId: string;
  /** Transaction executor (wallet signing) */
  readonly execute: (tx: Transaction) => Promise<{ digest: string }>;
  /** Per-turret progress callback */
  readonly onTurretProgress?: (
    turretId: string,
    status: TurretAuthorizationStatus,
  ) => void;
  /** Optional abort signal */
  readonly signal?: AbortSignal;
}

type TurretAuthorizationStatus =
  | "pending"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";
```

### 4.2. Output

```typescript
interface AuthorizeTurretsResult {
  /** Per-turret results */
  readonly results: readonly TurretAuthorizationOutcome[];
  /** Summary counts */
  readonly summary: {
    readonly total: number;
    readonly confirmed: number;
    readonly failed: number;
  };
}

interface TurretAuthorizationOutcome {
  readonly turretId: string;
  readonly status: "confirmed" | "failed";
  readonly transactionDigest?: string;
  readonly error?: string;
}
```

### Transaction Shape (per turret)

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
  typeArguments: [`${extensionPackageId}::${extensionModuleName}::TurretAuth`],
  arguments: [tx.object(turretId), ownerCap],
});

// 3. Return OwnerCap
tx.moveCall({
  target: `${worldPackageId}::character::return_owner_cap`,
  typeArguments: [`${worldPackageId}::turret::Turret`],
  arguments: [tx.object(characterId), ownerCap, receipt],
});
```

---

## 5. Deployment State Persistence

### Storage Contract

```typescript
interface PersistedDeploymentState {
  readonly version: 1;
  readonly packageId: string;
  readonly moduleName: string;
  readonly targetId: string;
  readonly transactionDigest: string;
  readonly deployedAt: number;
}
```

**Storage key**: `frontier-flow:deployment`

### Operations

- `saveDeploymentState(state: PersistedDeploymentState): void` — write to localStorage
- `loadDeploymentState(): PersistedDeploymentState | null` — read + validate schema version
- `clearDeploymentState(): void` — remove from localStorage
- `isDeploymentStateValid(state: PersistedDeploymentState, currentModuleName: string, currentTargetId: string): boolean` — check staleness against both module name and target
