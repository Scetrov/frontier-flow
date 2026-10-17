## Why

Authorizing a turret needs only `<packageId>::<module>::TurretAuth` as a type argument. Nothing in the authorization transaction requires the caller to own the package, hold its `UpgradeCap`, or have published it.

The Authorize view does not reflect that. It offers only contracts discovered from `UpgradeCap` objects owned by the connected wallet, plus the local deployment record. So when one player publishes turret logic and their coalition wants to run it, every other member must republish the same contract to get an entry they can select — paying gas to create a redundant package, and fragmenting one shared behaviour across as many package ids as there are members.

That is a common case for this application rather than an edge case: a coalition agrees on one doctrine and wants every turret to run it.

## What Changes

- Add `resolveSharedAuthorizationContract`, which turns a package id published by anyone into an authorizable contract entry by reading the package's modules and locating its `TurretAuth` witness. It requires no ownership and makes no `UpgradeCap` query.
- Persist opted-in shared extensions per browser in `localStorage` under `frontier-flow:shared-extensions`, validating every field on read and discarding malformed entries individually rather than failing the whole read.
- Offer shared extensions in the Authorize contract selector alongside wallet-discovered contracts, keeping a wallet's own deployment first when both are present.
- Add a `SharedExtensionField` to the Authorize panel: paste a package id, pick the network, and the resolved contract appears in the list and the selector. Entries can be removed.
- Announce saves on a `frontier-flow:shared-extensions-changed` event, so state outside the Authorize view can react to the first saved entry.
- Correct the no-contract state, which told the player to deploy when adding a shared package is now equally valid: "Deployment Required" becomes "Contract Required", naming both routes.

Resolution failures are reported as the reason: an unparseable package id is refused before any request, and a package with no local `TurretAuth` witness is reported as having no turret extension module.

## Capabilities

### New Capabilities

- `shared-extension-authorization`: a turret owner MAY authorize their turrets against a turret extension published by another account, without republishing it, while ownership and validity checks on the authorization itself remain unchanged.

### Modified Capabilities

None. `sui-grpc-connectivity` is used as-is: resolution runs over the same target-aware gRPC `MovePackageService` client as existing discovery, with the same bounded timeouts and fail-closed identity checks. Authorization transaction construction, turret ownership rules, and simulation semantics are untouched.

## Impact

- New `src/utils/sharedExtensionStorage.ts` and `src/hooks/useSharedExtensions.ts`.
- `src/hooks/useAuthorizationContracts.ts` gains `resolveSharedAuthorizationContract` and an optional `sharedContracts` input; existing discovery behaviour is unchanged when it is omitted.
- `src/components/AuthorizeView.tsx` gains the shared-extension field.
- Tests: new `src/__tests__/sharedExtensionStorage.test.ts` (20 cases), 12 added cases in `src/__tests__/useAuthorizationContracts.test.ts`, 8 added cases in `src/__tests__/AuthorizeView.test.tsx`. The 36 pre-existing cases in those two files pass unchanged against the changed source.
- Shared extensions are per-browser and not synced. A player who clears site data re-adds them; nothing on-chain depends on the stored list.

## Deliberately out of scope

- Navigation changes. Reaching Authorize without a deployment of one's own is a separate change, because it alters navigation for every user including those who never touch shared extensions.
- No directory, registry, or sharing mechanism for package ids. Players exchange ids out of band, as they already do.
- No trust signal about what a shared package does. The resolver confirms that a turret extension exists, not that it is benign; reviewing someone else's logic before authorizing remains the player's judgement. See `design.md`.
