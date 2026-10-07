# Migration implementation evidence

## Latest continuation — 11/29 complete; operator-requested pause

This supersedes the earlier stale-assertion pause. User authorized routine stale assertion/fixture/lint corrections without repeated approval questions. Fixed the owner assertion to SDK-valid `0x333`, added six simulation cancellation/stale-session cases and verified **3.5**, now checked. Migrated **3.1**, now checked: captured gRPC UpgradeCap pagination/BCS ownership and identity checks, native package/module descriptors, bounded sequential reads and cursor/page-limit rejection; target-aware World-package existence validation now fails closed on unsupported/malformed/unavailable reads. Deployment blocks before consent/compile on missing/unavailable required package evidence. Existing GraphQL verification/queries/suggestions and maintained bundles unchanged.

Latest fully green baseline after those tasks: **786 unit tests / 110 files**, one skipped file/test; **4 security tests**; typecheck/lint/build passed with existing graph-transfer/import/chunk warnings; configured Chromium **37 passed, 1 skipped**. These are incremental gates, not release readiness.

Subsequently began **3.3**, still unchecked: new explicit native/normalized transaction result/package normalization and gRPC confirmation with bounded transaction visibility and actual TurretAuth identity polling; default executor/app confirmation now uses it. Publication and wallet/provider integration remain legacy/pending. Focused confirmation + remote deployment success suites: **22 passed / 2 files**; nonexistent `executor.test.ts` argument was ignored, so rerun actual `deploymentExecutor.test.ts`. Latest typecheck passes after async narrowing correction. Lint currently fails at `confirmation.ts:73` on redundant `unknown | null`, with three additional new complexity warnings. Attempted batched lint/refactor edit failed its first exact match and applied nothing. User requested pause before retrying; full tests/build/browser not rerun after confirmation changes. No 3.3/4.2 completion claimed.

See the top of `HANDOFF.md` for exact files, gates, resume commands and boundaries. Dependencies/registry hashes remain unchanged, provider still unwired, overall **11/29**. No remote mutation, container/local-validator mutation parity, archive, commit, push or deployment in this continuation.

## Latest resume: partial 3.5 gRPC simulation increment

Revalidated npm latest versions/peers/integrity for all five selected direct dependencies; unchanged from section 1.2. Inspected existing wallet consumers and started the standalone simulation boundary to remove one legacy client-type coupling before provider migration. No dependency/provider swap performed.

`turretSimulationExecution.ts` now captures the shared target gRPC client by default, sets sender, simulates once with checks disabled and effects/commandResults/protoJson, validates explicit native successful effects and actual return type, checks native/normalized BCS consistency, and uses the existing domain decoder. Requests carry eight-second timeout/cancellation bounds; never signs/submits/retries. Existing local exclusion retained. `useTurretSimulation.ts` removes the legacy hook type and aborts/ignores stale requests on close or context changes. `AuthorizeView.tsx` no longer injects its legacy client into simulation. Existing GraphQL queries/suggestions untouched.

Actual SDK/protobuf/gRPC-web transport suite: **10 passed**. It verifies domain decoding, sender/service path/masks/deadline, failed/missing effects, wrong/missing type, missing payload, malformed BCS, unavailable service, cancellation, and no request for local/pre-cancelled operations. Initial typecheck passed before subsequent fixture edits.

Migrated shared simulation mocks, unit UI cases and the authorization browser route to binary gRPC responses. Focused boundary/UI run: **28 passed, 1 failed**. The remaining UI hydration assertion (`AuthorizeView.test.tsx:406`) expects old invalid mock ID `0xownercharacter`; the mock now supplies SDK-valid `0x333`. The real simulation success and error UI cases pass. Paused before correcting the stale assertion, per apply guardrail. Typecheck/lint/browser/full gates not rerun after latest edits; no new task completion claimed, progress **9/29**. Need fixture correction approval, hook cancellation/stale completion tests and incremental gates before completing 3.5. No actual local-validator mutation parity or deployed-origin smoke claimed. No commit, archive, deployment or remote mutation.

## 1.1 Maintained operation inventory

Inventory taken on 2026-10-07. No production code or package-reference bundles changed during inventory. The mapping below identifies supported candidate APIs; field and endpoint availability must be verified in task 1.3 before migration.

| Maintained callers | Existing operation / required evidence | Migration or preservation obligations |
| --- | --- | --- |
| `src/main.tsx`, `src/App.tsx`, `src/components/{WalletStatus,DeployWorkflowView,AuthorizeView}.tsx`, wallet types in hooks | Legacy dApp Kit providers, discovery/account/connect/signing lifecycle | `@mysten/dapp-kit-react` + core configuration with `SuiGrpcClient`; preserve account lifecycle, consent and chain checks; do not pass gRPC into legacy providers |
| `src/hooks/useTargetBalance.ts` | JSON-RPC `getBalance`: owner, total balance; target/endpoint/account cache key | `getBalance({ owner })`; normalize returned balance, zero vs errors; finite request deadline/retries |
| `src/hooks/useDeployment.ts`, `src/deployment/publishLocal.ts` | Signed execution, digest, effects status, published package identity | `executeTransaction` / `signAndExecuteTransaction`; explicit effects and object types/changes; discriminate successful/failed results and extract created package, not legacy `objectChanges` |
| `src/deployment/confirmation.ts`, `src/hooks/useAuthorization.ts` | `waitForTransaction` with effects and digest; `getNormalizedMoveStruct` for `TurretAuth` | `waitForTransaction` and `movePackageService.getDatatype`; verify returned datatype identity, not just an HTTP success; bounded cancellable polling |
| `src/hooks/useAuthorizationContracts.ts` | Paginated `getOwnedObjects` of UpgradeCap and `getObject`; content fields linking capability to package | `listOwnedObjects({ owner, type, include: { content: true } })`, `getObject` with explicit required content; paginate, decode bytes/JSON without legacy response casts |
| `src/utils/authorizationTransaction.ts` | GraphQL wallet-owned PlayerProfile, then character-owned OwnerCap; JSON character ID and authorized turret ID | Preserve existing GraphQL transport and ownership/capability semantics; regression-test compatibility with the migrated wallet/execution paths |
| `src/utils/turretQueries.ts` | GraphQL character-owned turret caps, turret objects by ID; names/IDs/status content | Preserve existing GraphQL transport and all fields consumed by turret domain decoding |
| `src/utils/turretSimulationQueries.ts` | GraphQL owned profiles, individual turret/character reads, **global character object listing by type** for suggestions | Preserve existing GraphQL queries and global character suggestion semantics; no gRPC equivalent is required for these existing GraphQL paths |
| `src/utils/turretSimulationExecution.ts` | `devInspectTransactionBlock`, sender, last command `vector<u8>` return, abort errors | `simulateTransaction({ transaction, checksEnabled: false, include: { commandResults: true } })`; set sender, validate successful effects, command return type and bytes; decode existing BCS domain payload; never sign/execute |
| `src/hooks/useAuthorization.ts` | `queryEvents({ Transaction: digest })`, event JSON/type/module/package; per-turret confirmation | Prefer `getTransaction`/`waitForTransaction` with transaction-scoped events; validate authoritative turret evidence instead of historical indexing; missing evidence cannot confirm |
| `src/data/packageReferences.ts` | Minimal client existence check used by deployment preflight | Explicit `getObject`, matching package ID/type, unavailable/missing failure. Existing optional-client missing-method assumption must not survive the migrated maintained caller |
| `scripts/check-world-package-references.ts` | GraphQL package existence, exact registry type lineage, pinned publication digest, created package/registries | Preserve existing GraphQL verification, pinned digest/created-object identity, registry lineage, bundles, provenance and fail-closed diagnostics; regression-test without transport replacement |
| `src/utils/walrusGraphClient.ts`, `src/hooks/useGraphTransfer.ts` | Existing `SuiGrpcClient.$extend(walrus(...))`, read blob/write flow wallet signing | Retain extension and separate configured Walrus network; test upgraded SDK/wallet compatibility rather than replace transport |
| `scripts/debug-{local-publish,local-world,wasm-builder,remote-deploy-grade}-mcve.ts` | JSON-RPC transaction build/sign/execute and effects/package checks | Shared gRPC construction, signer execution and normalized effects/package extraction. Remote mutation scripts remain explicit opt-in, never run as smoke |
| `scripts/debug-turret-priority-mcve.ts` | JSON-RPC dev-inspect | Same read-only simulation and byte decoding adapter as maintained application |

Test migration surfaces: `src/__tests__/{WalletStatus,App,App.compilation,DeployWorkflowView,AuthorizeView,ColophonPage}.test.tsx`; `useDeployment.{success,progress,blockers}`, `useAuthorization`, `confirmation`, `publishLocal`, `turretSimulationExecution`, discovery/query/reference tests. Existing wallet/hook mocks do not establish transport parity; add actual hook/client and cross-origin HTTP coverage before production migration.

Sources: [method and native service mapping](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration), [gRPC service clients](https://sdk.mystenlabs.com/sui/clients/grpc), [new wallet integration](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/dapp-kit). Scope clarification: only existing JSON-RPC operations migrate to gRPC. Existing GraphQL Sui reads and existing gRPC integrations are preserved compatibility surfaces. The earlier all-gRPC interpretation was incorrect and is superseded by the clarified proposal, design, spec and tasks.

## 1.2 Registry release and peer evidence

Queried the npm registry directly on 2026-10-07 (`https://registry.npmjs.org/<encoded package>`); selected each registry `dist-tags.latest`, not a corpus-derived version. All selected releases were published on 2026-10-05.

| Package | Candidate exact version | Registry tarball integrity |
| --- | --- | --- |
| `@mysten/sui` | `2.35.0` | `sha512-ElJsFzPtMKrOTt5GHMlIN/Umfb+Xmh7OXPM+QjQc2i92mkGqNaTBikESqoYuF0d6x157Cw5WbtgXtiuJ13RBZg==` |
| `@mysten/dapp-kit-react` | `2.1.39` | `sha512-1ZoQ0krH6qZMZctmn9NPVuyt1MGdMvXMOs4grVS4MV7zKfyaOX8/L5PCj4LdJAmGgXU86Ywn5NJNWdm5kfFchA==` |
| `@mysten/dapp-kit-core` | `1.6.37` | `sha512-0vn0ZnQHGpvjcwxZx9OxSbnjLh2SXiFSR678NvX9AH7UK4j8UFK6hlP8rYqJVUhyi2hGM9XTorV0H+TpMbPYzQ==` |
| `@mysten/wallet-standard` | `0.21.33` | `sha512-raLw4Uq4YPQBXRtaywRkYGnJTQq0z/0gBf42r6FpXOaGL55njsth9pPy3cxDNzqsB0Hd4bgRt+RuC8aUj6kOQQ==` |
| `@mysten/walrus` | `1.2.34` | `sha512-qNy2REbfQNEwxqaDEKWzC4hKWuU7eYU7tpMsjzi2LZ3aEctapfz2qBTzoFtDyt9ZjRM6AzgBKjiVzNamJYnp0A==` |

Core, wallet-standard and Walrus each declare Sui peer `^2.35.0`. React kit depends on core `^1.6.37`, accepts React/types >=17; installed React/ReactDOM 19.3.0 satisfy the declared peer range, and TanStack Query supports React 19. Core depends on wallet-standard `^0.21.33`; wallet-standard pins `@wallet-standard/core` 1.1.2. SDK requires Node >=22; current Node is 24.21.0.

The repository manifest declares SDK 2.33.2, but installed node_modules contains 2.31.3; installed Walrus is 1.2.28 and wallet-standard 0.21.18. Do not mistake stale installed APIs for selected-release evidence. No dependencies installed yet. When dependency migration is approved after the spike, pin changed direct entries exactly (including wallet-standard, which is directly imported), retain lockfile cryptographic integrity, and verify the installed set. Peer compatibility is verified here; runtime/browser/local parity is **not** established by peer metadata.

## 1.3 Compatibility spike: incomplete; erroneous GraphQL blocker withdrawn

Selected-release declarations inspected from these version-specific sources:

- https://unpkg.com/@mysten/sui@2.35.0/dist/grpc/client.d.mts
- https://unpkg.com/@mysten/sui@2.35.0/dist/grpc/core.d.mts
- https://unpkg.com/@mysten/sui@2.35.0/dist/grpc/proto/sui/rpc/v2/state_service.client.d.mts
- https://unpkg.com/@mysten/sui@2.35.0/dist/grpc/proto/sui/rpc/v2/ledger_service.client.d.mts

The selected client exposes owned-object listing, object reads, transaction/event listing, simulation and Move package service access. StateService exposes ListOwnedObjects, ListDynamicFields, GetCoinInfo, GetBalance and ListBalances. Neither its state/ledger service declarations nor the top-level/core declarations provide a global current-object listing by Move type equivalent to the existing GraphQL `objects(filter: { type })` query.

`src/utils/turretSimulationQueries.ts:137` defines that query; `fetchCharacterSuggestions` routes nonempty character-ID searches into `fetchGlobalCharacterSuggestions` (around lines 291–381), which searches up to 20 pages and matches character name/ID/tenant. Preserve this GraphQL behavior rather than restrict searches, replace it with historical scans, or require registry enumeration.

**Correction:** The earlier global-character-discovery blocker resulted from incorrectly extending JSON-RPC → gRPC scope to existing GraphQL queries. The user clarified that existing GraphQL is preserved, and the artifacts now state this explicitly. Lack of a direct gRPC replacement for this GraphQL query is not a blocker. Required parity gates still apply to migrated JSON-RPC operations.

Available local tooling: Podman 6.1.2 responds to `podman info --format json`; the `docker` command reports the same Podman runtime. Sui CLI reports `sui 1.68.0-16bf4d124ac5`. Initial Docker-style info templates were incompatible with Podman; JSON inspection confirms runtime availability. No image selected/pulled and no validator or remote mutation started.

### Resumed compatibility spike (2026-10-07)

Selected SDK 2.35.0 was installed **only** in `/tmp/frontier-grpc-spike`, with scripts disabled. Its npm lockfile integrity matched the registry SHA512 recorded above; the registry still identifies 2.35.0 as latest. Repository dependencies and production code remain unchanged.

An isolated disposable Podman container ran the installed Sui CLI with `sui start --force-regenesis --committee-size 1 --fullnode-rpc-port 9000`, exposing only `127.0.0.1:19000`. Container image: `docker.io/library/node@sha256:05c08ce4291e9a58f59456a7985176defb12cdd42271f35ff81a3e167ea61d4c`. CLI: `sui 1.68.0-16bf4d124ac5`, binary SHA256 `c4afd3b878531ea5c99f5c1b8db68fa65bbbfc1adfe765414553b7488f4371b9`, read-only mounted into the container; genesis and state remained disposable inside it. No host keystore or persistent network configuration was used.

Verified SDK operations against that local validator, with finite 5–10 second abort/deadline bounds:

- `getBalance({ owner: '0x1' })`: `{ balance: { balance: '0', ... } }`; zero is a valid successful result.
- `listOwnedObjects({ owner: '0x1', limit: 1, include: { content: true } })`: `objects: []`, `hasNextPage: false`, `cursor: null`. This required state/indexing service is available without a separate PostgreSQL/GraphQL indexer; populated pagination parity is still required in task 4.3.
- `getObject({ objectId: '0x2', include: { content: true } })`: matching normalized object ID and `type: 'package'`. The option is **objectId**, not legacy **id**.
- `movePackageService.getDatatype({ packageId: '0x2', moduleName: 'package', name: 'UpgradeCap' }, { timeout: 8000 }).response`: matching `typeName`, `definingId`, `module`, `name`, and fields. Native service calls return a unary call; await **.response**, not the whole call object. TurretAuth readiness must validate identity in this response.
- `getTransaction` for the local genesis dependency digest with `include: { effects: true, events: true, objectTypes: true }`: discriminant `Transaction`, `status.success: true`, 127 changed objects, `events: []`. Required transaction-scoped evidence fields are available without historical event indexing. Empty events are not authorization evidence; actual authorization-event/state parity remains task 4.8.
- Read-only `simulateTransaction` of `0x1::bcs::to_bytes<vector<u8>>([1,2,3])`, sender `0x1`, `checksEnabled: false`: successful effects and return BCS bytes `[4,3,1,2,3]`. No signing or execution occurred. `commandResults` contains bytes but **drops the Move type**. Request `include: { commandResults: true, protoJson: true }` to retain `protoJson.commandOutputs[].returnValues[].value.name` (`vector<u8>`) and base64 `value`, or use the native service. Do not fabricate a type when normalizing the high-level result.

Browser verification used installed Chromium 145.0.7632.6 (explicit executable; the Playwright-selected revision 1243 is not installed). A bundled selected-release SDK ran from a locally fulfilled probe page at `https://frontier-flow.netlify.app/__grpc-spike`, carrying the **unchanged** production CSP from `netlify.toml`. Only the probe document/script were fulfilled; real cross-origin fullnode requests were not intercepted. `getBalance('0x1')` returned `90579153635`, and GetDatatype returned the expected UpgradeCap type, with no browser console errors. Observed POST paths:

- `/sui.rpc.v2.StateService/GetBalance`
- `/sui.rpc.v2.MovePackageService/GetDatatype`

Transport headers were `content-type`/`accept: application/grpc-web-text`, `x-grpc-web: 1`, `x-sui-client-protocol-version: 138`, and a native-service `grpc-timeout`. Successful actual responses demonstrate service access under the existing CSP, but do not by themselves prove preflight: Playwright document routing may affect CORS handling. The later unrouted, real-server probe below supplies the preflight evidence. The World API origin remains untouched. This probe is **not** the deployed-app smoke or built-app/test-wallet regression, which remain tasks 4.5 and 5.1.

## 1.4 Original-fault regression

Added `src/__tests__/WalletStatus.transport.test.tsx`: wallet account/discovery and unrelated identity reads are mocked, but `WalletStatus`, `useTargetBalance`, TanStack Query, SDK construction, fetch and response decoding remain connected. The fetch boundary rejects legacy envelopes/root requests and serves a protobuf/gRPC-web response encoding 12.5 SUI only at GetBalance. Before migration, `bun run test --run src/__tests__/WalletStatus.transport.test.tsx` failed with `legacyRequests` containing `https://fullnode.testnet.sui.io:443` rather than `[]`. This is the intended red baseline, not a successful hook mock. It must pass after migration before release.

No API-level JSON-RPC-to-gRPC parity blocker was found in these checks. Real extension publication, populated ownership/event semantics, cancellation, negative preflight fixtures, and application return decoding still require the later integration/regression tasks; none are claimed complete by this spike. GraphQL queries remain preserved.

### Local browser policy blocker: task 1.3 remains incomplete

A subsequent real Chromium request from the same probe origin/CSP to the loopback cross-origin responder failed with an explicit `connect-src` policy violation at `http://127.0.0.1:<fixture-port>/sui.rpc.v2.StateService/GetBalance`. The responder received **zero** requests: CSP blocked access before OPTIONS. This is a diagnosed CSP failure, not a guessed CORS cause.

`localEnvironment.ts` currently permits arbitrary HTTP(S) endpoint hosts, but production `connect-src` permits no local HTTP origins. Adding broad `http:`/`https:` permissions to preserve every configurable host would violate the narrow-policy guardrail. The artifacts do not specify whether production local-validator support should be loopback-only, explicitly allowlisted for other hosts, or restricted to development builds. Pause for that scope/policy decision before changing CSP or endpoint validation. Task 1.3 was returned to unchecked while awaiting the policy decision; successful public-browser/API checks do not waive the local-browser gate.

Task 2.2 release/integrity evidence was rechecked against the registry, and an installation trial succeeded with matching bun lockfile SHA512 entries. The dependency swap was then reverted (only this session's `package.json`/`bun.lock` edits) and original dependencies restored with `bun install --frozen-lockfile --ignore-scripts`: legacy imports must not be left unresolved while migration is paused. Task 2.2 remains unchecked. At that pause production wallet/balance paths were still legacy and the regression was red. The subsequent standalone balance migration below resolves the regression without prematurely swapping the wallet provider.

### Policy decision and follow-up verification

The user approved narrow loopback origins (`localhost` and `127.0.0.1`); other production hosts require an explicit reviewed allowlist. Added HTTP/HTTPS sources for only those hosts and configured ports to `netlify.toml`, retaining the World API origin and all other directives. Shared client construction rejects non-loopback local endpoints and URL credentials in production; development endpoints remain configurable.

A public-origin probe with the candidate policy still received Chromium's explicit loopback-network permission denial, before traffic. Granting the normal `local-network-access` permission allowed balance decoding; this is a browser permission, not a disabled security feature, and users may need to approve it. That routed-origin probe was not counted as actual preflight proof.

To avoid document-routing effects, a follow-up probe used a real loopback HTTP document/script server and a separate real cross-origin responder with **no Playwright routing**. The document carried the production CSP plus the approved narrow loopback entries. The responder recorded **OPTIONS followed by POST** to GetBalance, and the selected SDK decoded `12500000000`. From that same unrouted browser page, real public fullnode GetBalance/GetDatatype also succeeded. This supplies actual cross-origin preflight evidence, not a fulfilled transport response. It is not the built-app/wallet/deployed-origin smoke, which remains pending.

The policy decision is recorded in `design.md`. No required API/CSP compatibility blocker remains from task 1.3; application integration and later parity gates remain pending.

## 1.5 Fixtures and disposable procedure

Added `tests/fixtures/sui-grpc-responder.mjs` with successful binary balance response, HTTP 503 unavailable mode, and OPTIONS 403/no-CORS rejection mode. `node --test tests/fixtures/sui-grpc-responder.node-test.mjs`: **3 passed**. The explicit `node-test` suffix avoids Vitest collecting a Node test suite. Selected SDK 2.35.0 decoded the success body as `12500000000`. `docs/SUI-GRPC-LOCAL-VALIDATOR.md` records the tested digest-pinned Podman procedure and limitations. The spike container was removed; no remote signed writes occurred.

## 2.1 Shared target construction

Added `src/utils/suiTargetClient.ts` with native `SuiGrpcClient` construction, fresh target configuration resolution, and world/endpoint/account query identities. Existing Walrus construction/network remains independent and unchanged. `src/__tests__/suiTargetClient.test.ts`: **4 passed**, covering client network identity, logical-world/account separation, local endpoint changes, unchanged Walrus testnet configuration, and approved production loopback-only policy enforcement.

## 2.4 / 4.1 Balance migration and green regression

`useTargetBalance` now uses native `stateService.getBalance(...).response` through shared target-aware `SuiGrpcClient` construction. SDK inspection revealed that the high-level `getBalance` silently defaults missing fields to zero; the native boundary validates an explicit bigint balance and matching SUI coin type before normalization. Requests use an 8-second gRPC deadline and abort signal, one retry after 200 ms, and no focus-triggered retries. The endpoint is captured with the query identity so a retry cannot fetch a changed endpoint into an old cache key.

`WalletStatus` displays `SUI unavailable` rather than zero on failure and exposes an explicit retry action. Query/account/target/endpoint changes discard stale data. Wallet integration remains legacy until the broader provider/signing migration; standalone balance does not depend on the retired provider client.

Targeted run: `bun run test --run src/__tests__/WalletStatus.transport.test.tsx src/__tests__/WalletStatus.test.tsx src/__tests__/suiTargetClient.test.ts`: **28 passed**. The transport suite has nine cases: original #119 regression (now green), valid zero, unavailable service/retry bounds/user retry, omitted balance rejected, abort/deadline propagation, late account switch, late target switch, disconnect, and local endpoint changes. `bun run typecheck`: passed. This is not full release verification or the built-app/new-wallet browser test.

## 2.5 Browser policy

The approved narrowly scoped CSP entries were verified through the real-server cross-origin probe described above. Existing public gRPC services remain accessible, and the companion World API origin is retained. Full built-app wallet/CSP and deployed-origin smoke gates remain pending.

## Resume investigation: wallet client cache decision required

Registry revalidation on resume returned the same latest versions, SHA512 integrity and peer ranges recorded in section 1.2: SDK 2.35.0, React kit 2.1.39, core 1.6.37, wallet-standard 0.21.33 and Walrus 1.2.34. No repository dependency swap has been made.

Selected core source inspection (`src/utils/networks.ts`) shows `createNetworkConfig` memoizes each client by network in a private Map. There is no public cache invalidation API. `src/core/actions/sign-transaction.ts` closes over this cached `getClient` for transaction serialization; replacing only the exposed `kit.getClient` would not refresh signing. This is an integration design issue, not absence of a gRPC service.

A bounded, network-free reproduction against the isolated selected-release install constructed a kit with `['testnet', 'localnet']`, disabled auto-connect and Slush initialization, called `getClient('localnet')` at `http://127.0.0.1:19000`, changed the factory's endpoint to port 19001, switched localnet → testnet → localnet, then called `getClient('localnet')` again. Node assertions passed: both calls returned the same client and the factory had constructed the local client only once, using port 19000. Switching networks does not invalidate the cached endpoint. No fetch, signing, or submission occurred.

The user selected the stable wallet/endpoint-aware client approach; `design.md` records the approved amendment. Added `createEndpointAwareLocalSuiClient` to the shared construction boundary. Native service/core handles capture an endpoint for an operation, while subsequent access resolves endpoint edits without changing wallet chain identifiers. Three deterministic tests cover stable identity, actual binary transport endpoint changes, retained concrete handles, and lazy production-origin policy rejection. The real balance query still uses captured concrete clients, not this dynamic boundary.

Added `src/utils/suiWalletKit.ts`: a stable gRPC kit factory, separate v2 session key/legacy reconnect detection, and a signing-only target-snapshot helper. Serialization uses a concrete target client with an 8-second native request deadline and 15-second construction abort bound. It checks account/wallet/target/endpoint/cancellation before construction, before consent, and after signing; serialized JSON prevents re-resolving inputs through a cached client while awaiting consent. It never executes or retries. Eight tests use a registered test wallet to cover discovery/connect/account switch/disconnect, stable endpoint-aware client identity, legacy storage preservation, explicit chain/account signing, unsupported networks, context edits and cancellation. These test-only signatures are not cryptographic publication/authorization parity evidence.

A separate selected-release probe used the kit's actual signing closure and two loopback protobuf responders. After editing the local endpoint, the same kit/client/wallet identities produced one GetBalance POST at each responder. The test wallet called the kit's transaction wrapper but used a scoped serialization probe and fake signatures; no real signing/submission occurred.

Installed the five revalidated exact direct packages alongside legacy dApp Kit, with scripts disabled. Every changed bun lockfile SHA512 matches section 1.2. Legacy dApp Kit is intentionally retained until remaining consumers/provider/signing wiring can be swapped coherently. Tasks 2.2/2.3 remain unchecked: `main.tsx`, existing wallet UI/hooks, legacy signing callers, and the actual reconnect prompt have not yet been migrated. The new kit factory/helper are not yet wired into the application. Walrus remains independently configured for testnet.

Latest incremental gates: typecheck passed; lint passed with the pre-existing graph-transfer exhaustive-deps warning; full unit suite passed **105 files, 731 tests**, with one skipped file/test; security tests passed **4**; production build passed with existing chunk-size warnings. These checks do not complete task 5.2.

### Browser baseline failure and subsequent fixture correction

Installed the configured Playwright Chromium/headless-shell revision **1243** (Chrome for Testing **153.0.8010.12**) successfully. Ran `bun run test:e2e --project=chromium --workers=2 --max-failures=1`. The run stopped unsuccessfully: `tests/e2e/authorize.spec.ts:283` calls `postDataJSON()` for every fullnode request, so the migrated balance hook's binary/base64 gRPC-web GetBalance body throws `POST data is not a valid JSON object`. The authorization test also reported `Idle` where `Compiled` was expected; its cause is not established. The concurrently running authorization-readiness case was interrupted; do not report it as a proven separate failure.

The parser incompatibility was confirmed independently with the observed request body in an isolated Node container using the digest-pinned image from section 1.3. This is parser-level reproduction, not a containerized full browser-suite pass. The container was removed automatically. No security-disabling browser flags or remote mutations were used.

Initially paused for guidance as required on test failure. The user then requested the fixture fix, an updated handoff, and another pause to clear context.

Corrected the authorization fixture to branch on the GetBalance gRPC path before parsing remaining JSON-RPC bodies. It verifies POST, gRPC-web content type and absence of a JSON-RPC envelope, serves the shared binary success payload, rejects legacy `suix_getBalance`, and asserts decoded **12.5 SUI**. Exported `createSuiGrpcBalanceResponseBody` from the responder and added its `.d.mts` declaration so both responder and browser route share the same valid protobuf/framing. The balance span is hidden at the default desktop viewport, so its decoded text is asserted rather than its visibility; production CSS is unchanged.

Verification: isolated authorization Chromium workflow **1 passed**; authorization plus readiness with two workers **2 passed**; targeted balance/client/kit unit suites **20 passed**; Node responder suite **3 passed**; typecheck passed; lint passed with the existing graph-transfer warning. The compilation assertion passed without production changes; no separate compilation defect was established. Full browser verification was not rerun. Routed responses are not evidence of genuine preflight or production CSP, and this does not complete tasks 4.5/5.2.

The fixture blocker is resolved. Paused at the user's request after updating `HANDOFF.md`. Next resume should continue coherent 2.2/2.3 provider/UI/signing migration, then remaining operations and fixtures. Overall progress remains **9/29**, with no additional complete OpenSpec task claimed. No remote mutation, commit, archive or deployment occurred.

## Resume: React provider increment and signing-construction blocker

Revalidated the five selected latest releases against npm: SDK 2.35.0, React kit 2.1.39, core 1.6.37, wallet-standard 0.21.33, Walrus 1.2.34. Versions, peer ranges and SHA512 hashes still match section 1.2. Configured Chromium baseline passed **37 tests, 1 skipped** (`bun run test:e2e --project=chromium --workers=2 --max-failures=1`); this is the pre-provider-migration baseline, not task 5.2 completion.

Added `src/components/FrontierWalletProvider.tsx`: stable React `DAppKitProvider` boundary, explicit legacy-session reconnect notice, preserved legacy storage/graphs, and graceful unavailable-storage handling. Added `src/__tests__/FrontierWalletProvider.test.tsx` with five real-provider cases covering reconnect messaging, v2 storage, discovery/connect/account changes/disconnect without signing, stable kit/client identities across rerenders/local endpoint edits, and blocked storage. **Not wired into main.tsx yet**; application consumers remain legacy. Focused provider/kit tests: **13 passed**; typecheck passed; lint passed with the existing graph-transfer warning. No OpenSpec checkbox was completed.

### Confirmed blocker: JSON serialization does not pin transaction construction

Selected SDK source `src/transactions/Transaction.ts` shows `toJSON` calls `prepareForSerialization`, not `#prepareBuild`. Its documented distinction explicitly permits unresolved object versions and missing gas payment/price/budget. Only `build`/`getDigest` invoke the build-resolution plugins. Selected core `src/core/actions/sign-transaction.ts` forwards a string unchanged to the wallet's `transaction.toJSON()` wrapper. Therefore `signTargetTransaction`'s current claim that serialization pins construction is incorrect: ordinary unresolved objects/gas may still be resolved by the wallet after consent begins, outside the captured target client's endpoint/deadline boundary. The post-sign context check detects application endpoint edits but does not establish where the wallet resolved the inputs.

Network-free reproduction passed in a disposable read-only container with `--network none --cap-drop=all --security-opt=no-new-privileges`, the same digest-pinned Node image recorded above, and the repository mounted read-only. With SDK 2.35.0, a real transaction containing an unresolved object transfer and a sender was serialized using a client proxy that throws on any access. Assertions confirmed **zero client reads**, retained `UnresolvedObject`, null gas price/budget/payment, `isFullyResolved() === false`, and the same unresolved state after `Transaction.from(json)`. No network, wallet signing, or submission occurred. The container was automatically removed.

This supersedes the earlier helper safety claim. Existing helper unit tests mock `toJSON` or inspect its options and do not prove fully resolved construction; the earlier signing-closure probe only established endpoint-aware access for its scoped probe, not transaction resolution parity.

**Paused for reviewed design/implementation guidance before wiring consumers.** Recommended amendment: fully resolve/build using the captured concrete client within bounded construction reads, assert fully resolved state, then pass that resolved transaction JSON for wallet review/signing; retain account/target/endpoint checks around consent and submission. This requires real transaction-resolution/consent tests (including wallet gas-modification behavior) rather than another mocked successful serialization. Alternative: an explicitly reviewed pinned-client signing boundary that preserves wallet-side gas selection while preventing input resolution from changing validators. Do not wire or mark 2.3 complete on the current assumption.

### Approved amendment and in-progress implementation

The user approved **build before consent**. `design.md` now requires fully resolved construction on the captured concrete client and rejection of wallet-modified transaction bytes, including gas, without submission. Updated `signTargetTransaction` to build with the captured client, bound construction with abort/deadline handling, require `isFullyResolved()`, serialize without a client, and compare the wallet-returned bytes with the constructed BCS. Existing helper tests now use actual offline-buildable transactions instead of mocked successful JSON; their eight cases and the five provider cases still pass (**13 passed**).

Added `src/__tests__/suiWalletConstruction.test.ts` intending to exercise the real SDK resolver with binary gRPC simulation responses, object/gas resolution, changed wallet gas, endpoint changes, malformed/failed responses and construction cancellation. Initial run: **6 failed, 13 passed**. All six new cases stop at **test wallet not discovered**, before any construction or transport assertion runs. The new fixture advertises only `sui:localnet`, while `createFrontierDAppKit` defaults to testnet. Selected core `src/core/store.ts:56–60` filters discovered wallets against the current network. This explains the fixture setup incompatibility; it is not evidence of a construction-adapter failure.

Per the requested apply guardrail, paused on this test error before changing the fixture. Proposed correction: explicitly switch the test kit to `localnet` before discovering/connecting its localnet-only test wallet (or advertise both supported chains, as the existing lifecycle fixtures do). Re-run the new construction suite, then typecheck/lint and proceed with coherent provider/UI/signing wiring. Typecheck/lint were **not rerun after the signing amendment**, because the sequential gate stopped at the new fixture failure. The construction change is still unverified by its new transport tests; do not mark 2.3 complete.

### Fixture correction approved; cancellation propagation blocker confirmed

The user approved selecting localnet before fixture discovery. Added `kit.switchNetwork("localnet")` to the construction wallet setup. Re-run: **18 passed, 1 failed** across provider/helper/construction suites. Discovery is now resolved. Five real construction cases pass: binary gRPC object/gas resolution before consent with offline-buildable reviewed JSON; wallet gas modification rejected without execution; endpoint edits during construction rejected before consent; malformed construction response rejected; failed effects rejected. These are actual SDK build/resolver calls and protobuf framing, not mocked `toJSON` success. No remote signing/submission occurred (fixture signatures are test-only).

The remaining cancellation test fails with **Missing transport abort signal**, before the fixture triggers its intended cancellation. Source inspection confirms a production cause: selected SDK `src/grpc/client.ts:159–172` explicitly destructures and discards constructor `abort` (`abort: _abort`) before creating its transport. `createSuiTargetClient` currently spreads `requestOptions.abort` into that constructor, so the concrete client does not propagate the construction signal to the resolver's native SimulateTransaction call. The helper's `withConstructionAbort` bounds the awaiting caller but does not cancel that HTTP request. The previously passing explicit native balance cancellation passes its own per-call abort and is unaffected.

**Paused on this newly confirmed error**, as requested. Recommended remediation for review: use the SDK's supported custom `RpcTransport` boundary to apply/combine the operation-scoped construction abort signal at native RPC invocation (while preserving per-call cancellation, deadlines, protocol headers and pinned endpoint), and test actual fetch cancellation. Do not patch dependencies or claim constructor-level abort propagation works. The construction test failure remains unresolved; typecheck/lint after the signing amendment were not run because the sequential test gate stopped. Progress remains **9/29**, production wallet wiring remains legacy.

### Cancellation remediation approved and verified

The user approved proceeding with the supported transport-boundary fix. `createSuiTargetClient` now uses an SDK-exported `GrpcWebFetchTransport` wrapped as `RpcTransport` for clients with an operation-scoped abort signal. After SDK/native/Core options merging, it preserves that signal and combines it with a distinct per-call signal using `AbortSignal.any`. Native method bindings remain on the SDK transport; SDK protocol metadata and configured/per-call deadlines are retained. Clients without an operation signal retain their normal construction path. No dependency source or package versions were changed.

Added `src/__tests__/suiTargetClient.cancellation.test.ts` with four regressions: Core's undefined per-call signal cannot erase operation cancellation; either operation or explicit per-call cancellation aborts the fetch; an already-aborted operation cannot be replaced by a live call signal. Tests assert the service path, gRPC content type, protocol header, default 8-second deadline and explicit shorter 1-second deadline. A first assertion assumed synchronous Core fetch invocation; corrected it to wait for the real async Core call to reach fetch. Lint-only arbitrary rejection reasons in the signing helper and fixtures were normalized to Error objects without replacing existing Error reasons.

Reproduced the failure and verified the fix with actual Node fetch/HTTP sockets in a read-only digest-pinned disposable container (`--network none --cap-drop=all --security-opt=no-new-privileges`). Loopback HTTP responders were created inside the container; no public network was available. The baseline selected-release client left its pending HTTP request connected after constructor abort. The bundled actual application `createSuiTargetClient` cancelled the real pending gRPC request for both operation-level and explicit per-call cancellation, and the responder observed connection closure. Deadline and SDK protocol headers remained correct. The container was automatically removed; no signing/submission occurred. Temporary probe files: `/tmp/frontier-grpc-target-client.mjs` and `/tmp/frontier-grpc-cancel-probe.mjs`; bundle created with `bun build ./src/utils/suiTargetClient.ts --target=node --format=esm --outfile=/tmp/frontier-grpc-target-client.mjs --define import.meta.env.PROD=false`. These are expendable verification artifacts, not maintained source.

Verified gates after the fix:

- Focused construction/cancellation/provider/kit/balance/client suites: **39 passed / 7 files**.
- All six real SDK construction cases pass, including transport cancellation before consent. The earlier constructor-abort and fixture-discovery failures are resolved.
- `bun run typecheck`: passed.
- `bun run lint`: passed, retaining the pre-existing `useGraphTransfer.ts:245` exhaustive-deps warning.
- `bun run test:run`: **108 files passed, 1 skipped; 746 tests passed, 1 skipped**; **4 security tests passed**.
- `bun run build`: passed, retaining the chunk-size warning.
- Configured Chromium suite: **37 passed, 1 skipped** (`--workers=2 --max-failures=1`).

There is no outstanding cancellation or fixture blocker from this increment. Overall OpenSpec progress remains **9/29** because coherent 2.2/2.3 provider/UI/consumer signing migration is still pending; main.tsx and existing consumers remain legacy, and the new React provider is not yet wired. These are incremental gates, not completion of 5.2 or actual local-validator mutation parity. No commit, archive, deployment, or remote mutation.

## Incremental validation and operator-requested pause

After fixing lint-only issues in the new transport fixtures, `bun run lint` passed with the existing `useGraphTransfer.ts:245` exhaustive-deps warning. `bun run build` passed with a chunk-size warning. Full `bun run test:run` passed: **103 files passed, 1 skipped; 720 tests passed, 1 skipped**, plus **4 security tests passed**. The Node responder suite passed **3 tests**. These are incremental checks, not completion of task 5.2 while the wallet/operation/browser/mutation migration remains unfinished.

Paused at the user's request after this validation task, with **9/29 OpenSpec tasks complete**. `HANDOFF.md` captures exact repository state, nuanced SDK/browser findings, transient dependency installation/restoration, remaining work, and resume commands. No commit, archive, deployment, or remote mutation was performed.

## Local validator mutation parity (task 4.8)

Exercised on an isolated Podman container `frontier-grpc-parity`, image `docker.io/library/node@sha256:05c08ce4291e9a58f59456a7985176defb12cdd42271f35ff81a3e167ea61d4c`, `--pull=never`. The host Sui CLI `1.68.0-16bf4d124ac5` matched the recorded SHA256 and was mounted read-only. Genesis stayed inside the container (`HOME=/tmp`, `--force-regenesis`). Ports were `127.0.0.1:9000` and `127.0.0.1:9123` only. Keys were ephemeral faucet recipients, not a host keystore. No remote signed write was used. The container was removed after the run.

Results against `http://127.0.0.1:9000`:

- Publication used `SuiGrpcClient.signAndExecuteTransaction` plus the application `readSuccessfulSuiTransaction` / `extractPublishedPackageId` path. A minimal `TurretAuth` package published successfully.
- `confirmPublishedPackageWithClient` returned `confirmed: true` with the same digest and package id, after native GetDatatype identity checks. A digest alone was not treated as confirmation.
- Authorization used `executeSignedGrpcTransaction` with test-only signed bytes, then `createAuthorizationChainClient("local")`. Effects became visible only after a short poll, so `waitForEffects` now retries not-found reads until its deadline instead of failing the first lookup. The successful read returned `success: true`, one transaction-scoped `Authorized` event with the published package/module/type, and `isTurretAuthReady` true.
- Object-dependent simulation needed the created objects to be visible to GetObject. After that visibility wait, `simulateTransaction` with checks disabled returned native `vector<u8>` for the same Move call shape the application uses. `runTurretSimulation` still returns `execution-error` for `targetId: "local"` without a request, which is the existing unsupported-local boundary, not a transport success.
- Freshly created objects and transactions are not immediately visible to gRPC reads on this node. Callers must poll. This run did not prove EVE Frontier world-package authorization or Walrus publication; those packages were not present, and no remote substitute was used.
