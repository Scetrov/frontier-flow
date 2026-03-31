# 1. Release Runbook

This document is the operational runbook for shipping Frontier Flow releases.

It complements [`DEPLOYMENT.md`](./DEPLOYMENT.md) by describing the exact maintainer workflow for patch, minor, and major releases under the repository's `release-please` automation.

## 1.1 Release Model

Frontier Flow uses [release-please](https://github.com/googleapis/release-please) to manage version bumps, changelog generation, Git tags, and GitHub Releases.

The release system is driven by Conventional Commit messages already merged into `main`.

Core version-bump rules:

| Commit shape                                                             | Result        |
| ------------------------------------------------------------------------ | ------------- |
| `fix: ...`                                                               | Patch release |
| `feat: ...`                                                              | Minor release |
| `feat!: ...`, `fix!: ...`, `refactor!: ...` or `BREAKING CHANGE:` footer | Major release |

Operationally, the repository behaves like this:

1. Maintainers merge Conventional Commit messages into `main`.
2. The [`release-please.yml`](../.github/workflows/release-please.yml) workflow opens or updates a release PR.
3. The release PR updates `package.json`, `CHANGELOG.md`, and release metadata.
4. Merging the release PR creates the release commit, the `v*` tag, and the GitHub Release.

There is no manual `bun run release` flow in this repository.

## 1.2 Roles And Responsibilities

- Contributor: lands correctly formatted Conventional Commits.
- Maintainer: decides the intended release type, reviews the release PR, merges it, and verifies production outcomes.
- CI: enforces commit-message format through [`ci.yml`](../.github/workflows/ci.yml).
- Release automation: computes the next version and publishes the GitHub release through [`release-please.yml`](../.github/workflows/release-please.yml).

## 1.3 Release Preconditions

Do these checks before any release, regardless of version size.

1. Confirm `main` is green in CI.
2. Confirm the merged commits since the last release are using Conventional Commits.
3. Confirm there is at most one open release PR.
4. Confirm the intended version bump matches the merged commit history.
5. Confirm no urgent unreleased fixes are waiting on long-lived branches.

Useful commands:

```bash
gh pr list --state open --search "Release Please"
gh run list --branch main --limit 10
git fetch origin --tags
git log --oneline --decorate origin/main
```

## 1.4 Standard Release Lifecycle

Every release type follows the same high-level lifecycle:

1. Land eligible commits on `main`.
2. Wait for `release-please` to open or update the release PR.
3. Review the computed version bump.
4. Review the generated changelog entries.
5. Merge the release PR.
6. Verify the resulting tag, GitHub Release, CI runs, and downstream deployments.

What changes between patch, minor, and major releases is the kind of commit history you allow onto `main`, the scrutiny level during review, and the downstream validation after merge.

## 1.5 Patch Release Runbook

Use a patch release for backward-compatible bug fixes, small dependency updates, or other changes that must not alter the public contract in a breaking way.

### 1.5.1 Qualifying Changes

- Bug fixes already committed as `fix(...)`.
- Safe dependency updates committed as `chore(deps): ...` or `deps: ...` when intentionally releasable.
- Small operational corrections that do not introduce new features.

To guarantee a patch bump, avoid merging any `feat:` commit or breaking-change commit before the release PR is created.

### 1.5.2 Exact Process

1. Confirm the intended patch commits are already merged into `main`.
2. Check whether `release-please` has opened or updated the release PR.
3. Open the release PR and verify the proposed version is `x.y.(z + 1)`.
4. Review the changelog for accuracy and remove surprises by fixing commit messages before merging more work.
5. Confirm CI is green on the release PR.
6. Merge the release PR.
7. Verify the new tag, GitHub Release, Pages deploy, and Netlify deploy.

### 1.5.3 Patch Review Checklist

- No breaking changes are present.
- No user-visible new feature is bundled accidentally.
- The release PR version is a pure patch increment.
- The changelog only lists the intended fixes and maintenance work.

### 1.5.4 Patch Post-Release Verification

1. Confirm the tag exists:

```bash
git fetch origin --tags
git tag --list "v*" --sort=-version:refname | head
```

1. Confirm the GitHub Release exists:

```bash
gh release list --limit 5
```

1. Confirm the deployment workflows completed successfully:

```bash
gh run list --branch main --limit 10
```

## 1.6 Minor Release Runbook

Use a minor release for backward-compatible feature work.

### 1.6.1 Qualifying Changes

- New product capability merged with `feat(...)` commits.
- Backward-compatible UX, workflow, or platform expansion.
- Feature-level docs or tests merged alongside a releasable `feat:` commit.

At least one merged `feat:` commit must be present in the unreleased commit set.

### 1.6.2 Exact Process

1. Confirm the feature work is fully merged into `main`.
2. Confirm there are no intentional breaking changes in the merged commit set.
3. Wait for `release-please` to update the release PR.
4. Verify the proposed version is `x.(y + 1).0`.
5. Review the generated changelog to ensure every feature appears with the right scope and description.
6. Confirm any feature-flag, migration, or rollout notes are documented before merge.
7. Confirm CI is green on the release PR.
8. Merge the release PR.
9. Verify the tag, GitHub Release, and production deployments.

### 1.6.3 Minor Review Checklist

- The release contains at least one intended `feat:` entry.
- The release does not contain any hidden breaking API or workflow change.
- User-facing release notes are understandable without reading commit SHAs.
- Any follow-up work that cannot ship yet is clearly excluded.

### 1.6.4 Minor Post-Release Verification

In addition to the patch checks:

1. Open the published changelog and confirm the new feature entries read correctly.
2. Smoke-test the primary feature paths in the deployed application.
3. Confirm any supporting docs or examples expected to ship with the feature are already live.

## 1.7 Major Release Runbook

Use a major release for breaking changes.

### 1.7.1 Qualifying Changes

- A commit marked with `!`, such as `feat!:` or `refactor!:`.
- A commit body containing a `BREAKING CHANGE:` footer.
- Any intentional incompatible change to public behavior, deployment assumptions, configuration, or user workflow.

If the release is meant to be major, the breaking change must be explicit in the commit metadata. Do not rely on maintainers to infer it from code review.

### 1.7.2 Exact Process

1. Confirm every intended breaking change is already merged into `main` with explicit breaking markers.
2. Confirm migration notes, operator notes, and affected workflows are documented.
3. Wait for `release-please` to update the release PR.
4. Verify the proposed version is `(x + 1).0.0`.
5. Review the changelog carefully and ensure every breaking change is called out in plain language.
6. Add or update any human-authored upgrade guidance that the generated changelog cannot express well.
7. Confirm CI is green on the release PR.
8. Merge the release PR.
9. Verify the tag, GitHub Release, deployment state, and post-release migration guidance.

### 1.7.3 Major Review Checklist

- Every breaking change is explicitly marked in commit metadata.
- Migration or upgrade guidance is published.
- Consumers know what will stop working and how to adapt.
- Release notes are complete enough for someone who did not follow the implementation PRs.

### 1.7.4 Major Post-Release Verification

1. Verify the GitHub Release body clearly highlights breaking changes.
2. Verify deployment targets are healthy after the release merge.
3. Confirm maintainers have communicated migration notes to downstream users if needed.
4. Track immediate hotfix risk during the first post-release validation window.

## 1.8 Forcing A Specific Version

If `release-please` computes the wrong next version and you need an explicit override, create a signed commit on `main` whose body includes `Release-As: x.y.z`.

Example:

```bash
git commit --allow-empty -S -m "chore: force release 1.4.0" -m "Release-As: 1.4.0"
git push origin main
```

Use this sparingly. The preferred path is to encode release intent correctly in the underlying Conventional Commits.

## 1.9 Release PR Review Runbook

When the `release-please` PR appears:

1. Read the PR title and proposed version.
2. Review the `package.json` version change.
3. Review the `CHANGELOG.md` delta.
4. Confirm the release type matches the merged commit history.
5. Confirm CI is green.
6. Merge using the repository's normal protected-branch flow.

Useful commands:

```bash
gh pr list --state open --search "Release Please"
gh pr view <pr-number>
gh pr checks <pr-number>
```

## 1.10 Failure Recovery

### 1.10.1 Release PR Did Not Appear

1. Confirm a releasable commit exists on `main`.
2. Confirm the [`release-please.yml`](../.github/workflows/release-please.yml) workflow succeeded.
3. Re-run the workflow manually if needed.

```bash
gh workflow run release-please.yml
```

### 1.10.2 Wrong Version Bump

1. Inspect the merged commit messages.
2. Determine whether a `feat:` or breaking marker caused the bump.
3. If needed, use a `Release-As:` override commit.

### 1.10.3 Wrong Changelog Text

1. Fix the underlying Conventional Commit message before merge when possible.
2. If the release PR is already open, re-run or let `release-please` update after corrected commits land.
3. For especially important notes, add manual operator documentation in the `docs/` tree.

### 1.10.4 Broken Release After Merge

1. Do not rewrite published tags.
2. Prepare a follow-up hotfix.
3. Merge the hotfix to `main` using `fix:` commits.
4. Let `release-please` generate the follow-up patch release.

## 1.11 Maintainer Quick Checklists

### 1.11.1 Patch

1. Merge only patch-appropriate changes.
2. Verify release PR proposes `x.y.(z + 1)`.
3. Merge release PR.
4. Verify tag and deployments.

### 1.11.2 Minor

1. Merge at least one `feat:`.
2. Verify release PR proposes `x.(y + 1).0`.
3. Merge release PR.
4. Smoke-test the new feature in production.

### 1.11.3 Major

1. Merge explicit breaking-change commits.
2. Publish migration guidance.
3. Verify release PR proposes `(x + 1).0.0`.
4. Merge release PR.
5. Verify downstream adoption and hotfix readiness.
