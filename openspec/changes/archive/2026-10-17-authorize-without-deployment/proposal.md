## Why

`shared-extension-authorization` lets a turret owner authorize a package published by anyone. But the Authorize tab is still gated on holding a deployment of one's own, so the player that capability exists for — someone who never deploys anything and only runs a coalition's shared logic — cannot reach the view that would let them do it.

The gate conflated two different needs. Authorize needs a package id, which may name anyone's package. Simulate needs a contract to actually run against. One `hasAuthorizeAccess` flag drove both, so both were disabled until a local deployment existed.

## What Changes

- Split the single navigation flag into `hasAuthorizeAccess` and `hasSimulateAccess`. Authorize is always reachable; Simulate requires either the player's own deployment or a saved shared extension.
- Update the Simulate tooltip to name the second route: *"Deploy a contract or add a shared logic package first"*. The previous copy, *"Deploy a contract first"*, is now wrong rather than merely incomplete.
- Stop redirecting a requested `authorize` view away when no deployment exists; keep redirecting `simulate` when there is nothing to simulate.
- Apply the same rule to the **persisted** view restored at startup. `getInitialAppState` sanitised the stored view with its own copy of the old condition, so without this a player on Authorize with only shared extensions was thrown back to the visual editor on every reload.

## Capabilities

### Modified Capabilities

- `shared-extension-authorization`: adds a reachability requirement. The authorize view MUST be reachable without a deployment of the player's own, so a saved shared extension can actually be used. Nothing about resolution, persistence, or the authorization transaction changes.

### New Capabilities

None.

## Impact

- `src/App.tsx`: `useWorkflowAccess`, the `resolveActiveView` condition, and the `resolveInitialView` sanitiser for the persisted view.
- `src/components/Header.tsx`: a `hasSimulateAccess` prop and the corrected tooltips.
- Navigation changes for **every** user, including those who never touch shared extensions: the Authorize tab is now always enabled. That is the reason this is a separate change from the capability it serves — it has its own review surface and its own revert handle.
- Tests: 4 App-level navigation cases replace the one that asserted the old gate, and 3 Header cases replace the one that asserted the shared tooltip.

## Risks

A player who reaches Authorize with no contract at all sees a view whose primary action cannot yet be taken. That is why the empty state added in `shared-extension-authorization` points at the shared-logic field rather than saying nothing is available — the view is now a place to get a contract, not only a place to use one.

## Deliberately out of scope

- No change to what Authorize does once reached, nor to turret ownership or authorization validity.
- The Authorize tab is not gated on a connected wallet. `AuthorizeView` already handles the disconnected case, and gating navigation on it would reintroduce the same class of dead end this change removes.
