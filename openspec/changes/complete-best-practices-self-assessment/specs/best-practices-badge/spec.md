## ADDED Requirements

### Requirement: Complete evidence-backed self-assessment
The repository MUST maintain a reviewable assessment inventory derived from the current public export for Best Practices project 13753. For every criterion considered during an assessment refresh, the inventory MUST record its current status, proposed disposition, and an exact public evidence URL or an explanation for retaining `?` or `Unmet`.

#### Scenario: Supported criterion is assessed
- **WHEN** a project criterion is supported by a committed repository artifact or publicly verifiable setting
- **THEN** its inventory entry identifies that evidence and the corresponding `.bestpractices.json` answer is `Met` with the required URL or justification

#### Scenario: Unsupported criterion is assessed
- **WHEN** a project criterion cannot be supported by verifiable evidence
- **THEN** its inventory retains `?` or `Unmet` and records the missing control or evidence without claiming compliance

### Requirement: Passing-status verification
The repository MUST refresh and review project 13753 in the Best Practices dashboard after an evidence batch and MUST record the dashboard result. The repository MUST NOT represent the assessment as passing until the dashboard itself reports Passing.

#### Scenario: Dashboard reports passing
- **WHEN** a maintainer refreshes and attests the assessment and the dashboard reports Passing
- **THEN** the recorded result identifies the project URL and retrieval date as evidence of the attained status

#### Scenario: Dashboard does not report passing
- **WHEN** the dashboard still reports an incomplete or non-passing result
- **THEN** the repository records the remaining Passing blockers and continues to avoid unsupported Passing claims

## MODIFIED Requirements

### Requirement: Evidence-backed Best Practices configuration
The repository MUST maintain a root `.bestpractices.json` containing only evidence-backed OpenSSF Best Practices Badge and OSPS answers or unknown placeholders. Each asserted answer MUST be traceable to a committed repository artifact or a publicly verifiable repository setting, and MUST be represented in the assessment inventory with its exact evidence URL or justification.

#### Scenario: Badge automation reads repository evidence
- **WHEN** the Best Practices Badge service reads the default branch
- **THEN** it can use `.bestpractices.json` to propose only supported answers without treating unknown controls as satisfied

#### Scenario: Evidence is refreshed
- **WHEN** a maintainer adds or changes a Best Practices answer
- **THEN** the assessment inventory records the source criterion, evidence, and dashboard review outcome before the answer is attested

### Requirement: Maintainer badge verification procedure
The repository MUST document the maintainer procedure to fetch the current project export, refresh Best Practices automation, review and attest dashboard answers, record required URLs or justifications, distinguish Passing blockers from optional criteria, and respond to a lost passing status.

#### Scenario: Evidence changes
- **WHEN** a change affects a badge criterion
- **THEN** a maintainer can follow the documented procedure to refresh the dashboard, review the changed evidence, and record the resulting status

#### Scenario: Assessment export changes
- **WHEN** the dashboard introduces, removes, or changes an assessment field
- **THEN** a maintainer re-fetches the project export and updates the inventory before proposing a new answer
