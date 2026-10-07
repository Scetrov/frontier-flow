## Context

Semgrep reported 19 open findings against the tip of `main` (`931599aa58838cf99e14a1542c22edd41e4779f3`). Review grouped them into six rules and established a narrower disposition:

- The World package integrity workflow interpolates GitHub context directly into a multiline `run` script. A valid Git ref can contain command substitution, so that summary step treats repository metadata as shell source. The workflow is scheduled or manually dispatched and has read-only contents permission, so this is unsafe construction rather than a demonstrated fork-PR secret theft.
- Both Dependabot ecosystems already set `cooldown.default-days: 5`. The accepted policy is seven days.
- `deployGradeCompiler.ts` builds a `RegExp` from a dependency directory name. Normalization can identify that directory as World while the original name still contains regex syntax. The same production line accounts for repeated scanner matches.
- The authorization traversal flagged at `useAuthorizationContracts.ts:400` only reads an existing object after checking the key. It is absent from the current migration branch because that hook was rewritten, but it is present at the scanned revision.
- `MoveSourcePanel.tsx` has a dedicated HTML encoder. Its four matches are duplicate reports of that encoder, not missing HTML sanitization.
- The generic OAuth "Logic Flaw" finding has no attack trace showing that an attacker can cross the state-cookie or popup-origin boundary.

The current working branch, `migrate-sui-to-grpc`, is not the scan baseline and must not be the implementation base.

## Goals / Non-Goals

**Goals:**

- Make the integrity workflow summary safe for any valid Git ref while preserving its read-only schedule, manual dispatch, pinned actions, and summary content.
- Apply a seven-day Dependabot cooldown to both configured ecosystems.
- Resolve every duplicate production dynamic-regex match with one literal path comparison.
- Suppress only reviewed duplicate or false-positive matches, with rule IDs and evidence.
- Keep the unresolved OAuth finding visible and its implementation unchanged.

**Non-Goals:**

- Redesigning GitHub OAuth, changing popup messaging, or suppressing the OAuth finding.
- Adding DOMPurify, `sanitize-html`, or another sanitization dependency.
- Changing authorization discovery behavior or reintroducing the scanned traversal.
- Backporting the change independently to every branch where Semgrep reported `main +2`.
- Disabling any Semgrep rule globally or ignoring a directory.
- Claiming that cooldown applies to Dependabot security updates. GitHub documents cooldown as a version-update control.

## Decisions

### 1. Branch from the scanned tip of `main`

Implementation starts from current `origin/main`, whose reviewed tip is `931599aa58838cf99e14a1542c22edd41e4779f3`. This keeps the suppression target and workflow baseline aligned with the scan.

Alternative: implement on `migrate-sui-to-grpc`. Rejected because the flagged traversal no longer exists there, and the pull request would mix unrelated migration work with security remediation.

If `main` advances before implementation and the traversal is already gone, the suppression is skipped and the disposition is recorded as resolved by removal. No suppression is added to unrelated authorization code.

### 2. Pass workflow summary values through the environment

The summary step receives `github.event_name`, `github.ref`, `github.run_id`, and `steps.check.outcome` through step `env` bindings. The shell uses a fixed `printf` format and quoted expansions. Direct `${{ ... }}` interpolation is removed from every `run` script in this workflow.

Expressions in `concurrency` and step `if` conditions remain Actions expressions because they are not shell source. The existing read-only permission, frozen install, pinned actions, and schedule are unchanged.

Alternative: maintain an allowlist of safe ref characters. Rejected because display of the actual ref is useful, and quoting removes the injection without rejecting valid refs.

### 3. Use literal manifest comparison

World manifest lookup compares the full relative path with the snapshot directory using case-insensitive literal comparison. It does not call `RegExp`.

This one change closes the repeated production matches at `deployGradeCompiler.ts:440`. A regression must prove that a directory whose normalized identity is World, but whose original name contains regex metacharacters, neither matches another directory nor throws.

Alternative: escape the directory with `escapeRegExp`. Rejected because the operation is path equality, and escaping preserves an unnecessary regex engine.

### 4. Suppress narrowly and only after remediation

Inline `nosemgrep` comments name the reported rule ID and are paired with a short evidence comment. They are limited to:

- `detect-non-literal-regexp` at the test-only label expression in `CompilationStatus.test.tsx`.
- `detect-replaceall-sanitization` at the existing HTML encoder in `MoveSourcePanel.tsx`.
- `prototype-pollution-loop` at the scanned read-only traversal, only while that code remains.

No `.semgrepignore`, path exclusion, or rule disablement is added. Duplicate reports of the remediated production regex line need no suppression once the call is gone. Duplicate branch reports are inherited when those branches merge `main`; they do not justify multiple copies of the fix.

Alternative: ignore the scanner output without code annotations. Rejected because the user explicitly requested duplicate suppression, and inline evidence keeps future review scoped.

### 5. Leave OAuth unchanged

No callback, cookie, origin, token-exchange, or popup-bridge behavior changes. No suppression or ignore entry is added for the generic Logic Flaw finding. A future scan can still present it if a concrete attack trace becomes available.

## Risks / Trade-offs

- [Semgrep Cloud may require a fully qualified rule ID] → Use the reported IDs and verify the comment syntax with the available scanner; if no scanner is available locally, retain the documented `nosemgrep: <reported-rule-id>` form and evidence comment rather than broadening the suppression.
- [Quoted environment values can still display unexpected ref text] → Accepted. The control prevents shell evaluation, not Git ref validation.
- [Seven days delays non-security version proposals] → Accepted policy. Security updates remain outside this cooldown requirement.
- [Literal comparison may reject a path previously accepted through accidental regex behavior] → Cover the intended case-insensitive `dependencies/<directory>/Move.toml` match and the metacharacter non-match in compiler tests.
- [Another branch advances `main` before merge] → Rebase onto `main` and re-check whether the traversal still exists before adding its suppression.

## Migration Plan

1. Create the remediation branch from current `origin/main`.
2. Apply the workflow, Dependabot, literal-path, and narrow suppression changes.
3. Run the affected workflow, compiler, component, and authorization tests.
4. Open one pull request targeting `main`.
5. Roll back by reverting that pull request. No data migration or deployment configuration is involved.

## Open Questions

None. The scan baseline, seven-day cooldown, and duplicate-suppression decision are settled. The OAuth finding remains intentionally unresolved rather than blocking this change.
