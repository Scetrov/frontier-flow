## ADDED Requirements

### Requirement: Evidence-backed Best Practices configuration
The repository MUST maintain a root `.bestpractices.json` containing only evidence-backed OpenSSF Best Practices Badge answers or unknown placeholders. Each asserted answer MUST be traceable to a committed repository artifact or a publicly verifiable repository setting.

#### Scenario: Badge automation reads repository evidence
- **WHEN** the Best Practices Badge service reads the default branch
- **THEN** it can use `.bestpractices.json` to propose only supported answers without treating unknown controls as satisfied

### Requirement: Maintainer badge verification procedure
The repository MUST document the maintainer procedure to refresh Best Practices automation, review and attest dashboard answers, record required URLs or justifications, and respond to a lost passing status.

#### Scenario: Evidence changes
- **WHEN** a change affects a badge criterion
- **THEN** a maintainer can follow the documented procedure to refresh the dashboard and review the changed evidence

### Requirement: Accurate README badge publication
The README MUST display the OpenSSF Best Practices Badge only after the project dashboard reports passing status, and the badge link MUST resolve to the project entry.

#### Scenario: Passing status confirmed
- **WHEN** the Best Practices dashboard confirms passing status for Frontier Flow
- **THEN** the README displays a badge linked to that project entry

#### Scenario: Passing status not confirmed
- **WHEN** the Best Practices dashboard does not report passing status
- **THEN** the README does not claim that the project has earned the passing badge
