## 1. Resolve a package published by anyone

- [x] 1.1 Add `resolveSharedAuthorizationContract`, normalising the package id and asserting the returned `storageId` matches the request.
- [x] 1.2 Reuse the existing locally-declared `TurretAuth` witness rule; reject imported witness references.
- [x] 1.3 Report an actionable message when no turret extension module is present.
- [x] 1.4 Honour an already-aborted signal, and the existing bounded timeout, before any request.

## 2. Persist the opt-in

- [x] 2.1 Add `src/utils/sharedExtensionStorage.ts` with load, save, add, remove, dedupe, and key helpers.
- [x] 2.2 Validate package id, module name, and target on every read; discard malformed entries individually.
- [x] 2.3 Exclude `local` as a shared target.
- [x] 2.4 Substitute defaults for `transactionDigest`, `deployedAt`, and `contractName` rather than inventing provenance.
- [x] 2.5 Dispatch `frontier-flow:shared-extensions-changed` on save, and listen for it plus the native `storage` event.

## 3. Offer shared extensions for authorization

- [x] 3.1 Accept an optional `sharedContracts` input in `useAuthorizationContracts` and merge it with wallet discovery.
- [x] 3.2 Return shared extensions even when discovery cannot run, on a local target or with no wallet connected.
- [x] 3.3 Keep the wallet's own deployment first when both are present.
- [x] 3.4 Fall back to a saved shared entry's target when the wallet holds no deployment of its own.

## 4. Surface it in the Authorize view

- [x] 4.1 Add `SharedExtensionField` with package id entry, network selection, add, and per-entry removal.
- [x] 4.2 Refuse a malformed package id in the field before any network call.
- [x] 4.3 Replace the dead-end empty state with one that points at the new field.
- [x] 4.4 Rename the "Deployment Required" state to "Contract Required" and name both routes to a contract, matching the panel copy.

## 5. Cover it with tests

- [x] 5.1 20 storage cases: round-trip, malformed input, per-field validation, defaults, dedupe, add and remove, event dispatch.
- [x] 5.2 12 resolver cases: resolution without ownership, id normalisation, three no-witness shapes, identity mismatch, invalid id, aborted signal, merge with discovery, merge ordering.
- [x] 5.3 8 component cases: empty-state copy, the corrected no-contract state, three refused ids, add and persist, resolver failure message, removal.
- [x] 5.4 Confirm the 36 pre-existing cases in the two touched test files still pass against the changed source: measured by stashing only the test additions, leaving the source changes in place.

## 6. Verify

- [x] 6.1 Run `bun run lint` and `bunx tsc -b`.
- [x] 6.2 Run the full `vitest run` suite: 878 passed, 1 skipped.
- [x] 6.3 Capture Authorize-view screenshots for the pull request, driving the running app with Playwright.
