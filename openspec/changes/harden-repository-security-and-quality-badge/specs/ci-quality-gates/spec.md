## ADDED Requirements

### Requirement: Complete validation before CI success
For pushes to `main` and pull requests targeting `main`, CI MUST execute commit-message validation, linting, type checking, unit tests with coverage, dependency audit, production build, and browser E2E tests before reporting success.

#### Scenario: Normal pull request
- **WHEN** a pull request targeting `main` passes its validation jobs
- **THEN** CI executes the production build and E2E jobs and reports success only after they succeed

#### Scenario: Validation failure
- **WHEN** any required validation job fails
- **THEN** downstream build and E2E jobs do not execute and the CI workflow reports failure

### Requirement: Optional dependency preparation cannot skip quality gates
An optional dependency-update lockfile preparation job MAY be skipped for non-dependency events, but its skipped result MUST NOT cause required build or E2E jobs to skip.

#### Scenario: Standard push
- **WHEN** CI runs for a standard push and the optional dependency preparation job is skipped
- **THEN** the required validation, build, and E2E jobs still execute according to their success dependencies

### Requirement: Deterministic dependency updates
Dependency update pull requests MUST contain a reviewed `bun.lock` matching `package.json` before the required CI validation installs dependencies. CI MUST NOT push a regenerated lockfile to a pull-request branch using a repository-write credential.

#### Scenario: Dependency update pull request
- **WHEN** automated dependency maintenance changes `package.json`
- **THEN** the pull request includes the matching `bun.lock` before CI runs its frozen-lockfile installs
