## ADDED Requirements

### Requirement: Version updates observe a seven-day cooldown
Dependabot version-update configuration for the Bun and GitHub Actions package ecosystems MUST set a default cooldown of seven days. The configuration MUST NOT represent that cooldown as a control over Dependabot security updates.

#### Scenario: Both ecosystems wait seven days
- **WHEN** Dependabot evaluates a newly published version for either configured ecosystem
- **THEN** its version-update configuration requires seven default cooldown days before proposing that version

#### Scenario: Existing update policy remains intact
- **WHEN** the cooldown is set to seven days
- **THEN** both ecosystems retain their weekly schedule, pull-request limit, and minor/patch grouping
