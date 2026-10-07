## Scope

Migrate existing application-owned and maintained-tooling Sui JSON-RPC operations to gRPC. Preserve existing GraphQL queries and existing Walrus gRPC integration; test their compatibility without requiring transport replacement or gRPC equivalents.

## 1. Establish compatibility and failing regressions

- [x] 1.1 Inventory maintained Sui clients, legacy wallet imports, raw JSON-RPC calls, package/reference verification entry points, and diagnostic scripts; classify their existing transports, map each JSON-RPC operation and required response field to a supported gRPC API, and record GraphQL/existing gRPC paths as preserved.
- [x] 1.2 Verify current released Sui SDK, React dApp Kit/core, wallet-standard, and Walrus compatibility using registry/release evidence; record exact candidate versions and integrity requirements without installing guessed latest versions.
- [x] 1.3 Run a bounded browser/local-validator compatibility spike for gRPC service paths, preflight/CSP, required indexing, Move interface queries, authorization evidence, and simulation return bytes; stop for a reviewed design amendment if required JSON-RPC-to-gRPC parity is unavailable; do not require gRPC equivalents for preserved GraphQL queries.
- [x] 1.4 Add a failing regression through WalletStatus and the real useTargetBalance/client path that rejects legacy JSON-RPC traffic, reproducing #119 rather than mocking a successful hook result.
- [x] 1.5 Establish deterministic unavailable-service and rejected-preflight fixtures plus a disposable containerized local-validator test procedure using an available runtime and integrity-pinned images where used.

## 2. Migrate shared clients and wallet integration

- [x] 2.1 Add target-aware SuiGrpcClient construction and configuration, including local endpoint changes, logical target isolation, and separate intended Walrus network configuration; add construction/cache-identity tests.
- [x] 2.2 Replace legacy dApp Kit dependencies with the verified gRPC-capable packages; pin changed direct dependencies and retain cryptographic integrity in the lockfile.
- [x] 2.3 Migrate main.tsx providers and wallet hooks/components while preserving discovery, connect/disconnect, account changes, signing consent, and chain checks; handle legacy reconnect storage safely.
- [x] 2.4 Migrate useTargetBalance to the actual gRPC balance API and normalized results; distinguish valid zero from failure, bound retries/deadlines, and prevent stale account/target results.
- [x] 2.5 Verify browser service access under the existing CSP; make only narrowly required policy changes and retain the companion World API origin.

## 3. Migrate operation boundaries

- [x] 3.1 Migrate JSON-RPC-backed object/package/registry reads and maintained reference-validation callers using explicit required fields and pagination; preserve existing GraphQL verification, missing-object, lineage, provenance, and fail-closed behavior without changing bundles.
- [x] 3.2 Migrate wallet-signed and local ephemeral-key publication paths to gRPC execution; normalize effects, digest, and package identity without assuming legacy objectChanges shapes.
- [x] 3.3 Migrate deployment confirmation and TurretAuth interface readiness queries with bounded polling, cancellation, delayed-visibility handling, and no confirmation on digest alone.
- [x] 3.4 Migrate JSON-RPC-backed authorization discovery/ownership reads and execution confirmation using authoritative gRPC evidence; preserve existing GraphQL discovery/ownership queries, per-turret outcomes, chain checks, cancellation, and ambiguous-submission safety.
- [x] 3.5 Migrate JSON-RPC turret simulation execution to read-only gRPC simulation and decode command-return bytes into existing domain results; preserve existing GraphQL simulation queries/suggestions and reject malformed or aborted responses without signing/submitting.
- [x] 3.6 Verify the existing Walrus gRPC extension and graph read/publish wallet flows with the new integration; avoid unnecessary transport replacement or deployment-target leakage.
- [x] 3.7 Migrate remaining maintained JSON-RPC diagnostic scripts and remove obsolete JSON-RPC runtime imports, envelopes, response casts, and mocks; preserve existing GraphQL tooling; document any reviewed unsupported tooling instead of silently leaving a failing maintained path.

## 4. Prove parity and original-fault coverage

- [x] 4.1 Make the original balance regression pass with real hook/client wiring; test zero, nonzero, failure, retry bounds, disconnect, account switching, target switching, and local endpoint changes.
- [x] 4.2 Add execution/confirmation fixtures for successful and failed effects, package extraction, missing required fields, delayed interface visibility, cancellation, and ambiguous submission without duplicate signing.
- [x] 4.3 Add authorization and simulation parity tests for paginated reads, authoritative evidence, partial batch failures, ownership/network rejection, decoded return bytes, and execution errors.
- [x] 4.4 Run package-reference integrity, preserved GraphQL discovery/ownership/simulation-query, and Walrus graph transfer regressions, proving transport changes do not weaken validation, remove suggestions, or change the configured network.
- [x] 4.5 Add a built-app Playwright test with a test wallet and real cross-origin gRPC responder under production-equivalent CSP; cover successful balance and failed preflight, and fail on legacy JSON-RPC envelopes without mocking the balance hook.
- [x] 4.6 Run the companion List of Tribe success/failure tests with Sui unavailable; assert independent World API usability and no regression to the obsolete hostname.
- [x] 4.7 Add a scoped regression guard against legacy Sui JSON-RPC runtime imports/calls, excluding deliberate negative fixtures and historical documentation.
- [x] 4.8 Exercise publish, confirmation, authorization, and simulation against an isolated gRPC-enabled local validator with test-only keys; record parity results and never substitute remote writes without explicit consent.

## 5. Verify release readiness and document

- [x] 5.1 Document and run an opt-in bounded read-only gRPC smoke from the deployed browser origin; check actual browser access and required reads, recording unavailable verification as unsuccessful rather than passing fixtures.
- [x] 5.2 Run full applicable unit/security tests, type checks, lint, production build, and deterministic browser suites; verify the original pre-migration failing regression now passes and no required parity blocker remains.
- [x] 5.3 Document verified dependency versions, gRPC endpoint/local-validator setup, wallet reconnect behavior, operation mapping, diagnostic commands, and rollback limitations; document the preserved GraphQL scope and retain World API and package-reference documentation.
- [x] 5.4 Validate and archive this OpenSpec after successful implementation and verification, before the final commit/PR; run configured pre-commit checks and retain a signed, attributed commit when committing is requested.
