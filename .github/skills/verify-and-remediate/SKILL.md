---
name: verify-and-remediate
description: This skill automates the process of verifying the repository's developer checks, collecting any failures into remediation work, applying careful fixes, and repeating until the workspace is clean.
user-invocable: true
---

# Skill: verify-and-remediate

## Purpose

This skill automates verification of the repository's developer checks, collects failures into remediation work, applies careful fixes, and repeats until the workspace is clean.

## Scope

- Operates on the local workspace where the skill is executed.
- Uses the repository's scripts defined in `package.json`.
- Attempts safe, minimal fixes only.

## Files

- `.github/skills/verify-and-remediate.md`
- `.github/skills/verify-and-remediate.sh`
- `.github/skills/verify-and-remediate.ps1`

## Workflow

1. Read `package.json` and determine which verification scripts exist.
2. Execute checks in an efficient order: `typecheck`, `build`, `lint`, unit tests, then Playwright.
3. Collect each failure or warning and turn it into a remediation task.
4. Ask the user only when a fix is ambiguous, risky, or product-impacting.
5. Apply careful fixes and rerun verification until the workspace is clean or a real blocker remains.
6. Create a conventional commit and push it. If the current branch is `main` or `master`, first create a `fix/` branch.
7. Report a concise summary of failures found, changes made, and final verification status.

## Usage

Run one of the helper scripts from the repository root:

```sh
bash .github/skills/verify-and-remediate.sh
```

```powershell
pwsh -File .github/skills/verify-and-remediate.ps1
```

The runners are maintained as real files in the repository and should be referenced from this skill rather than duplicated inside it.

## Outputs

- Console output for each verification step
- `verify-remediation-todo.md` when any check fails

## Safety

- Do not apply fixes that intentionally change product behavior without explicit user confirmation.
- Do not silently skip failing checks.
- Do not push directly to `main` or `master`.

## Extension points

- Add parser-based extraction of TypeScript diagnostics.
- Add safe `eslint --fix` support for approved rules.
- Add richer Git automation for branch naming and commit messages.
- Add CI artifact collection for Playwright traces and screenshots.
