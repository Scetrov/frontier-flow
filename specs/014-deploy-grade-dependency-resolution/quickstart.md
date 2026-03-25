# Quickstart: Deploy-Grade Dependency Resolution

**Feature**: 014-deploy-grade-dependency-resolution

## Overview

This feature adds deploy-grade dependency resolution to Frontier Flow so that generated turret extensions can be compiled against the real upstream `world` package, deployed to testnet, and authorized on turrets — all from the browser.

## Architecture Summary

Two compilation modes coexist:

1. **Authoring mode** (existing): Uses the local `world` shim for fast in-browser feedback during graph editing. No network calls. Unchanged by this feature.

2. **Deploy-grade mode** (new): Fetches the real upstream `world` package source for the target's pinned version tag, resolves the full dependency graph via the WASM builder, and produces bytecode linked against the live on-chain `world` package.

## Key Components

### World Source Fetcher (`src/deployment/worldSourceFetcher.ts`)

Fetches upstream world package files using the builder's `fetchPackageFromGitHub()`. Returns a file map keyed by path.

### Deploy-Grade Compiler (`src/compiler/deployGradeCompiler.ts`)

Calls `resolveDependencies()` to build the dependency graph, then `buildMovePackage()` with `rootGit` and `resolvedDependencies` to produce correctly linked bytecode.

### Updated Remote Publisher (`src/deployment/publishRemote.ts`)

Now accepts deploy-grade compilation output directly instead of re-compiling the artifact with a shim-based workaround.

### Turret Authorizer (`src/deployment/turretAuthorizer.ts`)

Constructs the borrow → authorize → return transaction pattern per turret.

### Deployment State Persistence (`src/deployment/deploymentState.ts`)

Saves/loads deployment state from localStorage for cross-session continuity.

## Data Flow

```text
Graph Editor → Code Generation → Authoring Compile (shim, fast)
                                        ↓
                           User clicks "Deploy to Testnet"
                                        ↓
                      Fetch world source (fetchPackageFromGitHub)
                                        ↓
                      Resolve dependencies (resolveDependencies)
                                        ↓
                      Deploy-grade compile (buildMovePackage + rootGit)
                                        ↓
                      Publish transaction (wallet signing)
                                        ↓
                      Confirm on-chain (TurretAuth struct queryable)
                                        ↓
                      Persist deployment state (localStorage)
                                        ↓
                      Authorize tab enabled → Fetch turrets → Authorize
```

## Technology Decisions

| Decision              | Choice                                                      | Rationale                                               |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| Source fetching       | `fetchPackageFromGitHub()` from `@zktx.io/sui-move-builder` | Already available, handles GitHub API, returns file map |
| Dependency resolution | `resolveDependencies()` + `rootGit`                         | Builder's native API, deterministic, cacheable          |
| Compile-time address  | `original-id` from Published.toml                           | Sui's type system uses original package identity        |
| Version tag storage   | `PackageReferenceBundle.sourceVersionTag`                   | Co-located with all other target metadata               |
| Toolchain mismatch    | Warn but don't block                                        | Avoids unusable states while informing user             |
| Resolution caching    | In-memory, session-scoped                                   | Avoids re-fetching per deploy attempt                   |
| Deployment state      | localStorage, versioned JSON                                | Cross-session continuity for authorize flow             |

## Files Changed (estimated)

| File                                   | Change Type | Description                                                                                      |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `src/compiler/types.ts`                | Modify      | Add `sourceVersionTag`, `originalWorldPackageId`, `toolchainVersion` to `PackageReferenceBundle` |
| `src/compiler/moveCompiler.ts`         | Modify      | Widen `MoveCompilerModule` interface to accept full `BuildInput`                                 |
| `src/data/packageReferences.ts`        | Modify      | Add new fields to bundle constants                                                               |
| `src/deployment/worldSourceFetcher.ts` | New         | Fetch world source from GitHub                                                                   |
| `src/compiler/deployGradeCompiler.ts`  | New         | Deploy-grade compilation orchestration                                                           |
| `src/deployment/publishRemote.ts`      | Modify      | Accept deploy-grade result instead of re-compiling                                               |
| `src/deployment/turretAuthorizer.ts`   | New         | Authorization transaction construction                                                           |
| `src/deployment/deploymentState.ts`    | New         | localStorage persistence for deployment state                                                    |
| `src/deployment/executor.ts`           | Modify      | Integrate deploy-grade compilation into deployment stages                                        |

## Testing Strategy

- **Unit tests**: World source fetcher (mocked fetch), deploy-grade compiler (mocked builder), deployment state persistence, turret authorization transaction construction
- **Integration tests**: End-to-end deploy-grade compilation against mock builder responses
- **E2E tests**: Full deploy → authorize flow (requires testnet or mock validator)
