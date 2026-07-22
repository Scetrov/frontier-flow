## ADDED Requirements

### Requirement: Least-privilege workflow credentials
Repository workflows MUST default to read-only credentials and grant write permissions only to the job and scopes required by the action being performed. A CI job that checks out and installs pull-request content MUST NOT receive a repository-write credential.

#### Scenario: Ordinary pull request CI
- **WHEN** CI runs for a pull request from a contributor or dependency-update branch
- **THEN** every job that checks out or installs the pull-request content runs without repository write permission

#### Scenario: Required publishing action
- **WHEN** CodeQL, Pages deployment, or Release Please runs
- **THEN** its job receives only the documented write scopes needed for its security-analysis, deployment, or release operation

### Requirement: Immutable development container input
The development Dockerfile MUST reference its Bun base image by SHA-256 digest and MUST retain a human-readable image version or tag annotation.

#### Scenario: Docker build review
- **WHEN** a maintainer reviews the Dockerfile base image
- **THEN** the image reference identifies an immutable digest and its intended Bun tag or version

### Requirement: Protected default branch
The `main` branch MUST enforce pull-request-based changes, required verified checks, administrator enforcement, and current-branch review conditions through GitHub branch protection or rulesets. The repository MUST document the configuration and recovery procedure.

#### Scenario: Direct update attempt
- **WHEN** a non-exempt actor attempts to push directly to `main`
- **THEN** GitHub rejects the update unless it satisfies the configured protected-branch policy

#### Scenario: Pull request merge
- **WHEN** a pull request targets `main`
- **THEN** GitHub requires the configured approval and successful required checks before allowing merge

### Requirement: Discoverable private vulnerability reporting
The repository MUST publish a security policy that directs reporters to its enabled GitHub private vulnerability-reporting channel through a direct link and MUST state its acknowledgement and initial-assessment targets.

#### Scenario: Reporter follows security policy
- **WHEN** a security researcher opens the repository security policy
- **THEN** they can follow a direct link to submit a private vulnerability report and see the expected response timeframes
