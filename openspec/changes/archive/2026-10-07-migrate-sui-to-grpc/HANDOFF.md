# migrate-sui-to-grpc — implementation handoff

## Latest handoff — resume from 20/29

**This section supersedes every historical section below.** Those sections still describe a 9/29 or 11/29 pause, an unwired provider, legacy signing, and a confirmation lint blocker. Those statements are stale. Do not follow them.

**Progress: 20/29 complete, 9 remaining. Not release-ready.** Branch: `main`. No commit, push, archive, deployment, or remote signed write. Companion directories `openspec/changes/restore-world-api-connectivity/` and `openspec/changes/remediate-source-map-js-advisory/` predate this work. Do not delete or overwrite them.

Routine stale assertions and straightforward lint fixes may be corrected without asking. Pause for a design change, a live remote write, or an unresolved parity blocker.

### Start here

1. Read this section, then `proposal.md`, `design.md`, `tasks.md`, and `specs/sui-grpc-connectivity/spec.md`.
2. Ignore historical claims that `main.tsx` is still on `@mysten/dapp-kit`, that publication still uses `objectChanges`, or that confirmation lint is red.
3. Continue with the open tasks below, in this order: **3.6, 4.3, 4.4, 4.5, 4.6, 4.8, 5.1, 5.2, 5.4**.
4. Do not archive or commit unless the user asks, and not before 5.2 is actually green.

### What is done

Checked tasks: **1.1–1.5, 2.1–2.5, 3.1–3.5, 3.7, 4.1, 4.2, 4.7, 5.3**.

- Legacy `@mysten/dapp-kit` is removed from `package.json`. Direct pins remain `@mysten/sui` **2.35.0**, `@mysten/dapp-kit-react` **2.1.39**, `@mysten/dapp-kit-core` **1.6.37**, `@mysten/wallet-standard` **0.21.33**, `@mysten/walrus` **1.2.34**. Lockfile SHA512 entries for those five packages still match the recorded registry integrity. Do not bump them from memory.
- `src/main.tsx` uses `FrontierWalletProvider`. The kit instance stays stable across local endpoint edits. Legacy `frontier-flow:sui-wallet` storage prompts reconnect and does not delete graphs or authorize signing.
- Wallet-signed publish uses `signTargetTransaction` plus `executeSignedGrpcTransaction` on a captured target client. Local ephemeral publish uses `SuiGrpcClient.signAndExecuteTransaction`. Package identity comes from one Created/PackageWrite object, not `objectChanges`.
- Confirmation polls GetTransaction, then native GetDatatype for TurretAuth. A digest alone is not success. `AmbiguousSubmissionError` is unresolved and must not trigger another signature.
- Authorization execution, effects, transaction-scoped events, and TurretAuth readiness use `createAuthorizationChainClient`. GraphQL discovery and ownership queries are unchanged.
- Diagnostic scripts import `scripts/lib/suiGrpcDiagnostic.ts`. `scripts/security/no-legacy-sui-jsonrpc.mjs` is part of `bun run test:security` and excludes tests plus historical docs.
- Versions, reconnect, mapping, rollback, and local-validator notes are in `docs/SUI-GRPC-LOCAL-VALIDATOR.md`.

### Latest verification — not 5.2

- `bun run test:run`: **796 passed / 111 files**, 1 skipped file/test, plus **5 security tests** including the JSON-RPC guard.
- `bun run typecheck` passed.
- `bun run lint` passed with only the pre-existing `src/hooks/useGraphTransfer.ts:245` exhaustive-deps warning.
- `tests/e2e/sui-grpc-browser-transport.spec.ts` passed **2 Chromium tests** against the Vite dev server and `tests/fixtures/sui-grpc-responder.mjs`. That is a real cross-origin balance/preflight check. It is **not** a production build and **not** production CSP. Do not check 4.5 from it.
- Production build and the full Chromium suite were **not** rerun after the wallet/publication/authorization increment. The older 37-passed Chromium figure is historical.
- `scripts/sui-grpc-readonly-smoke.mjs` exists and is opt-in (`FRONTIER_SUI_GRPC_SMOKE=1`). It was not run. Unavailable smoke is unsuccessful, not a pass.

### Open tasks and next actions

1. **3.6** Prove Walrus graph read/publish still uses the independent testnet client. `useGraphTransferWalletBridge` passes `network: "testnet"` to `kit.signAndExecuteTransaction`. Add a regression that an endpoint edit or local target cannot retarget that call. Do not replace the Walrus transport.
2. **4.3** Add the missing authorization/simulation parity cases: paginated reads, partial batch failure, ownership/network rejection, decoded return bytes, and execution errors. Some chain-mismatch and ambiguous-submission cases already exist in `src/__tests__/useAuthorization.test.ts`; do not treat that file as complete 4.3 coverage.
3. **4.4** Run package-reference integrity, preserved GraphQL discovery/ownership/simulation-query, and Walrus transfer regressions. GraphQL must stay GraphQL.
4. **4.5** Add a **built-app** Playwright test under production-equivalent CSP. The current responder spec is only a partial fixture. It must still reject JSON-RPC envelopes and must not mock `useTargetBalance`.
5. **4.6** Run companion List of Tribe success/failure tests with Sui unavailable. Assert World API usability and no return to the obsolete hostname.
6. **4.8** Exercise publish, confirmation, authorization, and simulation on an isolated gRPC local validator with test-only keys. Record the result. Never substitute a remote write.
7. **5.1** Run the opt-in read-only smoke from the deployed browser origin, or record it unsuccessful. Do not substitute fixture results.
8. **5.2** Then run lint, typecheck, `bun run test:run`, production build, and the deterministic browser suite. The original balance regression must still pass.
9. **5.4** Archive only after that, and only before a requested final signed, attributed commit. Never disable commit signing.

### Boundaries

- No JSON-RPC fallback and no new GraphQL fallback for a migrated operation.
- Do not recreate the wallet kit on local endpoint edits. Mutating flows must build on the captured client before consent and reject wallet-changed bytes.
- Preserve `restore-world-api-connectivity` and `remediate-source-map-js-advisory`.
- Executor suite path is `src/__tests__/deploymentExecutor.test.ts`, not `src/__tests__/executor.test.ts`.

```sh
bun run test --run src/__tests__/WalletStatus.transport.test.tsx src/__tests__/confirmation.test.ts src/__tests__/useAuthorization.test.ts src/__tests__/useDeployment.success.test.ts src/__tests__/FrontierWalletProvider.test.tsx
bun run typecheck
bun run lint
bun run test:run
```

## Historical handoff — operator-requested pause after simulation, reads and partial confirmation migration

**Historical only. Do not use this section for resume.** It recorded 11/29 and a confirmation lint pause that has since been fixed. User requested that pause. Routine stale assertions/fixtures and straightforward lint fixes may be corrected without asking each time; pause for substantive blockers, unclear requirements or design decisions.

### Completed this continuation

- **3.5** checked: real target-aware, read-only gRPC turret simulation, sender, disabled checks, explicit native successful effects, actual `vector<u8>` return type, normalized/native BCS consistency and existing domain decoding. No signing, submission or retry; eight-second transport/deadline bound. Preserved GraphQL queries/suggestions and existing local exclusion.
- Added six session cancellation tests in `src/__tests__/useTurretSimulation.cancellation.test.ts`: account change, disconnect, deployment change, close, superseding run and unmount. Fixed stale-state behavior so cancelled runs cannot leave the current session running or overwrite new context. Simulation boundary's ten actual SDK/protobuf transport cases pass.
- Fixed stale `AuthorizeView` owner assertion to `0x333` and migrated its success/error tests and browser simulation route to binary gRPC; legacy dev-inspect route rejects. The old assertion blocker is resolved.
- **3.1** checked: `useAuthorizationContracts.ts` defaults to a captured gRPC client; paginated owned UpgradeCap reads use explicit content, BCS decoding, owner/type/content/object identity checks, cursor repetition/missing-cursor/page-limit rejection and an overall 15-second operation bound. Reads are sequential rather than unbounded package fan-out. Native GetPackage descriptors select declared TurretAuth modules and retain deterministic witness-only fallback. Cancelled/earlier-account discovery is discarded.
- `packageReferences.ts` minimal World-package existence check now uses gRPC and requires matching package identity/type/version/digest. Unsupported clients and unavailable/malformed reads fail closed. `DeployWorkflowView.tsx` and `useDeployment.ts` use this target-aware check, and deployment no longer continues optimistically on verification failure. Added no-consent/no-compile tests for unavailable/missing package evidence.
- Existing GraphQL registry/lineage/provenance verification and package bundles remain unchanged. The maintained diagnostic scripts remain a later 3.7 task.

### Latest fully green baseline (before subsequent confirmation edits)

- Focused read/discovery/UI/deployment/reference suites: **71 passed / 6 files** (before adding two extra fail-closed deployment cases).
- Full unit suite: **786 passed / 110 files**, one skipped file/test; **4 security tests passed**.
- Typecheck and lint passed, with only existing `useGraphTransfer.ts:245` exhaustive-deps warning.
- Production build passed with existing mixed-import/chunk-size warnings.
- Configured Chromium: **37 passed, 1 skipped**, using two workers.
- These are incremental gates, not 5.2 completion. Routed binary responses are not actual preflight/CSP or local-validator mutation parity evidence.

### In-progress confirmation increment — unchecked

- Started **3.3** before completing wallet/provider/3.2 integration. New `src/utils/suiTransactionResult.ts` validates explicit native plus normalized successful status and matching digest, and extracts exactly one Created/PackageWrite object instead of legacy objectChanges. It is intended for publication too, but publication has not yet been migrated.
- Rewrote `src/deployment/confirmation.ts`: bounded read-only GetTransaction visibility polling (20 seconds), followed by native GetDatatype readiness (30 seconds); verifies TurretAuth module/name/defining ID/type name; rejects missing effects/package evidence or mismatched known package ID; supports aborts and captured target endpoint. No digest-only success or submission. Generic callback confirmation retains bounded retries/abort-listener cleanup.
- `src/hooks/useDeployment.ts` now invokes the gRPC confirmer without a legacy client; removed its JSON-RPC constructor/import. Its **wallet signing/execution remains legacy** pending 2.2/2.3/3.2.
- `src/deployment/executor.ts` default confirmation now uses the real gRPC confirmer rather than an always-null placeholder. Rewrote confirmation fixtures/tests and updated real remote deployment success fixtures. New helpers: `src/test/suiGrpcMocks.ts`, `src/test/suiTransactionFixtures.ts`.
- Latest focused confirmation + deployment success run: **22 passed / 2 files**. The command also supplied nonexistent `src/__tests__/executor.test.ts`, which Vitest ignored; actual executor suite is **`src/__tests__/deploymentExecutor.test.ts`** and must be run.
- Fixed a TypeScript async-control-flow narrowing issue via `assertConfirmationActive`; **latest typecheck passes**.
- **Current verification blocker: lint fails** on `src/deployment/confirmation.ts:73`, `Promise<unknown | null>` (`no-redundant-type-constituents`; unknown already includes null). Also new complexity warnings in `confirmPublishedPackageWithClient`, `hasExpectedDatatype`, and `readSuccessfulSuiTransaction`, plus the existing graph-transfer warning.
- A batched edit intended to fix lint/refactor complexity failed its first exact-text match and applied **no changes**. Actual indentation at line 73 is two spaces before `options`, not four. User requested pause before retrying. Fix return type/refactor small helpers, then rerun focused confirmation/deployment/executor suites, typecheck/lint, full unit/security/build and Chromium. **Do not mark 3.3 or 4.2 complete yet.** Full tests/build/browser have not been rerun after this confirmation increment.

### Resume priorities and boundaries

1. Correct the simple confirmation lint issue and complexity warnings without another approval question; verify current increment (commands below).
2. Complete 3.3 only after its actual obligations are verified, then migrate publication (3.2), wallet/provider/UI/signing consumers (2.2/2.3), authorization (3.4), Walrus parity and remaining diagnostic/runtime cleanup.
3. The new `FrontierWalletProvider` is still **unwired**; `main.tsx`, WalletStatus, App graph wallet bridge and authorization integration still use legacy dApp Kit. Preserve the already-approved stable endpoint-aware wallet kit and full build-before-consent signing helper/cancellation fix. Do not remove legacy dependency before all imports are coherently migrated.
4. All dependency versions/peers/hashes were revalidated against npm and unchanged. No package.json/bun.lock changes in this continuation (their pre-existing migration changes remain). Preserve companion changes `restore-world-api-connectivity` and `remediate-source-map-js-advisory` and all original modifications.
5. No new container reproduction or local-validator mutation parity was run in this continuation. No remote signing/submission, commit, push, archive, deployment or PR. Archive only after successful completion, before any requested final signed/attributed commit.

```sh
bun run test --run src/__tests__/confirmation.test.ts src/__tests__/useDeployment.success.test.ts src/__tests__/deploymentExecutor.test.ts
bun run test --run src/__tests__/useAuthorizationContracts.test.ts src/__tests__/packageReferences.grpc.test.ts src/__tests__/packageReferences.test.ts src/__tests__/turretSimulationExecution.test.ts src/__tests__/useTurretSimulation.cancellation.test.ts src/__tests__/AuthorizeView.test.tsx src/__tests__/DeployWorkflowView.test.tsx
bun run typecheck
bun run lint
bun run test:run
bun run build
bun run test:e2e --project=chromium --workers=2 --max-failures=1
```

## Historical resume — simulation increment paused on a stale fixture assertion

Historical. Superseded by the 20/29 section at the top. Overall progress was then **9/29**; no additional task checkbox was completed. Wallet provider/consumer integration remained pending.

- Read all OpenSpec context and revalidated the same five latest npm releases, peers and SHA512 hashes; dependencies were not changed in this resume.
- Inspection confirmed wallet consumers remain coupled to legacy operation client types. Started the standalone **3.5 simulation boundary** before the coherent provider swap, avoiding a temporary legacy-client compatibility layer.
- `src/utils/turretSimulationExecution.ts` now defaults to a captured target gRPC client, sets sender, requests read-only simulation with checks disabled and effects/command results/proto JSON, validates explicit native successful effects and the actual `vector<u8>` type, cross-checks normalized/native BCS bytes, and retains existing domain decoding. Eight-second request/deadline/cancellation bound; no signing, execution, or retries. Local simulation stays unsupported as before.
- `src/hooks/useTurretSimulation.ts` no longer depends on the legacy dApp Kit type/client. It cancels prior requests on close/context changes/new runs and ignores cancelled/stale completions. `AuthorizeView.tsx` no longer supplies its legacy client to simulation; its other operation consumers remain unchanged. GraphQL query/suggestion code is unchanged.
- Rewrote the simulation test to use actual SDK + binary protobuf/gRPC-web fetch responses: **10 tests pass**, covering decoded domain results, request path/sender/masks, failed/missing effects, missing/wrong return type, omitted return bytes, malformed BCS, unavailable service, cancellation and local/pre-cancelled requests.
- `src/test/turretSimulationMocks.ts` now exposes binary gRPC simulation fixtures; migrated `AuthorizeView.test.tsx` simulation cases and the authorization browser route. The browser route rejects legacy dev-inspect envelopes. These routed fixtures are not actual preflight evidence.
- **Current blocker:** focused two-file run has **28 passed, 1 failed**. `AuthorizeView.test.tsx:406` still expects `0xownercharacter`, after its owner mock was intentionally changed to SDK-valid `0x333` for real serialization. The actual simulation success/failure UI cases pass. Paused per apply error guardrail before changing this assertion.
- **Next action:** obtain guidance to correct the stale expected owner ID, rerun the focused suites, then typecheck/lint and the authorization Chromium workflow. Add hook cancellation/stale-session coverage and complete 3.5 only after verification; resume coherent wallet and remaining operation tasks afterward.
- Typecheck passed after the initial boundary changes, **before** the latest fixture/UI edits. Typecheck/lint/browser/full gates have not been rerun after those edits because the sequential gate stopped at the stale assertion. Task 3.5 is partial/unverified as a whole. No commit, archive, deployment or remote mutation; all companion changes preserved.

Updated after the user-approved construction cancellation fix. **Cancellation and fixture blockers are resolved; migration remains partial and not release-ready.** Resume coherent 2.2/2.3 integration, not exploration from scratch.

## Historical verified state — superseded by the 20/29 section

- User approved the supported transport-boundary cancellation fix. `createSuiTargetClient` now supplies an operation-scoped `RpcTransport` for clients with abort signals, combining operation and per-call cancellation after options merge. SDK protocol headers/deadlines retained; dependencies untouched.
- Added `src/__tests__/suiTargetClient.cancellation.test.ts` (four cases). All six real SDK construction tests now pass, including actual transport signal cancellation before consent. Normalized arbitrary abort rejection reasons for lint without replacing existing Error reasons.
- **Actual container HTTP reproduction:** selected-release constructor abort left the pending loopback gRPC request connected; bundled application factory cancelled real HTTP sockets for operation and per-call aborts. Digest-pinned disposable Node container, network disabled except internal loopback; removed automatically. No public requests/signing/submission.
- Gates: **39 focused tests / 7 files**; full suite **746 passed / 108 files**, one skipped file/test; **4 security tests**; typecheck/lint/build passed with existing graph-transfer/chunk warnings; configured Chromium **37 passed, 1 skipped**.
- Overall progress **9/29**; no new OpenSpec checkboxes completed. New React provider/reconnect component remains **unwired**; main.tsx and existing consumers remain legacy. The next step is coherent **2.2/2.3 provider/UI/signing consumer integration** using the corrected full-build signing helper, then operation/parity tasks.
- Current new increment files: `FrontierWalletProvider.tsx`, five provider tests, corrected `suiWalletKit.ts`/eight helper tests, six construction tests, corrected `suiTargetClient.ts`, four cancellation tests, design/evidence updates. All companion changes preserved. No commit, archive, deployment or remote mutation.

## Historical blocker — superseded; cancellation was later fixed

- User approved switching the construction test kit to localnet; fixture discovery is fixed.
- Latest focused provider/helper/construction run: **18 passed, 1 failed**. Five real SDK build/resolver cases now pass with actual protobuf/gRPC-web responses: object/gas resolution before consent, offline-buildable reviewed JSON, wallet gas modification rejection, endpoint edit rejection, and malformed/failed construction responses. No actual signing/submission (test signatures only).
- Remaining cancellation test fails at **Missing transport abort signal**. Selected SDK `src/grpc/client.ts:159–172` explicitly discards constructor `abort`, so `getSuiTargetClient(..., { abort })` does not propagate the construction signal to native resolution fetch. The helper's local abort race stops waiting but cannot cancel the HTTP request. The balance path's explicit per-call abort is unaffected.
- Recommended reviewed remediation: supported custom `RpcTransport` boundary applying/combining operation-scoped abort at native RPC invocation, retaining per-call signals, deadlines, protocol headers and pinned endpoint. Do not patch dependencies or rely on constructor abort forwarding.
- Paused per apply error guardrail. Typecheck/lint were not rerun after the signing amendment because sequential verification stopped at tests. **No completion claim** for the construction helper or production wiring; progress remains **9/29**.
- Current changes also include the unwired `FrontierWalletProvider.tsx`, its five tests, amended signing helper/eight existing tests, new six-case construction suite, and approved `design.md` amendment. All companion changes preserved. No commit, archive, deployment or remote mutation.

## Historical amendment state — superseded by the 20/29 section

- User approved **build before consent**. `design.md` records captured-client full construction, fully resolved JSON and fail-closed rejection of wallet-changed BCS (including gas).
- Updated `src/utils/suiWalletKit.ts` to implement that boundary with construction abort/deadline handling. Updated existing eight helper tests to use real offline-buildable transactions. These and the five provider tests pass (**13 passed**).
- Added `src/__tests__/suiWalletConstruction.test.ts` with six intended real-resolver/binary-gRPC cases. **All six currently fail before construction at `Test wallet not discovered`.** The fixture advertises only localnet, while the kit defaults to testnet; selected core filters discovered wallets by current network. No new construction/transport assertions have yet been exercised successfully.
- Per apply instructions, paused on this error before fixing the fixture. Recommended next action: explicitly switch the test kit to localnet before wallet discovery, keeping its localnet-only account/chain. Then rerun construction tests and typecheck/lint (not rerun after signing amendment because the test gate stopped), and continue 2.2/2.3 wiring.
- Production main/provider/consumers remain legacy; the new provider remains unwired. Progress **9/29**, no new OpenSpec checkbox completed. No remote mutation, commit, push, archive or deployment.

## Historical resume state — superseded by the 20/29 section

- Progress remains **9/29**; no new OpenSpec checkboxes completed. Tasks 2.2/2.3 remain partial.
- Revalidated the same five latest dependency releases, peers and SHA512 hashes against npm.
- Full configured Chromium baseline: **37 passed, 1 skipped**. This is before the provider migration, not completion of 5.2.
- Added `src/components/FrontierWalletProvider.tsx` and `src/__tests__/FrontierWalletProvider.test.tsx`: stable React kit boundary and explicit reconnect notice; real provider lifecycle, account switching, endpoint identity and blocked-storage tests. **Not wired into main.tsx or consumers.** Focused provider/kit suites: **13 passed**; typecheck and lint passed (existing graph-transfer warning).
- **Confirmed blocker:** `Transaction.toJSON({ client })` does not fully build/resolve objects or gas. A network-free reproduction in the digest-pinned disposable Node container confirmed zero client reads, unresolved object versions, null gas payment/price/budget, and unresolved state after restoring JSON. The current `signTargetTransaction` helper therefore does not establish its claimed pinned construction boundary. The earlier mocked helper tests and signing-closure endpoint probe do not prove this property.
- See the new resume section of `implementation-evidence.md`. Recommended reviewed amendment: fully resolve/build on the captured concrete client before consent, verify fully resolved state, and then pass resolved JSON for wallet review/signing, retaining context checks and construction bounds. Test real construction and wallet gas-modification behavior. An alternative pinned signing boundary preserving wallet-side gas selection needs explicit review.
- **Next step:** obtain the design decision and correct/verify the signing helper before coherent 2.2/2.3 consumer/provider wiring. Do not wire the existing helper under its unsafe serialization assumption.
- No remote mutation, commit, push, archive or deployment. All companion directories and prior modifications preserved. Container automatically removed.

## Historical resume state — dependency and browser notes, superseded

- Progress remains **9/29**. Tasks 2.2/2.3 are partially implemented, not complete; no new checkboxes were claimed.
- Registry latest/integrity revalidation confirmed the same five candidates. `package.json`/`bun.lock` now pin SDK **2.35.0**, React kit **2.1.39**, core **1.6.37**, wallet-standard **0.21.33**, Walrus **1.2.34**. Installed with scripts disabled; hashes matched registry evidence. Legacy `@mysten/dapp-kit` remains temporarily so unmigrated imports stay valid.
- Core permanently caches clients by network, including inside signing closures. A network-free selected-release reproduction confirmed endpoint edits/network switching do not refresh the cache. The user approved **stable wallet + endpoint-aware client**, documented in `design.md`.
- Added `createEndpointAwareLocalSuiClient` and request option forwarding to `src/utils/suiTargetClient.ts`; added `src/utils/suiWalletKit.ts` with kit factory, v2 storage key/legacy reconnect detection, and pinned-target signing-only helper with context checks and bounded construction reads. Added `src/__tests__/suiWalletClient.test.ts` (**3 cases**) and `src/__tests__/suiWalletKit.test.ts` (**8 cases**).
- **New factory/helper are not yet wired into main.tsx or existing wallet UI/hooks/signing callers.** Actual reconnect UI remains pending. Do not remove legacy dApp Kit before coherent consumer migration. The real balance path still captures its concrete endpoint correctly; Walrus remains independently on testnet.
- Selected-release signing-closure probe verified the stable client/wallet resolves endpoint edits using two loopback gRPC responders and fake test-wallet signatures. It did not perform real signing/submission or prove publication/authorization parity.
- Latest gates passed: typecheck, lint (existing graph-transfer warning), build (chunk-size warning), **731 unit tests / 105 files** with one skipped file/test, and **4 security tests**.
- The configured Chromium/headless-shell revision **1243**, Chrome for Testing **153.0.8010.12**, is now installed. The old browser-runtime caveat below is superseded.
- The initial Chromium baseline failed because `tests/e2e/authorize.spec.ts` parsed every fullnode body using `postDataJSON()`, including binary/base64 gRPC-web balance. Parser incompatibility was reproduced with the observed body in the digest-pinned disposable Node container (parser-level reproduction, not a full containerized browser run).
- **Fixed at the user's request:** the authorization fixture now handles `/sui.rpc.v2.StateService/GetBalance` before JSON parsing, serves real protobuf/gRPC-web frames, asserts POST/content type/no JSON-RPC envelope, and rejects legacy `suix_getBalance`. It asserts a decoded **12.5 SUI** balance. The balance span is hidden at the default desktop width, so the assertion checks its text rather than visibility; no production CSS was changed.
- Shared binary response encoding is exported as `createSuiGrpcBalanceResponseBody` from `tests/fixtures/sui-grpc-responder.mjs` and reused by its actual HTTP responder; `tests/fixtures/sui-grpc-responder.d.mts` declares its TypeScript interface. No transport hooks were mocked.
- **Verification after correction:** isolated authorization workflow **1 passed**; authorization plus readiness with two Chromium workers **2 passed**; targeted balance/client/kit unit tests **20 passed**; Node responder tests **3 passed**; typecheck passed; lint passed with the pre-existing graph-transfer warning. The previous `Idle`/`Compiled` assertion passed without production-code changes; no separate compilation defect was established. Full browser suite was not rerun; this is not completion of 4.5 or 5.2.
- **Next step:** resume **2.2/2.3** coherent provider/UI/signing migration using `suiWalletKit.ts`, then remaining operation adapters/parity tests. Remaining legacy browser operation routes belong to tasks 3.7/4.x. Do not restore JSON-RPC balance or count routed fixture traffic as actual CORS/preflight proof. No outstanding blocker remains from the corrected fixture; the current pause is operator-requested.
- Preserve all pre-existing companion directories and original modifications listed below. No commit, push, archive, or deployment was performed. See the resume section of `implementation-evidence.md` for details.

### Latest focused verification commands

```sh
bun run test:e2e tests/e2e/authorize.spec.ts tests/e2e/authorization-readiness.spec.ts --project=chromium --workers=2
bun run test --run src/__tests__/WalletStatus.transport.test.tsx src/__tests__/suiWalletClient.test.ts src/__tests__/suiWalletKit.test.ts
node --test tests/fixtures/sui-grpc-responder.node-test.mjs
bun run lint
bun run typecheck
```

## Previous handoff (historical state)

The following records the prior operator-requested pause; use the resume updates above where state differs.

## Start here

1. Read this handoff, then `proposal.md`, `design.md`, `tasks.md`, `specs/sui-grpc-connectivity/spec.md`, and `implementation-evidence.md` in this directory.
2. Run:
   ```sh
   openspec status --change migrate-sui-to-grpc --json
   openspec instructions apply --change migrate-sui-to-grpc --json
   git status --short
   ```
3. Continue with **2.2 / 2.3: dependency and wallet integration migration**, followed by operation adapters and remaining parity tests. Stage the dependency/provider/signing changes coherently: removing the old package before migrating imports breaks the application.
4. Preserve the already-green real balance regression. Do not replace it with a mocked successful hook.

**Progress: 9/29 tasks complete; 20 remaining.** Checked tasks: **1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.4, 2.5, 4.1**. Seven tasks were newly completed this session beyond the initial two inventory/release tasks. Task order was intentionally adjusted to fix the standalone balance path before replacing the broader wallet/provider/signing integration.

There is **no outstanding compatibility blocker established by the completed spike**. The pause is operator-requested, not evidence that remaining operations are implemented or verified.

## Repository state and ownership

- Working directory: `/home/scetrov/source/frontier-flow`; branch: **main**.
- No commit, push, PR, archive, or deployment was performed.
- `package.json` and `bun.lock` are unchanged from HEAD. A dependency-swap trial was reverted before replacing any wallet imports; original lockfile dependencies were restored with `bun install --frozen-lockfile --ignore-scripts`.
- Existing untracked companion changes `openspec/changes/restore-world-api-connectivity/` and `openspec/changes/remediate-source-map-js-advisory/` predated this work. **Do not delete, overwrite, or accidentally commit them.** The entire current migration change directory was also already untracked.
- No remote signing/submission occurred. Public probes were read-only and used the public address `0x1`; no real wallet or host keystore was used.

### Implemented files

Tracked modifications:

| File | Change |
| --- | --- |
| `src/hooks/useTargetBalance.ts` | Real native gRPC balance read, required-field validation, cancellation/deadline/retry bounds, captured endpoint/query identity |
| `src/components/WalletStatus.tsx` | Explicit `SUI unavailable` error label and user-triggered retry |
| `src/__tests__/WalletStatus.test.tsx` | Updated failure presentation assertions |
| `netlify.toml` | Narrow approved loopback HTTP/HTTPS CSP sources only |

New files:

- `src/utils/suiTargetClient.ts`
- `src/__tests__/suiTargetClient.test.ts`
- `src/__tests__/WalletStatus.transport.test.tsx`
- `tests/fixtures/sui-grpc-responder.mjs`
- `tests/fixtures/sui-grpc-responder.node-test.mjs`
- `docs/SUI-GRPC-LOCAL-VALIDATOR.md`
- This handoff; expanded `implementation-evidence.md`, approved policy amendment in `design.md`, and task checkbox updates.

**Not migrated:** `src/main.tsx`, legacy wallet hooks, publication, deployment confirmation, authorization, simulation execution, and maintained JSON-RPC diagnostic scripts. A working balance is not a completed JSON-RPC migration.

## Nuanced findings: balance and cache correctness

### Do not use the high-level balance result to infer response completeness

Selected SDK **2.35.0** implements high-level `getBalance` with:

```ts
balance: result.response.balance?.balance?.toString() ?? "0"
```

It also defaults other missing fields. A malformed success response can therefore look like a legitimate zero. The migrated hook intentionally uses the supported **native** API:

```ts
client.stateService.getBalance({ owner, coinType }, { abort, timeout }).response
```

It requires an explicit bigint balance, nonnegative value, and matching normalized SUI coin type before converting to the existing domain `{ totalBalance: string }`. Native calls return a **UnaryCall**, not the response itself: await **`.response`**.

Verified valid zero against the disposable validator and in a binary transport fixture. An empty protobuf balance response fails closed instead of inheriting an SDK-generated zero.

### Capture the endpoint with the query key

The key is `["target-balance", logicalTargetId, endpoint, owner]`. Stillness and Utopia intentionally have different keys despite sharing the same testnet fullnode. Local settings are subscribed through `useSyncExternalStore`.

Inside the query function, the client uses the endpoint **captured in `queryKey[2]`**, not a fresh call to the global target resolver. Otherwise a retry after a local configuration edit could fetch the new endpoint into an old endpoint's cache entry. Do not simplify this away.

Cancellation consumes TanStack's signal, combined with an 8-second timeout. Every native call also carries the gRPC deadline. There is **one retry**, delayed 200 ms, and no window-focus retries. Explicit user retry is allowed; failures display `SUI unavailable`, never `0 SUI`.

The deadline regression checks signal propagation and the `grpc-timeout: 8000m` header. Fetch may still be invoked with an already-aborted signal; expecting the fetch function never to be called was an incorrect fixture assumption and was fixed. Actual network fetch must honor the abort.

## Nuanced findings: simulation and evidence normalization

The selected SDK's normalized `simulateTransaction({ transaction, include: { commandResults: true } })` returns BCS bytes but **omits the Move return type**. Do not fabricate `vector<u8>` merely because the existing decoder expects it.

Supported escape hatch verified against the local validator:

```ts
include: { commandResults: true, protoJson: true }
```

This retains:

```text
protoJson.commandOutputs[].returnValues[].value.name
protoJson.commandOutputs[].returnValues[].value.value
```

The native value name was `vector<u8>`; the value was base64 BCS. For read-only `0x1::bcs::to_bytes<vector<u8>>([1,2,3])`, normalized returned bytes were `[4,3,1,2,3]`. Keep both the return-type check and the existing domain payload decoding, and reject missing/aborted/malformed results. Native service access is another supported option.

Other selected-release mappings verified:

- Object option is **`objectId`**, not JSON-RPC's `id`.
- Owned-object page result is **`objects`, `cursor`, `hasNextPage`**, not legacy `data`/pagination assumptions.
- `movePackageService.getDatatype({ packageId, moduleName, name }, options).response` exposes datatype identity and fields. Validate actual identity for `TurretAuth`, not just transport success.
- Transactions discriminate **`Transaction` vs `FailedTransaction`**, with nested `status.success`, native effects/changed objects, and explicitly included events/object types. Do not preserve `objectChanges` casts.
- Genesis transaction reads verified the effects/events service fields; **empty events are not authorization evidence**.

The spike demonstrated API availability, framework datatype reads, package content, empty owned-object pagination, genesis effects/events, and generic simulation bytes. It **did not** prove actual extension publication, populated pagination, authoritative turret authorization, or extension-specific simulation parity. Those remain mandatory tasks 3.x/4.x, especially **4.8**.

## Scope correction: preserve GraphQL and Walrus

An earlier attempt before this session incorrectly treated global character suggestions as a gRPC-equivalence blocker. That was withdrawn after the user clarified scope. This is **JSON-RPC → gRPC**, not GraphQL → gRPC.

Preserve existing GraphQL character/turret discovery, ownership queries, global suggestions, and `scripts/check-world-package-references.ts`. Do not restrict suggestions or introduce historical-index scans to replace a query that is explicitly out of migration scope.

`src/utils/walrusGraphClient.ts` already uses `SuiGrpcClient.$extend(walrus(...))`. It remains untouched. Its separately configured **Walrus testnet** network must not follow local deployment selection. Existing package-reference bundles/provenance remain unchanged.

## Browser policy: approved decision and testing trap

### Decision obtained from the user

Production local-validator access is limited to **`localhost` and `127.0.0.1`**, on configured ports. Non-loopback origins need an explicitly reviewed CSP allowlist. Development retains configurable endpoints.

Added only:

```text
http://localhost:* http://127.0.0.1:*
https://localhost:* https://127.0.0.1:*
```

The companion World API origin and all other policy directives are retained. Shared client construction rejects non-loopback local URLs and embedded credentials **in production**. Keep restrictions at an error-reporting operation boundary rather than throwing during arbitrary UI configuration rendering.

Chromium can also deny **local-network-access permission**, even with CSP corrected. That permission denial was reproduced. Granting the normal site permission allowed the probe; **no security-disabling flags were used**. Document/user guidance must not mislabel permission denial as an endpoint outage or a valid zero.

### Document routing is not proof of real preflight

An initial probe fulfilled only a document/script at a synthetic deployed origin and let actual remote gRPC requests proceed. It passed service reads but cannot alone prove genuine preflight: Playwright routing can affect CORS handling. A routed-origin loopback probe even showed POST without OPTIONS at the real responder.

The corrected probe used a **real HTTP document/script server** and a **different real cross-origin responder**, with **no Playwright routing**. Under production-equivalent CSP plus the approved loopback entries, the responder recorded:

1. `OPTIONS /sui.rpc.v2.StateService/GetBalance`
2. `POST /sui.rpc.v2.StateService/GetBalance`

The SDK decoded **12.5 SUI**. The same unrouted page successfully queried public testnet GetBalance/GetDatatype. This is actual preflight evidence, but it is **not** the built-app/new-wallet test or actual deployed-origin smoke.

`https://frontier-flow.netlify.app/__grpc-spike` was a **synthetic routed probe origin**, not verified deployment metadata. Do not assume it is the actual deployed site URL for task 5.1; determine the real origin before live smoke.

### Browser runtime caveat

Installed Playwright expects Chromium revision **1243**, which is missing. The compatibility spike explicitly used:

```text
/home/scetrov/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome
Chromium 145.0.7632.6
```

That is acceptable recorded spike evidence, not a claim that the configured deterministic browser suites passed. Install/use the project's intended browser revision for task 4.5/full browser verification, or explicitly document a reviewed alternative. No built-app Playwright suite was run this session.

## Dependency state and next wallet work

Current repository declarations/installed versions after restoring the lockfile:

| Package | Declaration | Installed |
| --- | --- | --- |
| `@mysten/sui` | `2.33.2` | `2.33.2` |
| `@mysten/dapp-kit` | `1.1.17` | `1.1.17` |
| `@mysten/walrus` | `^1.2.32` | `1.2.32` |
| `@mysten/wallet-standard` | Not yet direct | `0.21.18` |

Initially installed SDK was stale at 2.31.3. Do not repeat the old evidence's stale-node_modules assumption; the restoration installed the versions currently in the lockfile.

Rechecked exact registry latest candidates on 2026-10-07:

- SDK **2.35.0**
- React kit **2.1.39**
- Core kit **1.6.37**
- Wallet-standard **0.21.33**
- Walrus **1.2.34**

Exact SHA512 and peer evidence are in `implementation-evidence.md`. A full dependency-swap trial succeeded and bun lockfile entries matched those hashes, then the swap was deliberately reverted to avoid leaving unresolved legacy imports while paused. **Task 2.2 remains unchecked.** Revalidate latest applicable releases at resume time, pin changed direct dependencies, and retain lockfile integrity.

A temporary isolated install persists at `/tmp/frontier-grpc-spike` with SDK 2.35.0 and, just before the pause, core 1.6.37/react 2.1.39. Scripts were disabled. Its browser entry file was used for the spike. Treat temporary files as expendable, not source-controlled reproducibility artifacts.

Selected release declarations already inspected reveal wallet API differences:

- New provider is `DAppKitProvider` around a `createDAppKit` instance; old `SuiClientProvider`/`WalletProvider` cannot be fed a gRPC client.
- `useCurrentWallet` now returns **`UiWallet | null`**, not the old connection-state object. `useWalletConnection` exposes status booleans, wallet/account and supported intents.
- `useCurrentClient` replaces old client-hook usage; inspect its registered/generic type rather than assuming legacy methods.
- Signing/disconnection operations are on the kit instance obtained through `useDAppKit`; there is no old mutation-hook API exported from the new React entry point.
- UI components live under **`@mysten/dapp-kit-react/ui`** and use web-component wrappers. Do not blindly retain old `ConnectModal trigger={...}` or the old CSS import.
- Old wallet-standard helper calls currently receive raw wallet/account types. The new UI wallet/account representation is different; migrate signing coherently instead of casting the new types to legacy raw wallet types.
- **Provider/client cache invalidation for changing local endpoints has not been inspected or verified yet.** Check selected core source/API behavior before deciding how provider-local clients refresh. The already-implemented balance path is independent and correctly captures endpoints.
- Existing connection storage key is `frontier-flow:sui-wallet`. Its format compatibility with the new kit has not been verified. Preserve it only if safe; otherwise use the spec's explicit reconnect path without deleting graphs or fabricating authorization.
- Keep Walrus signing/execution explicitly on its intended network; do not let deployment-target network changes leak into graph transfer.

No production provider/signing edits were begun after the user requested a handoff.

## Disposable validator and fixture details

Podman **6.1.2** works. The `docker` command is a Podman shim; Docker-specific `docker info` templates failed. `nerdctl` was absent. Do not conclude there is no container runtime.

The spike used a fully qualified digest-pinned Node image as a host for a read-only mounted CLI binary, not an upstream Sui image:

```text
docker.io/library/node@sha256:05c08ce4291e9a58f59456a7985176defb12cdd42271f35ff81a3e167ea61d4c
sui 1.68.0-16bf4d124ac5
CLI binary SHA256 c4afd3b878531ea5c99f5c1b8db68fa65bbbfc1adfe765414553b7488f4371b9
```

The CLI SHA is an observed local-artifact checksum, **not** verification of an upstream signature. Container command used `--force-regenesis --committee-size 1 --fullnode-rpc-port 9000`, exposed only `127.0.0.1:19000`, and left HOME/genesis/state inside the disposable container. No PostgreSQL/GraphQL indexer was required for the tested gRPC methods. The container **was removed**; none is running at handoff.

Reproduction/cleanup instructions: `docs/SUI-GRPC-LOCAL-VALIDATOR.md`.

Fixture responder is loopback-bound, requires an explicit allowed origin, rejects JSON-RPC/root requests, and supports success, HTTP-503 unavailable, and rejected OPTIONS without CORS approval. Success bytes are actual protobuf/gRPC-web for 12.5 SUI. Always close servers in `finally`. Its shutdown tolerates already-stopped-server errors, needed with Bun's differing `closeAllConnections` behavior.

The fixture's Node suite is intentionally named **`.node-test.mjs`**, not `.test.mjs`, so Vitest does not collect a Node test suite. Invoke explicitly with `node --test`.

## Verification completed

After the balance/policy increment and lint fixes:

| Check | Result |
| --- | --- |
| Three targeted wallet/transport/client test files | **28 passed** |
| Full `bun run test:run` | **103 files passed, 1 skipped; 720 tests passed, 1 skipped** |
| Security phase of `test:run` | **4 passed** |
| Node responder fixtures | **3 passed** |
| `bun run typecheck` | Passed |
| `bun run lint` | Passed with existing `useGraphTransfer.ts:245` exhaustive-deps warning |
| `bun run build` | Passed with chunk-size warning |

The nine transport tests cover the original red-to-green regression, valid zero, unavailable retries/user retry, malformed omitted balance, deadlines/abort propagation, late account switching, late target switching, disconnect, and local endpoint edits. The four construction tests cover native client/network identity, cache isolation, independent Walrus configuration, and production origin policy.

Re-run as needed:

```sh
bun run test --run src/__tests__/WalletStatus.transport.test.tsx src/__tests__/WalletStatus.test.tsx src/__tests__/suiTargetClient.test.ts
node --test tests/fixtures/sui-grpc-responder.node-test.mjs
bun run typecheck
bun run lint
bun run build
bun run test:run
```

These passes **do not complete task 5.2**, because the entire migration and required browser/local mutation parity gates are not finished. No live deployed-origin smoke, actual local extension publish/authorization integration, or new-wallet lifecycle/signing tests have passed yet.

## Finish safely

- Continue pending OpenSpec tasks; update each checkbox immediately only when its actual obligations are verified.
- Preserve World API independence and package-reference bundles/fail-closed validation.
- No remote mutation without explicit consent; use isolated local keys for mutation parity.
- Archive the completed OpenSpec **before final commit/PR**, not now.
- If committing is requested, run configured pre-commit checks, keep signing enabled, and include model plus Pi Coding Agent co-author attribution. No commit was requested/performed in this session.
