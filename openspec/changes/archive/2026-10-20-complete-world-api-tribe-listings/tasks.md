## 1. Establish the defect and the service's constraints

- [x] 1.1 Reproduce the truncation through both consumers' real code paths and record the resulting option counts rather than inferring them from the endpoint alone.
- [x] 1.2 Probe `/v2/tribes` read-only for its accepted `limit` ceiling, its `offset` semantics, and the meaning of `metadata.total`; record that `total` is capped at `limit + 1` and cannot reveal truncation.
- [x] 1.3 Cross-check the live collection against an independent community index and record which tribe ids the application cannot reach.
- [x] 1.4 Confirm the configured host is current and matches upstream `main`, so the defect is attributed to pagination rather than endpoint drift.

## 2. Retrieve complete collections

- [x] 2.1 Default `buildWorldApiUrl` to the service's maximum accepted page size while preserving an explicitly narrowed `limit`, including zero.
- [x] 2.2 Document the 1000-record ceiling and the lossy `offset` parameter at the boundary so neither is rediscovered by trial.
- [x] 2.3 Collapse records repeating an `id` to first position and last value at the shared collection boundary, leaving id-less records untouched.
- [x] 2.4 Warn when the service reports more records than the requested page size.

## 3. Cover the faulting paths

- [x] 3.1 Assert the default page size in URL construction and that an explicit `limit` of zero or a smaller page survives it.
- [x] 3.2 Assert a 167-record collection is returned in full from a single request.
- [x] 3.3 Assert the repeated `1000167` collapses onto its resolved record and that id-less records are preserved.
- [x] 3.4 Assert the truncation warning fires when `total` exceeds `limit` and stays silent when the collection fits.
- [x] 3.5 Update the tests that pinned bare collection URLs so a dropped page size fails them.

## 4. Validate

- [x] 4.1 Run lint, type checking, and the full unit suite.
- [x] 4.2 Re-run both consumers against the live service and confirm every tribe id from the independent index is reachable and no option value repeats.
- [x] 4.3 Archive this OpenSpec and promote the delta into `openspec/specs/` before the final commit.
