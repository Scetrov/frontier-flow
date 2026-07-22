## 1. Dependency-update and CI safety

- [x] 1.1 Configure Dependabot's native Bun support to commit a matching `bun.lock` before CI; document the approved maintainer fallback if automation is unavailable.
- [x] 1.2 Remove the Dependabot CI lockfile write-back job and all CI write permissions used exclusively by that job.
- [x] 1.3 Configure dependency-update workflow(s) so update pull requests contain both `package.json` and `bun.lock`, and retain frozen-lockfile installs for required CI jobs.
- [x] 1.4 Update CI job dependencies and conditions so a skipped optional dependency-preparation job does not skip build or E2E, while failed required validation prevents both.
- [x] 1.5 Verify a normal pull request, a `main` push, and a dependency-update pull request execute the expected commit-message, lint, typecheck, coverage, audit, build, and E2E jobs.

## 2. Repository workflow and input hardening

- [x] 2.1 Audit each workflow's effective token scopes; preserve only the scoped permissions required by CodeQL, Pages, and Release Please and record their rationale.
- [x] 2.2 Pin the `Dockerfile.dev` Bun image to its reviewed SHA-256 digest with a readable tag/version annotation.
- [x] 2.3 Update `SECURITY.md` with a direct GitHub private vulnerability-reporting/advisory submission link while retaining acknowledgement and assessment targets.
- [x] 2.4 Add a repository-facing link to the security policy from contributor or README documentation.

## 3. GitHub branch governance

- [x] 3.1 Capture required check names from successful pull-request workflows, including CI and CodeQL.
- [x] 3.2 Configure `main` branch protection or a ruleset to require pull requests, the chosen approval/Code Owner policy, up-to-date required checks, conversation resolution, and administrator enforcement.
- [x] 3.3 Document the branch-protection configuration, Release Please compatibility decision, verification procedure, and administrator rollback/recovery procedure.
- [x] 3.4 Validate that an ordinary direct push is rejected and that a compliant pull request can merge only after all required checks and review conditions pass.

## 4. OpenSSF Best Practices Badge readiness

- [x] 4.1 Create root `.bestpractices.json` with only evidence-backed answers and unknown placeholders, referencing public repository artifacts and settings where applicable.
- [x] 4.2 Document the maintainer procedure for refreshing Best Practices automation, reviewing dashboard proposals, supplying URLs/justifications, and responding to badge loss.
- [x] 4.3 Refresh project 13753 in the Best Practices dashboard, review and attest all passing-level answers, and resolve any unsupported claims or missing evidence.
- [x] 4.4 Add the README Best Practices Badge linked to project 13753 only after the dashboard reports passing status.

## 5. Final verification and follow-up

- [x] 5.1 Run the repository verification suite and inspect the relevant GitHub Actions runs after workflow changes.
- [x] 5.2 Re-run or await OpenSSF Scorecard analysis, record the disposition of all nine initial findings, and document rolling historical CI/SAST metrics that require future compliant PRs to improve.
- [x] 5.3 Review security and contributor documentation for consistency with the implemented controls.
