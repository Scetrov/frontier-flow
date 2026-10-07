## 1. Verify and reproduce

- [x] 1.1 Verify the public Stillness hostname against authoritative documentation or maintainer confirmation; record environment provenance, tribes/ships response schemas, CORS behavior, and the observed small tribe dataset before approving rollout.
- [x] 1.2 Add a failing cold-cache regression in the existing canvas/editor tests for opening List of Tribe; accept only the public hostname and reject the obsolete hostname so the current implementation fails for the reported reason.
- [x] 1.3 Reproduce rejected-fetch and CSP-blocked behavior in the available local/container browser harness; record reproduction commands without modifying remote services.

## 2. Restore shared World API access

- [x] 2.1 Centralize the public Stillness base URL and URL construction in the existing World API boundary; migrate editor and simulation consumers while preserving paths, query parameters, mappings, and numeric selection persistence.
- [x] 2.2 Update Netlify connect-src to permit the exact new origin and remove the unused obsolete World API origin; add a policy assertion without weakening unrelated directives.
- [x] 2.3 Add service-specific lookup errors, explicit editor retry, invalid-envelope rejection, and failure-safe caching; retain selections and prevent stale/unmounted responses from updating UI.

## 3. Exercise faulting paths

- [x] 3.1 Extend World API client and option-loader tests for tribe/ship URLs, mappings, valid empty results, malformed envelopes, HTTP errors, network rejection, retry, and cache isolation.
- [x] 3.2 Extend the real editor workflow test to select, save, and reopen a tribe; add ship parity and assertions that lookup failure does not erase saved selections.
- [x] 3.3 Extend simulation reference-data tests to assert the shared origin, existing query behavior, and partial results when one collection fails.
- [x] 3.4 Add a Playwright regression that adds/opens List of Tribe in the built app under CSP derived from netlify.toml, asserts the network origin and persisted selection, and exercises failure then retry without mocking the loader hook.
- [x] 3.5 Add a regression proving World API lookups remain usable when Sui requests fail; assert no obsolete World API requests and no CSP violations on the successful path.

## 4. Validate and document

- [x] 4.1 Document and run a bounded opt-in live tribes/ships smoke check, including browser access from the deployed origin; record failed or unavailable checks honestly and keep ordinary CI deterministic.
- [x] 4.2 Run targeted tests, applicable full unit/security tests, type checking, lint, build, and production-policy browser regressions; show the original failing regression passes after the fix.
- [x] 4.3 Document the canonical endpoint, provenance, verification commands, rollout/rollback procedure, and the independent Sui migration; confirm no graph-schema or package-reference changes occurred.
- [x] 4.4 Validate and archive this OpenSpec after successful implementation and verification, before the final commit/PR; run configured pre-commit checks and retain a signed, attributed commit when committing is requested.
