## Why

Issue #119 exposes Sui testnet CORS failures whose underlying response states that public fullnode JSON-RPC has been retired. Wallet balance queries and other application operations still use that transport; changing CORS policy or proxying the retired endpoint cannot restore them.

## What Changes

- Replace application-owned Sui JSON-RPC clients with target-aware `SuiGrpcClient` access, including balance, deployment, confirmation, authorization, simulation, and maintained supporting tools.
- Replace the legacy JSON-RPC-only `@mysten/dapp-kit` integration with the supported gRPC-capable React dApp Kit, preserving wallet discovery, connection, signing, account changes, and network safety.
- Normalize gRPC responses at operation boundaries rather than preserving JSON-RPC response assumptions, including transaction effects, package identification, Move interface readiness, events, and simulation return bytes.
- Preserve existing GraphQL queries (including discovery, simulation suggestions, and package/reference verification), gRPC-based Walrus behavior, local validator workflows, and World package-reference integrity guarantees. This is a JSON-RPC → gRPC migration, not a GraphQL → gRPC migration.
- Add regression tests through the actual wallet balance hook and browser transport, rejecting legacy JSON-RPC traffic and exercising unavailable/preflight-failed endpoints, plus parity coverage for migrated operations.
- Provide bounded, explicit transport errors and no fallback to retired public JSON-RPC.

## Capabilities

### New Capabilities

- `sui-grpc-connectivity`: Target-aware gRPC clients and wallet integration, operation parity, bounded failures, and transport-level regression coverage.

### Modified Capabilities

None. Existing `world-package-reference-integrity` requirements remain in force; changing transport does not authorize changing package bundles, verification semantics, or source provenance.

## Impact

- Providers in `src/main.tsx`; legacy dApp Kit imports in hooks/components; `src/hooks/useTargetBalance.ts`; deployment publish/confirmation; JSON-RPC-backed authorization reads, signing and confirmation; turret simulation execution; JSON-RPC-backed package/reference validation callers; maintained JSON-RPC diagnostic scripts and associated mocks.
- Wallet dependencies and lockfile integrity, browser CSP/preflight verification, local-validator documentation, and test fixtures may change. Resolve latest compatible released packages and verify their integrity at implementation time rather than pinning guessed versions in this proposal.
- `src/utils/walrusGraphClient.ts` already uses `SuiGrpcClient`; preserve it and test shared wallet/transport compatibility rather than rewrite it as a JSON-RPC consumer.
- No graph format or World package bundle migration. Local endpoints must support the selected SDK's gRPC transport; unsupported validators receive actionable errors rather than a silent JSON-RPC fallback.
- Companion change: `restore-world-api-connectivity`, recommended for implementation/release first. This change must preserve that fix, but its Sui regression tests must remain independently runnable.
