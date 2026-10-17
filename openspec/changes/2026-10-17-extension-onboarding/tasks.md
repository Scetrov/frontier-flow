## 1. Define the link

- [x] 1.1 Add `src/utils/onboardingLink.ts` with `ONBOARDING_ROUTE`, a parser, and a builder.
- [x] 1.2 Validate package id, module name, and network, reporting which part is unusable.
- [x] 1.3 Distinguish an empty link from a malformed one, so a stripped link does not read as a bad package id.
- [x] 1.4 Build links that parse back to the same contract, tolerating a trailing slash on the origin.

## 2. Add the route

- [x] 2.1 Add `src/components/OnboardPage.tsx` and dispatch `/onboard` from `App()`, lazily, matching the existing page routes.
- [x] 2.2 Resolve the named package through `resolveSharedAuthorizationContract` rather than reimplementing verification.
- [x] 2.3 Refuse a link whose module disagrees with the resolved module, naming both.
- [x] 2.4 Surface the resolver's own message when a package cannot be used.
- [x] 2.5 Present contract name, module, full package id, and network before any confirmation.

## 3. Keep consent explicit

- [x] 3.1 Save nothing and change no view state until the reader confirms.
- [x] 3.2 On confirmation, save the shared extension and open the authorize view with the link's network selected.
- [x] 3.3 Never preselect turrets or authorize from the link.
- [x] 3.4 Extract `SharedExtensionTrustNotice` so the route and the authorize field render one copy of the warning.

## 4. Let an author share a contract

- [x] 4.1 Add a share action beside each saved shared extension that copies its onboarding link.
- [x] 4.2 Leave the label unchanged when clipboard access is refused, rather than claiming a copy that did not happen.

## 5. Let an author share what they published

- [x] 5.1 Offer the onboarding link from the deployment status panel once a contract is recorded as deployed.
- [x] 5.2 Offer nothing when no deployment is recorded, or when it targets a local validator that no one else can reach.

## 6. Report whether shared logic has been exercised

- [x] 6.1 Add `isSharedContract` and `isContractSimulated` in `src/utils/contractAssurance.ts`, deriving both from state the view already holds.
- [x] 6.2 Show the advisory before the authorize action when the selected contract came from another account, pointing at the existing simulate action.
- [x] 6.3 Credit only a simulation result belonging to the selected contract.
- [x] 6.4 Leave authorization enabled throughout, and pass no judgement on a simulation's output.
- [x] 6.5 Show nothing for the wallet's own deployment.

## 7. Cover it with tests

- [x] 7.1 15 link cases: well-formed, reordered parameters, empty link, ten malformed shapes, round-trip, trailing-slash origin.
- [x] 7.2 9 route cases: verified presentation, trust notice, nothing saved before confirmation, three refused links with no network call, module mismatch, resolver failure, confirmation saving and opening authorize.
- [x] 7.3 1 share case in the authorize view and 4 in the deploy view, asserting the copied link's route and all three parameters, and that nothing is offered for a local or absent deployment.
- [x] 7.4 9 assurance cases covering shared detection, network-specific keys, and simulation credit.
- [x] 7.5 2 authorize-view cases: the advisory for unexercised shared logic, and its absence for the wallet's own deployment.
- [x] 7.6 Confirm the pre-existing authorize, deploy, and navigation suites still pass.

## 8. Verify

- [x] 8.1 Run `bun run lint` and `bunx tsc -b`.
- [x] 8.2 Run the full `vitest run` suite.
- [x] 8.3 Capture onboarding screenshots for the pull request, driving the route with Playwright against a stubbed package response.
