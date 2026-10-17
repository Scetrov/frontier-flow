## 1. Separate the two preconditions

- [x] 1.1 Add `useWorkflowAccess`, returning `hasAuthorizeAccess` (always reachable) and `hasSimulateAccess` (own deployment or saved shared extension).
- [x] 1.2 Add a `hasSimulateAccess` prop to `Header` and thread it through `ViewNavigation` and `buildViewNavigationItems`.
- [x] 1.3 Disable Simulate on `canSimulate` rather than on `canAuthorize`.
- [x] 1.4 Correct the Simulate tooltip to name both routes to a contract.

## 2. Stop redirecting away from authorize

- [x] 2.1 Narrow the `resolveActiveView` redirect to `simulate`, keeping the compiled-workflow rules for `move` and `deploy` untouched.
- [x] 2.2 Extract `resolveInitialView` and apply the same rule to the persisted view restored by `getInitialAppState`, reading saved shared extensions directly since no hook is available there.

## 3. Cover the navigation rules

- [x] 3.1 Replace the App case asserting the old authorize gate with four: persisted authorize restored without a deployment, authorize reachable while simulate stays gated, simulate falling back to visual with nothing to simulate, persisted simulate restored when a shared package is saved.
- [x] 3.2 Replace the Header case asserting the shared tooltip with three: Authorize stays enabled, Simulate disabled with the corrected tooltip, Simulate enabled once a shared package exists.
- [x] 3.3 Confirm three of the four new App cases fail against the unfixed `getInitialAppState` sanitiser and pass with it, so the defect cannot return unnoticed.

## 4. Verify

- [x] 4.1 Run `bun run lint` and `bunx tsc -b`.
- [x] 4.2 Run the full `vitest run` suite.
- [x] 4.3 Run the Playwright suite: `authorize.spec.ts` and `authorization-readiness.spec.ts` pass, and no spec asserted the old disabled gate.
- [x] 4.4 Capture navigation screenshots for the pull request, driving the running app with Playwright.
