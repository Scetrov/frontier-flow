# Repository Governance

This document records the operational controls that cannot be enforced by source code alone.

## Dependency updates

Dependabot is the trusted dependency-update path. [`.github/dependabot.yml`](../.github/dependabot.yml) uses Dependabot's native `bun` ecosystem support for the text-based `bun.lock` format and also updates GitHub Actions. Every dependency pull request that changes `package.json` must contain the matching `bun.lock`; required CI jobs always install with `bun install --frozen-lockfile` and never modify or push a pull-request branch.

A repository administrator must enable Dependabot version updates for `Scetrov/frontier-flow` and confirm that Dependabot detects the committed configuration. The Dependabot dashboard and a trial dependency pull request are the provisioning checks.

If the GitHub App is unavailable, a maintainer must update the dependency branch locally:

```bash
git checkout <dependency-update-branch>
bun install
git add package.json bun.lock
git commit -S -m "chore(deps): update bun lockfile"
git push
```

Do not weaken frozen-lockfile CI installs, add a CI write token, or use `pull_request_target` to execute dependency code. Automation may resume only when it opens pull requests containing both manifest and lockfile changes.

## GitHub Actions permissions

Every workflow declares `contents: read` as its default. Write scopes are job-local and limited to the operation that requires them.

| Workflow | Job-local write scopes | Rationale |
| --- | --- | --- |
| CI | None | Validation, build, and E2E only read the checkout and upload artifacts. |
| Dependency Review | None | The action reads pull-request dependency changes. |
| Real WASM Integration | None | The scheduled test reads the checkout and uploads artifacts. |
| CodeQL | `security-events: write` | Upload CodeQL analysis results; `actions: read` and `contents: read` support analysis. |
| Deploy Pages / build | `pages: write`, `attestations: write`, `id-token: write` | Configure Pages and create signed build provenance. |
| Deploy Pages / deploy | `pages: write`, `id-token: write` | Deploy the artifact using GitHub Pages OIDC. |
| Release Please | `contents: write`, `issues: write`, `pull-requests: write` | Maintain the release PR, tags, GitHub release, and linked issue/PR metadata. |
| Scorecard | `security-events: write`, `id-token: write` | Upload SARIF and publish an authenticated Scorecard result. |

Review this table whenever an action or workflow changes. New write scopes require an action-specific rationale here and must be granted on the narrowest job.

## Required checks

The required-check contexts were captured from successful pull request [#50](https://github.com/Scetrov/frontier-flow/pull/50). The retired `dependabot-lockfile` context is deliberately excluded.

- `commit-messages`
- `lint`
- `typecheck`
- `unit-tests`
- `audit`
- `build`
- `e2e`
- `Analyze (actions)`
- `Analyze (javascript-typescript)`
- `dependency-review`

Before changing branch protection, confirm these exact contexts on a successful pull request using `gh pr checks <number>`. If a job is renamed, first land and observe the renamed check, then update protection so the branch is never left requiring a context that no workflow emits.

## `main` branch protection

The `main` branch protection rule is configured with:

- pull requests required, with one approval from someone other than the last pusher;
- stale approvals dismissed when new commits arrive;
- Code Owner review not required because the sole Code Owner cannot approve their own pull request;
- strict required checks from the list above, requiring the branch to be current before merge;
- all review conversations resolved;
- administrator enforcement and linear history enabled; and
- force pushes and branch deletion disabled.

Release Please receives no bypass. Its release pull requests must run the same checks, receive an independent approval, and merge normally. Release pull request [#54](https://github.com/Scetrov/frontier-flow/pull/54) confirms that the GitHub App's pull requests can trigger CI, CodeQL, and Dependency Review; recheck this behavior after changing the release token or action.

### Verification

1. Run `gh api repos/Scetrov/frontier-flow/branches/main/protection` and compare the response with this section.
2. Open a test pull request, wait for every required context, request one approval, and resolve all conversations.
3. Push another commit and confirm the stale approval is dismissed and the branch must be brought up to date.
4. From a disposable local branch, attempt `git push origin HEAD:main` and confirm GitHub rejects it.
5. Merge only after the required checks and approval are satisfied.

### Administrator recovery

Protection changes are exceptional and must be restored immediately:

1. Record the failing or stale context and save the current protection response: `gh api repos/Scetrov/frontier-flow/branches/main/protection > /tmp/frontier-flow-main-protection.json`.
2. Prefer fixing or rerunning the workflow. If a required context no longer exists, use **Settings → Branches → main → Edit** to remove only that stale context; do not disable pull requests, administrator enforcement, or unrelated checks.
3. Merge the corrective pull request after all remaining controls pass.
4. Add the corrected context back, then rerun the verification steps above.
5. Record the incident and temporary exception in the corrective pull request. Never leave protection relaxed between maintenance sessions.

## OpenSSF Best Practices Badge

Project [13753](https://www.bestpractices.dev/en/projects/13753) is maintained through evidence proposals plus human attestation. The root [`.bestpractices.json`](../.bestpractices.json) is not a compliance claim: `Met` entries require a public evidence URL, and `?` entries are intentionally ignored by automation.

### Refresh and review

1. Merge evidence changes to the default branch; the dashboard cannot inspect unmerged files.
2. Sign in to the Best Practices dashboard and open project 13753.
3. Edit each section and choose **Save (and continue) 🤖** to rerun repository automation.
4. Review every proposed answer. Accept it only when its criterion, status, and public evidence URL match the repository's current state.
5. For manual answers, provide a durable public URL and a concise justification. Use `?` or leave the criterion unanswered when evidence is unavailable; never infer that a control passes.
6. Resolve contradictory or stale proposals in `.bestpractices.json` or the referenced artifact, rerun automation, and record the dashboard review in the implementing pull request.
7. Add the README badge only after the dashboard itself reports **passing**. Link both the image and badge to project 13753.

### Badge loss

If project 13753 stops reporting passing:

1. remove the passing badge from the README in the next corrective pull request;
2. identify the failed criterion and whether repository evidence, a public setting, or dashboard attestation changed;
3. restore the control or change its answer to `?`/`Unmet` with an accurate explanation;
4. rerun **Save (and continue) 🤖** and review all affected proposals; and
5. restore the README badge only after the dashboard again reports passing.

## OpenSSF Scorecard follow-up

Branch-protection changes triggered successful Scorecard run [29954210123](https://github.com/Scetrov/frontier-flow/actions/runs/29954210123). The 2026-07-22 analysis scored 6.4/10. The nine initial code-scanning alerts have these dispositions:

| Alert | Finding | Disposition |
| --- | --- | --- |
| #1 | Branch Protection | Enforced for administrators with strict checks, one approval, last-push approval, conversation resolution, and no force pushes. Scorecard may remain below maximum because Code Owner review is intentionally disabled for the single-Code-Owner repository. |
| #2 | Token Permissions — CI | Remediated locally: the write-capable dependency lockfile job is removed and CI is read-only. Await merge and a new analysis. |
| #3 | Token Permissions — CodeQL | Remediated locally: `security-events: write` moved from workflow scope to the analysis job and is retained because CodeQL must upload results. Await merge and a new analysis. |
| #4 | Token Permissions — Release Please | Remediated locally: release write scopes moved to the Release Please job. The three scopes remain necessary to maintain release PRs, tags/releases, and issue/PR metadata. Await merge and a new analysis. |
| #5 | Pinned Dependencies | Remediated locally: `Dockerfile.dev` now pins Bun 1.3.10 to a reviewed SHA-256 digest. Await merge and a new analysis. |
| #7 | Security Policy | Remediated locally: `SECURITY.md` now links directly to private advisory submission while retaining response targets. Await merge and a new analysis. |
| #8 | CII Best Practices | In progress: evidence configuration and the maintainer procedure are committed locally; project 13753 still requires dashboard review and passing attestation. |
| #10 | SAST | Historical/rolling: 24 of the last 30 commits were analyzed. CodeQL is required on new pull requests; the metric improves as compliant commits replace old samples. |
| #11 | CI Tests | Historical/rolling: 25 of the last 30 merged pull requests had CI tests. Required CI checks on protected `main` improve the metric as compliant pull requests replace old samples. |

Do not dismiss an alert merely because remediation is staged. After merge, wait for or trigger a new Scorecard analysis, confirm the alert's latest instance reflects the new default-branch commit, and record any residual warning as either a required-permission exception or follow-up work.
