## Context

`loadAuthorizationContractsFromUpgradeCaps` discovers contracts by listing wallet-owned `0x2::package::UpgradeCap` objects, decoding each cap's BCS, and reading the referenced package's modules for a locally declared `TurretAuth` datatype. Owning the cap is the only path to an entry.

But authorization itself never consults the cap. It passes a type argument built from the package id and module name. The ownership requirement is therefore an artifact of how contracts are discovered, not a property of what authorization needs.

## Goals / Non-Goals

**Goals:** Let a turret owner authorize against a package published by anyone, with the same identity and witness checks applied to their own packages, and keep that choice durable across sessions.

**Non-Goals:** Changing the authorization transaction, turret ownership checks, simulation, or navigation gating; synchronising the opted-in list between devices; or vouching for third-party logic.

## Decisions

### Resolve by reading the package, not by trusting input

`resolveSharedAuthorizationContract` normalises the package id, fetches the package over the target's gRPC `MovePackageService`, asserts the returned `storageId` matches what was requested, and requires a `TurretAuth` datatype declared *in* the candidate module. An imported `TurretAuth` reference from another module does not qualify — that is the rule existing discovery already applies, reused rather than reimplemented.

Alternative: accept a user-supplied `packageId::module` pair verbatim. Rejected — a typo would produce an authorization that silently fails on chain, whereas the resolver can say what is wrong at the point of entry.

### Store the opt-in, not a cache of the package

The stored entry holds only what the selector and the transaction need: package id, module name, target, and display fields. It is not a cache of package contents, so nothing goes stale when the shared package is upgraded; the type argument continues to name the same package id, which is what authorization targets.

`transactionDigest` and `deployedAt` have no meaning for a package this wallet did not publish. Rather than inventing values, they fall back to the package id and the epoch, so the existing "deployed N ago" affordance degrades visibly instead of asserting false provenance.

### Validate on every read

`localStorage` is user-writable and survives across versions. `loadSharedExtensions` re-validates each entry's package id, module name, and target on every read, drops malformed entries individually, and tolerates unparseable JSON by returning an empty list. A corrupt entry therefore cannot break the Authorize view.

`local` is explicitly not a valid shared target: a shared extension only makes sense on a published network, and a local validator's packages are not reachable by other players.

### Announce changes with an event

Whether any shared extension exists is needed outside the Authorize view. Rather than lifting the list into global state, `saveSharedExtensions` dispatches a `frontier-flow:shared-extensions-changed` event, and `useHasSharedExtensions` listens for both it and the native `storage` event, so a change made in one tab reaches another.

## Risks / Trade-offs

**A player can point a turret at logic they have not read.** The resolver proves that a package declares a turret extension; it proves nothing about behaviour. This is inherent to the feature — the same risk exists today for anyone who copies a contract and republishes it, except that republishing creates an illusion of review. The field's copy states plainly that the turret is pointed at someone else's already-published contract, and no trust signal is fabricated.

**Per-browser storage.** The opted-in list does not follow a player between devices. Keeping it local avoids introducing a backend and keeps the feature free of account state; re-pasting a package id is cheap.
