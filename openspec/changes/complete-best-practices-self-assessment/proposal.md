## Why

The live OpenSSF Best Practices project 13753 assessment is only 19% complete: its exported JSON contains 180 unanswered criteria, including several criteria already supported by public repository documentation. The previous evidence seed deliberately avoided unsupported claims, but it did not systematically map available evidence to the dashboard's legacy Badge and OSPS criteria.

## What Changes

- Fetch and preserve a reviewable inventory of the live project 13753 assessment fields before changing any answers.
- Map every potentially satisfiable legacy Badge and OSPS criterion to committed, public evidence; add only truthful `Met` answers with required URLs or justifications.
- Leave unsupported, inapplicable, or unverified controls as `?` or `Unmet`, and document the remediation work required to reach passing status.
- Refresh the Best Practices dashboard, review all automated proposals, and record the resulting status and remaining blockers.
- Update maintainer documentation with a repeatable assessment-refresh and evidence-review procedure.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `best-practices-badge`: Extend evidence-backed badge maintenance to require a complete, criterion-by-criterion self-assessment, truthful status handling, and recorded dashboard verification.

## Impact

- Affects `.bestpractices.json`, `docs/REPOSITORY-GOVERNANCE.md`, and potentially public repository documentation or workflow configuration needed to provide missing evidence.
- Requires a maintainer with Best Practices dashboard access to refresh and attest the resulting assessment.
- Uses the public project export at `https://www.bestpractices.dev/projects/13753.json` as the baseline for the assessment inventory.
