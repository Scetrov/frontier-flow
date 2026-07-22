## Why

Frontier Flow has nine open repository-security findings. Most urgently, `main` is unprotected and the CI workflow reports success while its production build and E2E jobs are skipped whenever the optional Dependabot lockfile job is skipped. The repository also needs immutable container pinning, machine-discoverable vulnerability reporting, and verifiable Best Practices Badge evidence.

## What Changes

- Restore CI gate semantics so successful push and pull-request runs execute the production build and browser E2E suite after required validation jobs pass.
- Remove or redesign the CI job that executes Dependabot-controlled dependency installation with a repository write token; retain deterministic Bun lockfile enforcement for ordinary contributions.
- Apply least-privilege GitHub Actions permissions, retaining only documented write scopes required by CodeQL, Pages deployment, and Release Please.
- Pin the development Docker base image to an immutable digest.
- Document and configure enforceable `main` branch protections and required checks.
- Make the existing GitHub private vulnerability-reporting channel explicitly discoverable from the security policy and repository documentation.
- Add Best Practices Badge evidence configuration, document the dashboard attestation/refresh process, and add the passing badge to the README after the dashboard confirms it.

## Capabilities

### New Capabilities
- `repository-security-governance`: Least-privilege workflow permissions, protected-branch controls, immutable build inputs, and a discoverable private vulnerability-reporting process.
- `ci-quality-gates`: CI dependency and execution requirements that ensure build and E2E checks are actually run before a run is considered successful.
- `best-practices-badge`: Repository evidence, maintainership procedure, and README presentation for achieving and retaining the OpenSSF Best Practices passing badge.

### Modified Capabilities
- None.

## Impact

- Affects `.github/workflows/`, `Dockerfile.dev`, `SECURITY.md`, repository documentation, `README.md`, and a new `.bestpractices.json` evidence file.
- Requires GitHub repository-administration changes for `main` protection and required checks, plus a Best Practices dashboard attestation performed by a maintainer.
- May replace the current Dependabot/Bun lockfile write-back mechanism; package update automation must continue to produce reviewed, committed `bun.lock` updates.
