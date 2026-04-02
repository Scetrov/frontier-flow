# 1. Interface Contracts: Prevent Empty Publish Deployment

**Feature**: 020-fix-empty-publish  
**Date**: 2026-04-02

## 1.1. Publish Payload Validation Contract

Responsible for deciding whether the final materialized Sui Move package can be published.

### 1.1.1. Input

```typescript
interface PublishPayload {
  readonly modules: readonly Uint8Array[];
  readonly dependencies: readonly string[];
  readonly source: "artifact" | "deploy-grade" | "local-rebuild";
  readonly targetId: DeploymentTargetId;
}

interface PublishPayloadValidationContext {
  readonly stage: DeploymentStage;
  readonly targetLabel: string;
}
```

### 1.1.2. Output

```typescript
interface PublishPayloadReadinessResult {
  readonly ready: boolean;
  readonly stage: DeploymentStage;
  readonly message: string;
  readonly remediation: string;
  readonly errorCode?: "publish-payload-empty";
}
```

### 1.1.3. Behavioral Rules

- Validation fails when `modules.length === 0`.
- Validation may also fail when any module byte array is empty after final materialization.
- Validation must execute before wallet approval and before `Transaction.publish()`.

---

## 1.2. Deployment Executor Contract (updated)

The executor remains the shared orchestration point that turns publish-payload validation into a user-visible blocked attempt.

### 1.2.1. Relevant Input

```typescript
interface DeploymentExecutionRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly ownerAddress?: string;
  readonly references: PackageReferenceBundle | null;
  readonly target: DeploymentTarget;
  readonly signal?: AbortSignal;
}
```

### 1.2.2. Relevant Output

```typescript
interface DeploymentExecutionResult {
  readonly outcome: "blocked" | "cancelled" | "failed" | "unresolved" | "succeeded";
  readonly stage: DeploymentStage;
  readonly message: string;
  readonly errorCode?: string;
  readonly packageId?: string;
  readonly confirmationReference?: string;
}
```

### 1.2.3. Behavioral Rules

- When the final publish payload is empty, the executor returns `outcome: "blocked"`.
- Empty-payload blocking must occur before invoking `publishRemote` or `publishLocal`.
- A blocked empty-payload result must carry a user-facing message and remediation text that explain the package must be rebuilt or refreshed.

---

## 1.3. Remote Publisher Precondition Contract

The remote publisher is not allowed to construct a Sui publish transaction with an empty module list.

### 1.3.1. Input

```typescript
interface RemotePublishRequest {
  readonly artifact?: GeneratedContractArtifact;
  readonly compileResult?: DeployGradeCompileResult;
  readonly ownerAddress: string;
  readonly target: DeploymentTarget;
  readonly references: PackageReferenceBundle;
  readonly execute: (transaction: Transaction, request?: RemotePublishExecutionRequest) => Promise<{ digest: string }>;
  readonly onSubmitting?: () => void;
  readonly signal?: AbortSignal;
}
```

### 1.3.2. Precondition

```typescript
modules.length > 0
```

### 1.3.3. Failure Contract

- Throw a typed or clearly classified error with a stable message for empty publish payloads.
- Do not call `request.execute(...)` when the precondition fails.

---

## 1.4. Local Publisher Precondition Contract

The local publisher follows the same publish-payload rule after any shim rebuild has completed.

### 1.4.1. Input

```typescript
interface LocalPublishRequest {
  readonly artifact: GeneratedContractArtifact;
  readonly target: DeploymentTarget;
  readonly references: PackageReferenceBundle | null;
  readonly signal?: AbortSignal;
}
```

### 1.4.2. Precondition

```typescript
resolvedModules.length > 0
```

### 1.4.3. Failure Contract

- Do not call `transaction.publish(...)` when the final local module list is empty.
- Surface a clear local validation failure rather than a late RPC or chain parser error.

---

## 1.5. User-Facing Status Contract

The fix must preserve existing deployment review surfaces and classify the regression as a blocked attempt.

### 1.5.1. Status Message Shape

```typescript
interface DeploymentStatusMessage {
  readonly attemptId: string;
  readonly targetId: DeploymentTargetId;
  readonly severity: "info" | "warning" | "error" | "success";
  readonly headline: string;
  readonly details: string;
  readonly stage?: DeploymentStage;
  readonly visibleInFooter: boolean;
  readonly visibleInMovePanel: boolean;
}
```

### 1.5.2. Review Entry Expectations

- The blocked attempt remains visible in `reviewHistory`.
- `headline` identifies a blocked deployment rather than a chain submission failure.
- `details` explain the deployment package was incomplete and how to recover.
- Retrying after a rebuild creates a new attempt; it does not overwrite the blocked history entry.