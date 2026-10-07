## MODIFIED Requirements

### Requirement: Scheduled integrity validation is read-only
The repository MUST run World package reference validation at least weekly and on manual dispatch. The workflow MUST use frozen dependencies, SHA-pinned third-party actions, bounded execution, concurrency control, and no repository write permission, and MUST NOT automatically modify package references in response to mutable upstream data. GitHub context and step outcome values rendered by a shell summary MUST be supplied as shell data and MUST NOT be interpolated into shell script source.

#### Scenario: Weekly references remain current
- **WHEN** the scheduled workflow finds every target coherent
- **THEN** it completes successfully and records a concise verification summary

#### Scenario: Weekly drift is detected
- **WHEN** the scheduled workflow detects drift or cannot verify an authoritative endpoint
- **THEN** it fails with remediation-oriented diagnostics and leaves repository contents unchanged

#### Scenario: Maintainer requests immediate validation
- **WHEN** a maintainer invokes the workflow manually
- **THEN** it performs the same validation and permission-constrained behavior as the scheduled run

#### Scenario: Summary context is rendered as data
- **WHEN** the workflow writes its verification summary from a valid Git ref containing shell metacharacters
- **THEN** the event name, ref, run identifier, and check outcome reach the shell only through environment bindings and quoted expansions, and no `run` script directly interpolates GitHub or step context
