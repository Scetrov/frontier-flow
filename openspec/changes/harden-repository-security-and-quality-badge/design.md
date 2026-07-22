## Context

The repository has workflow-level read-only defaults and commit-SHA-pinned Actions, but it has nine open Scorecard findings. The highest-impact gaps are operational: `main` is unprotected, and CI marks runs successful while `build` and `e2e` skip because they depend on an intentionally skipped Dependabot lockfile job. The same job checks out a Dependabot branch, installs dependencies, and pushes with `contents: write` because Dependabot does not update `bun.lock`.

GitHub private vulnerability reporting is enabled and the repository already has a security policy, but automated discovery has not linked the policy to the reporting channel. The Best Practices Badge project is registered but has not yet received evidence or dashboard attestations.

## Goals / Non-Goals

**Goals:**
- Make CI success mean all required validation, production build, and E2E checks actually completed successfully.
- Remove repository-write credentials from workflows that execute dependency code from pull requests.
- Apply least privilege while preserving the documented write scopes required for CodeQL, Pages, and Release Please.
- Make repository governance and vulnerability reporting independently discoverable and enforceable.
- Establish reproducible, reviewable evidence and a maintainer process for the OpenSSF Best Practices passing badge.

**Non-Goals:**
- Change application runtime behavior, smart-contract generation, or Netlify deployment architecture.
- Claim a Best Practices badge before the dashboard confirms it.
- Rewrite historical PR or CodeQL records; Scorecard's rolling historical metrics must improve through future compliant activity.
- Eliminate permissions that are necessary for first-party Actions to perform their documented functions.

## Decisions

### Preserve scoped required workflow permissions; remove the unsafe CI write-back path
The repository default remains `contents: read`. CodeQL retains only its required `security-events: write`; Pages and Release Please retain their narrowly scoped deployment/release permissions. The CI workflow SHALL not use a write-capable `GITHUB_TOKEN` while checking out and installing code from a pull request.

The current Dependabot lockfile write-back job is removed or replaced by dependency-update automation that commits a matching `bun.lock` before CI executes (prefer Renovate with Bun lockfile support). `pull_request_target` is explicitly rejected because it would expose a privileged token to untrusted pull-request content. If replacement automation cannot be provisioned immediately, updates must be completed by a maintainer rather than restoring the write-back job.

### Treat optional prerequisite skips as successful prerequisites for the CI graph
The build job uses explicit `always()` and checks the result of each required validation job, treating the optional dependency-update preparation job's `skipped` result as acceptable. It runs only when all validation jobs succeeded. E2E continues to require a successful build. This makes conditional execution visible and prevents skipped work from producing a misleading success state.

### Enforce branch governance in GitHub settings and document it in-repository
Branch protection cannot be guaranteed by a committed YAML file. The implementation includes an administrator checklist or idempotent GitHub CLI/API procedure to require pull requests, reviews/Code Owners as appropriate for the single-maintainer project, up-to-date required checks, conversation resolution, and administrator enforcement. Required checks include CI and CodeQL after their names are verified from completed runs.

### Pin build images by digest
`Dockerfile.dev` references the supported Bun image using an immutable SHA-256 digest, retaining a human-readable version/tag comment. The digest update becomes a reviewed dependency-maintenance event.

### Separate badge evidence from badge attestation
`.bestpractices.json` contains only repository facts that are objectively supported by committed files and public settings. Unknown answers remain absent or `?`. A maintainer must refresh automation with the dashboard's “Save and continue” action, review proposed answers, supply URLs/justifications, and only then add the README passing badge after confirmation. This prevents misleading compliance claims.

### Make private reporting directly linkable
`SECURITY.md` keeps its response targets and adds a direct, stable GitHub security-advisory/private-reporting link. README or contributor documentation links to the policy so humans and automated evidence collectors can reach it.

## Risks / Trade-offs

- [Dependency PR automation may not be available immediately] → Remove CI write-back first; use maintainer-generated lockfile updates until a trusted automation integration is provisioned.
- [Required-check names differ by GitHub event or are renamed] → Capture names from successful PR runs before enabling protection; test with a non-protected branch/PR and retain an administrator rollback path.
- [A strict protection rule can block release automation] → Validate Release Please's required permissions and bot merge path before enforcing the rule; document the exception only if it is necessary and auditable.
- [Pinned image digests become stale] → Track them with dependency automation and review digest/tag pairs in PRs.
- [Badge criteria include manual assertions] → Keep claims evidence-backed and document dashboard work as a required human step rather than treating the JSON file as proof.

## Migration Plan

1. Land CI graph and permission changes in a pull request; verify a normal PR and a dependency-update PR execute every required job.
2. Pin the Docker image and confirm local/container development still builds.
3. Configure and verify `main` protection after successful check names are known; retain an administrator procedure to temporarily relax a faulty rule and restore it immediately after correction.
4. Publish explicit security-reporting links and badge evidence documentation.
5. Refresh the Best Practices dashboard, resolve its proposed answers, and add the badge only after it reports passing.

## Open Questions

- Is Renovate already approved/installed for the GitHub organization, or should the first implementation retain Dependabot and require a maintainer lockfile amendment?
- Which exact review requirement is workable for a single-maintainer repository while still preventing unreviewed direct pushes?
- Does the project intend to publish Docker images, or is `Dockerfile.dev` strictly a local-development artifact? This determines whether digest freshness needs a dedicated automation policy.
