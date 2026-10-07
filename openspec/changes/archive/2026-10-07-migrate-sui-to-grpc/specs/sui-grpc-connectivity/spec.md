## ADDED Requirements

### Requirement: Maintained Sui JSON-RPC operations migrate to gRPC
Application-owned Sui operations and maintained supporting tools that currently use JSON-RPC MUST migrate to supported gRPC clients. Existing GraphQL queries and existing gRPC integrations MUST be preserved; this change MUST NOT require their transport replacement. Client construction for migrated operations MUST respect the selected network and configured endpoint. The application MUST NOT silently fall back to JSON-RPC, weaken browser policy, or proxy a retired API to conceal incompatibility. Existing GraphQL queries are not fallback; a new GraphQL fallback for a migrated JSON-RPC operation requires a reviewed design amendment.

#### Scenario: Migrated public testnet operation runs
- **WHEN** the application performs a Sui testnet operation previously backed by JSON-RPC
- **THEN** it uses the supported gRPC service transport and emits no legacy JSON-RPC request envelope

#### Scenario: Existing GraphQL queries remain supported
- **WHEN** an existing GraphQL discovery, ownership, turret/character read, simulation suggestion, or package/reference verification query runs after migration
- **THEN** it retains its GraphQL transport and existing domain and integrity guarantees without requiring a gRPC equivalent

#### Scenario: Local endpoint changes
- **WHEN** the user changes local-validator endpoint configuration
- **THEN** subsequent migrated local gRPC operations and query identities use the new endpoint rather than the previous client or cached results

#### Scenario: Endpoint lacks required gRPC support
- **WHEN** a selected endpoint does not support a required gRPC operation
- **THEN** the application reports an actionable operation/target failure without JSON-RPC fallback or fabricated success

### Requirement: Wallet lifecycle remains compatible with gRPC
The application MUST use a gRPC-capable wallet integration and preserve discovery, connection, disconnection, account changes, signing consent, and chain checks. Existing saved graphs MUST remain unaffected. If automatic reconnection cannot safely preserve the previous wallet session, the application MUST request reconnection explicitly.

#### Scenario: Wallet connects and disconnects
- **WHEN** a supported wallet is connected and subsequently disconnected
- **THEN** account state and available actions update correctly and no previous account balance is presented as current

#### Scenario: Wallet and operation networks differ
- **WHEN** a signing operation targets a chain inconsistent with the connected wallet context
- **THEN** the application prevents submission or obtains an explicit supported network transition before signing

#### Scenario: Old connection storage cannot be reused
- **WHEN** the new wallet integration cannot safely restore the legacy stored connection
- **THEN** the user is prompted to reconnect without deleting graphs or assuming signing authorization

### Requirement: Wallet balance exercises target-aware gRPC access
The real wallet balance query MUST load the connected owner's balance through gRPC and distinguish a valid zero from an unavailable balance. Query identities MUST isolate account, logical deployment target, and endpoint.

#### Scenario: Connected wallet balance loads
- **WHEN** a connected wallet is displayed in WalletStatus
- **THEN** the actual balance hook requests the selected target through gRPC and renders the returned balance

#### Scenario: Account or target changes mid-request
- **WHEN** an earlier balance request completes after the account or selected target has changed
- **THEN** its result is not displayed as the current account/target balance

#### Scenario: Balance request fails
- **WHEN** the endpoint is unavailable or the browser rejects its preflight
- **THEN** the UI indicates an unavailable Sui balance after bounded attempts rather than showing zero or retrying indefinitely

### Requirement: Deployment preserves execution and confirmation semantics
Migrated deployment MUST preserve signing, submission, effects validation, transaction digest, published package identification, and required Move interface readiness. Confirmation MUST remain bounded and cancellable. Ambiguous transport failure MUST NOT automatically trigger a duplicate signed submission.

#### Scenario: Publication succeeds
- **WHEN** a publish transaction has successful effects, an identified package, and the expected extension interface is queryable
- **THEN** deployment is confirmed with the correct digest and package ID

#### Scenario: Effects report failure
- **WHEN** a submitted transaction returns unsuccessful effects despite a valid digest
- **THEN** deployment reports failure rather than confirmation

#### Scenario: Package interface is not yet visible
- **WHEN** transaction success is visible but the required TurretAuth interface is not yet queryable
- **THEN** confirmation continues only within its configured deadline and does not declare readiness prematurely

#### Scenario: Submission outcome is ambiguous
- **WHEN** transport fails after a transaction might have been submitted
- **THEN** the application avoids automatic re-signing/resubmission and reconciles a known digest or presents an explicit unresolved status

### Requirement: Authorization and simulation preserve domain results
Authorization MUST verify current ownership/network context and authoritative execution evidence while retaining per-turret outcomes. Simulation MUST remain read-only and correctly decode selected-SDK command return values without wallet signing or transaction submission.

#### Scenario: Authorization batch partially fails
- **WHEN** one turret authorization succeeds and another aborts or fails validation
- **THEN** each turret retains its actual outcome and no missing event or response field is interpreted as success

#### Scenario: Simulation returns command bytes
- **WHEN** a successful gRPC simulation returns the turret-priority command result
- **THEN** the application decodes it into the same domain result as the existing simulation contract

#### Scenario: Simulation aborts or is malformed
- **WHEN** simulation reports an execution error or omits required return data
- **THEN** the application reports simulation failure without a signed or submitted transaction

### Requirement: Existing integrity and Walrus guarantees survive migration
The migration MUST preserve all `world-package-reference-integrity` requirements and the existing gRPC-based Walrus graph transfer behavior. It MUST NOT change package-reference bundles or waive validation because transport results differ.

#### Scenario: Registry validation fails
- **WHEN** migrated gRPC reads or preserved GraphQL verification report a missing package, a wrong registry lineage, or an unavailable authoritative endpoint
- **THEN** reference validation fails closed with target-level diagnostics rather than accepting unverified references

#### Scenario: Walrus graph transfer runs
- **WHEN** the user reads a graph or performs a consented graph publish through the existing Walrus integration
- **THEN** its gRPC client and wallet interaction remain functional with the intended Walrus network configuration

### Requirement: Transport regressions cover the original failure and operation parity
The repository MUST include deterministic tests using real balance hook/client wiring, operation adapters, and browser transport behavior. Tests MUST reject app-owned legacy JSON-RPC traffic and cover both successful gRPC access and failed preflight/unavailable service behavior. Live smoke tests MUST be opt-in, bounded, and read-only; mutation integration tests MUST use an explicitly isolated local environment unless an operator authorizes remote writes.

#### Scenario: Legacy balance transport is reintroduced
- **WHEN** the wallet balance path constructs a legacy client or sends a JSON-RPC envelope
- **THEN** the regression fails even if a mocked balance value could otherwise satisfy the UI

#### Scenario: Browser access is tested
- **WHEN** the built application connects a test wallet under production-equivalent CSP
- **THEN** a cross-origin test responder exercises actual preflight and gRPC responses, including a rejected-preflight case, without mocking the balance hook

#### Scenario: Sui is down while World API works
- **WHEN** Sui requests fail but the companion World API endpoint returns valid tribes
- **THEN** the wallet displays its bounded failure while the tribe editor remains usable

#### Scenario: Operation responses change
- **WHEN** a gRPC fixture changes effects, package identity, interface readiness, authorization evidence, or simulation return bytes
- **THEN** the relevant parity test validates domain correctness rather than merely asserting that an SDK method was called

#### Scenario: Live verification is unavailable
- **WHEN** the deployed-origin read-only smoke cannot complete a required gRPC read
- **THEN** it reports unsuccessful verification without substituting fixture results or attempting signed remote transactions
