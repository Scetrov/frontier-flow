## Context

The screenshot in #119 combines independent World API DNS and Sui CORS failures. Read-only probes on 2026-10-07 found the Sui testnet root returns a JSON-RPC retirement error, without CORS headers, to both OPTIONS and JSON-RPC POST. `WalletStatus` invokes `useTargetBalance`, which constructs `SuiJsonRpcClient`; the global provider also configures JSON-RPC clients. Deployment, confirmation, authorization, and simulation have additional legacy assumptions. `walrusGraphClient` already uses `SuiGrpcClient` and must remain compatible.

The repository currently declares `@mysten/sui` 2.33.2 and legacy `@mysten/dapp-kit` 1.1.17. SDK-specific migration documentation describes the replacement `@mysten/dapp-kit-react` integration, whereas the general Sui migration page warns that the legacy package cannot accept a gRPC client. These statements concern different packages: do not force `SuiGrpcClient` into the old provider or follow sample APIs without checking the selected release's types.

References:
- https://github.com/Scetrov/frontier-flow/issues/119
- https://sdk.mystenlabs.com/sui/migrations/sui-2.0/dapp-kit
- https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration
- https://docs.sui.io/develop/accessing-data/json-rpc-migration

## Goals / Non-Goals

**Goals:** Remove application-owned dependence on retired Sui JSON-RPC; preserve user-visible wallet and operation behavior; make transport and target selection consistent; retain fail-closed package validation; test actual requests and the wallet-balance failure from #119.

**Non-Goals:** Migrating existing GraphQL queries to gRPC, World API endpoint remediation (companion change), Move/compiler semantics changes, new package bundles, graph-format changes, arbitrary provider failover, a CORS proxy, or weakening validation to accommodate missing gRPC fields. External wallet internals are not under application transport control.

## Decisions

### Migration scope: JSON-RPC → gRPC

Replace application-owned JSON-RPC operations and the legacy wallet integration that depends on them. Preserve existing GraphQL discovery, ownership queries, turret/character reads, simulation suggestions, and package/reference verification, including `scripts/check-world-package-references.ts`. These are not JSON-RPC fallback and do not require gRPC equivalents. Preserve existing Walrus gRPC integration. Shared-client and parity requirements below apply to migrated JSON-RPC paths; preserved GraphQL paths need compatibility regressions, not transport replacement.

### Shared target-aware gRPC construction

Create a small Sui client/configuration boundary based on `SuiGrpcClient`, reused by app providers, standalone JSON-RPC-backed target queries, and maintained JSON-RPC operational callers. Resolve network identity and endpoint from the existing deployment/local configuration rather than scattering constructors. The same fullnode origin can serve gRPC even when its JSON-RPC root is retired; changing protocol does not necessarily require changing hostname. Verify browser transport, service paths, preflight headers, and local-validator gRPC support with the chosen SDK before wiring consumers.

Cache identities must include account, logical target, and endpoint. Stillness and Utopia share Sui testnet but must retain distinct World references. Local RPC setting changes must select a new client/query identity. Preserve explicitly configured Walrus testnet behavior instead of accidentally binding it to a local deployment target.

Approved local-browser policy (2026-10-07): deployed local-validator gRPC access is limited to `localhost` and `127.0.0.1`, on configured ports, with HTTP/HTTPS CSP sources scoped to those exact hosts. Non-loopback production origins require an explicitly reviewed allowlist rather than broad `http:`/`https:` permissions. Development retains configurable endpoints. Browser local-network permission denial must remain an actionable unavailable state; never bypass browser security checks.

Alternative: choose another public JSON-RPC provider. Rejected as an evasion of the requested migration and a continuing dependency on deprecated APIs. Do not implement automatic JSON-RPC fallback.

### Migrate the wallet integration, not only the client class

Replace legacy provider/hooks with the supported gRPC-capable React dApp Kit and its required core package where applicable. Keep TanStack Query for application queries. Preserve wallet discovery, connect/disconnect, account switching, signing consent, chain checks, and reconnect behavior. Reuse existing connection storage where supported; otherwise provide a safe one-time reconnect path without touching saved graphs or fabricating wallet authorization.

Approved resume amendment: keep the wallet kit instance and chain identifiers stable across local endpoint edits. The selected core release caches clients permanently by network (including inside signing actions), so use an endpoint-aware client boundary rather than relying on network switching to refresh its factory. Validate native service and transaction-builder delegation against the selected SDK. A started operation must retain its captured endpoint; a subsequent operation must resolve the new endpoint. Mutating flows must capture a concrete target client and check their account/target/endpoint context before signing/submitting, rather than allowing an endpoint edit to split transaction construction and execution across validators. Preserve the independent Walrus testnet client. Recreating the kit and forcing reconnect on every endpoint edit was considered but not selected by the user.

Approved construction amendment on resume: `Transaction.toJSON({ client })` only prepares serialization and cannot establish pinned object versions or gas. Fully build/resolve the transaction on the captured concrete client within the construction abort/deadline bounds before requesting wallet consent, verify fully resolved state, then pass resolved JSON for wallet review/signing. Require the wallet's returned transaction bytes to match the constructed bytes; changed inputs or gas fail closed without submission and require explicit review/retry. Test real SDK construction, gas selection, wallet payload modification, endpoint/account changes and cancellation, rather than mocking successful JSON serialization. The wallet retains signing consent, but may not silently rebuild the approved payload on a different validator. The selected SDK discards constructor-level abort signals; operation-scoped construction clients therefore supply a supported `RpcTransport` that combines the construction signal with any per-call signal after options merging. Keep SDK protocol headers, configured deadlines, and native/Core cancellation semantics intact; verify actual HTTP cancellation as well as stopping the caller's wait.

Resolve the latest compatible released versions using registry/release evidence during implementation, pin direct changes, and retain cryptographic package integrity in the lockfile. This proposal intentionally does not guess release numbers. Validate peer compatibility with Sui, wallet-standard, Walrus, and React before accepting the dependency set.

### Normalize operations rather than emulating JSON-RPC

Use typed domain results around actual selected-SDK calls. Do not retain casts to legacy response types or treat omitted gRPC fields as success. Implement the following parity map after verifying available APIs and field masks:

| Path | Behavior to preserve |
| --- | --- |
| Balance | Correct owner/coin balance, valid zero, target/account isolation, visible unavailable state |
| JSON-RPC package/object reads | Object identity, parsed Move data/BCS decoding as needed, pagination and registry lineage validation; preserve existing GraphQL verification |
| Publish/execute | Wallet or ephemeral-key signing flow, signed bytes, effects failure, digest and created package extraction |
| Confirmation | Bounded transaction visibility wait followed by required `TurretAuth` interface readiness; no success on a digest alone |
| Authorization | Owner/network checks, transaction events or authoritative post-transaction reads, per-turret partial failure and cancellation |
| Simulation | Read-only simulation, sender, command return bytes/BCS decoding, execution errors, no signing/submission |
| Maintained tooling | Required package/registry verification and current diagnostic workflows without app-owned JSON-RPC |
| Walrus | Existing gRPC extension read/publish flows remain compatible with migrated wallet integration |

Prefer transaction-scoped events or authoritative state for authorization confirmation instead of introducing historical indexing dependencies. If a currently required JSON-RPC operation needs a gRPC service beyond the high-level client, use the supported service with explicit fields and pagination. Missing equivalent support for a migrated JSON-RPC operation is a migration blocker, not permission to drop checks, substitute stale fixtures, or introduce a new GraphQL/JSON-RPC fallback. Document such a blocker for a reviewed design amendment. Existing GraphQL queries remain supported and are not subject to this gRPC-equivalence gate.

### Explicit bounded failure behavior

Set finite deadlines and retry limits for reads and confirmation; surface operation/target-specific failures and a user retry path where appropriate. Never display a failed balance fetch as zero. Account/target changes and disconnect must prevent stale data from appearing for the new context. Do not automatically re-sign or resubmit mutating operations after ambiguous network failure; reconcile a known digest where possible before asking the user to retry.

Browser CORS/network errors may hide upstream detail. Avoid claiming a precise DNS/CORS cause from a generic fetch error. Keep the UI usable and World API lookups independent during a Sui outage.

### Test the transport boundary as well as domain mapping

- Reproduce `WalletStatus` with the real `useTargetBalance` and provider/client wiring; stub the selected SDK's transport or an HTTP test server rather than mocking the hook's result.
- Add a deterministic browser fixture using valid gRPC responses and cross-origin preflight behavior under production-equivalent CSP. Reject JSON-RPC request envelopes and retired root-method calls. Same-host requests alone do not prove migration.
- Include unavailable service, rejected preflight, unsuccessful transaction, delayed visibility, malformed/missing required fields, disconnect, target/account switching, and simulation byte decoding cases.
- Assert migrated package-reference validation still fails closed on missing objects, wrong registry lineage, and unavailable endpoints; preserve the existing spec's requirements without rewriting its bundles.
- Keep main CI hermetic. Add a bounded opt-in live read-only gRPC smoke from the deployed browser origin. Exercise publish/authorization against a disposable local validator with test-only keys; live remote writes require explicit operator consent and are not part of smoke checks.
- Add a scoped source/transport regression guard against legacy JSON-RPC imports and request envelopes in maintained application/runtime tooling. Negative test fixtures and archived docs can mention JSON-RPC without triggering false positives.

## Risks / Trade-offs

- [SDK and docs differ by version] → Verify exact selected release exports, wallet hooks, response shapes, and binary fixtures in a bounded compatibility spike before broad edits.
- [An apparent class rename misses domain semantics] → Require operation-by-operation parity tests, especially effects, package IDs, interface readiness, events, and simulation return values.
- [Local validator lacks gRPC/indexing] → Verify supported configuration in containers and document setup; report an explicit unsupported endpoint rather than falling back silently.
- [Wallet change disrupts reconnect] → Test existing storage and account lifecycle; use an explicit reconnect prompt if compatibility cannot be preserved safely.
- [Mocked browser traffic bypasses CORS] → Exercise a real cross-origin test responder/preflight and a separate deployed-origin live read, not only Playwright route fulfillment.
- [Read retries duplicate mutations] → Separate read retry policy from signing/submission and reconcile known digests after ambiguous outcomes.
- [Sui migration regresses the World API release] → Run companion editor regressions and assert no restored obsolete hostname/CSP entries.

## Migration Plan

1. Implement/release `restore-world-api-connectivity` first where practical. No Sui regression may depend on World API availability.
2. Inventory every maintained Sui consumer, including scripts and reference-validation entry points; classify existing transports and create a method/field parity checklist for JSON-RPC operations only. Record GraphQL and existing gRPC paths as preserved compatibility surfaces.
3. Verify dependencies and browser/local-validator compatibility; establish failing transport-level balance regression before changing production consumers.
4. Introduce shared gRPC configuration, migrate the wallet provider/hooks, then migrate JSON-RPC balance and operation boundaries in tested increments. Preserve existing GraphQL queries, Walrus and fail-closed World reference checks.
5. Run deterministic operation/browser tests, full applicable quality gates, disposable-local-validator integration tests, and read-only deployed-origin smoke. Record unavailable external checks explicitly and block release on unresolved required parity.
6. Remove legacy runtime dependencies/calls and obsolete mocks; document gRPC setup, dependency versions, and diagnostics. Deploy atomically after parity is verified.
7. If rollback is necessary, preserve graphs and package bundles and clearly disable unavailable network-dependent actions. A rollback to the prior release does not restore retired public JSON-RPC and must not be described as restoring service.

## Open Questions

- Which latest compatible SDK/dApp Kit release combination is verified by registry evidence at implementation time? The compatibility spike must resolve it before dependency edits.
- Which exact gRPC APIs and fields supply Move interface readiness, authorization evidence, and simulation bytes for that release? Preserve the behavior or stop for a reviewed design amendment.
- What local-validator release/configuration supports the selected browser transport and required services? Confirm this using the available container runtime rather than assuming Docker is the only option.
