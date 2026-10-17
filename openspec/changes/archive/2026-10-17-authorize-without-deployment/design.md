## Context

Navigation access was a single boolean. `StandardAppLayout` computed `hasAuthorizeAccess = authorizeDeploymentState !== null` and `Header` used it to disable both the Authorize and the Simulate tab, with the same tooltip on each. `resolveActiveView` enforced it again by redirecting a requested `authorize` or `simulate` view back to `deploy` or `visual`.

A third copy of the rule lived in `getInitialAppState`, inline:

```ts
activeView: (uiState.activeView === "authorize" || uiState.activeView === "simulate") && nextDeploymentState === null ? "visual" : uiState.activeView,
```

That one runs before React mounts, reading `localStorage` directly, which is why it is easy to miss: the tab can be enabled and the redirect removed, and a reload will still bounce the player out.

## Goals / Non-Goals

**Goals:** Make Authorize reachable for a player who has only shared extensions, consistently across clicking the tab, a requested view change, and a restored session.

**Non-Goals:** Changing Authorize's own behaviour, gating navigation on wallet connection, or unifying the three places that gate views into one mechanism.

## Decisions

### Two flags, not one

Authorize and Simulate have genuinely different preconditions: one needs a package id that may belong to anyone, the other needs something to run. Modelling that as two flags means the Simulate tooltip can state the real requirement, and a future third route to a contract only has to extend `hasSimulateAccess`.

Alternative: keep one flag and make it `deployment !== null || hasSharedExtensions`. Rejected — it would enable Authorize only once a shared extension is saved, but the field for saving one *is in the Authorize view*. The player would have no way in.

### Fix the persisted-view sanitiser rather than delete it

`getInitialAppState` cannot call a hook, so it reads the saved shared extensions directly through `loadSharedExtensions`. Extracting the condition into `resolveInitialView` keeps it a named, testable rule next to its React counterpart instead of an inline ternary that drifted from it once already.

Deleting the sanitiser entirely was tempting, since `resolveActiveView` would re-apply the rule on the first render. Rejected — it would mount Simulate with no contract for one frame before redirecting, and the stored value would briefly be treated as valid.

### Leave the three gates in place

A single source of truth for view access would be better, but unifying them touches compiled-workflow gating for Move and Deploy, which this change has no business altering. Both navigation rules are now named functions, which is the smaller, reviewable step.

## Risks / Trade-offs

**The Authorize tab is never disabled.** `hasAuthorizeAccess` is retained as a prop rather than removed, so `Header` keeps a complete contract and the kitchen-sink and test harnesses can still render the disabled state, but no production path passes `false`. If you would rather the prop go, that is a one-line follow-up; I left it so this change stays reversible in isolation.

**Verified both ways.** Three of the four new App cases fail against the unfixed sanitiser and pass with it, so the persisted-view defect is covered by a test that would catch its return, not merely described here.
