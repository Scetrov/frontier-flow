# Contract: Reference DAG Validation

## Purpose

Defines the deterministic validation contract for supported and unsupported reference DAG fixtures derived from the `Scetrov/smart-turrets` contract inventory, with [docs/CONTRACT_EXAMPLES.md](/home/scetrov/source/frontier-flow/docs/CONTRACT_EXAMPLES.md) as the concrete catalog for expected seed behavior.

## Required Case Fields

| Field                         | Required      | Meaning                                                               |
| ----------------------------- | ------------- | --------------------------------------------------------------------- |
| `caseId`                      | yes           | Stable reference case identifier                                      |
| `exampleContractId`           | yes           | Matching contract example identifier from `docs/CONTRACT_EXAMPLES.md` |
| `supportStatus`               | yes           | `supported` or `unsupported`                                          |
| `graphFixture`                | yes           | Canonical DAG fixture used by tests                                   |
| `expectedDiagnostics`         | yes           | Blocking or warning diagnostics expected from this case               |
| `expectedSemanticOutcomes`    | for supported | Functional expectations for filtering, scoring, and output behavior   |
| `expectedArtifactFingerprint` | for supported | Deterministic output reference used by Vitest regression coverage     |

## Invariants

- Every supported case must generate a compile-ready artifact, compile successfully, and pass semantic assertions derived from its mapped contract example.
- Every unsupported case must fail before compilation with at least one blocking diagnostic.
- Unsupported cases must never emit misleading compile-ready artifacts.
- Any change to canonical output requires an intentional approval update rather than an implicit test drift.

## Test Expectations

- Vitest owns the primary regression surface for case-level semantic and snapshot verification.
- Compilation validation must cover every supported reference DAG before release.
- Browser-level workflow coverage should verify that artifact states remain consistent with case expectations in preview/build flows.
