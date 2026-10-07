## Why

A Semgrep scan of the tip of `main` reported 19 findings, but repeated matches, false positives, and one unsubstantiated authentication label obscure the two concrete hardening changes. The repository should remediate the confirmed issues once, apply the accepted seven-day update cooldown, and suppress only documented duplicates and false positives.

## What Changes

- Render the World package integrity workflow summary without interpolating GitHub context directly into shell source.
- Raise the existing Dependabot cooldown from five to seven days for both the Bun and GitHub Actions ecosystems.
- Replace the production dynamic regular expression used to locate a World manifest with one literal, case-insensitive path comparison, covering every duplicate report of that call site.
- Add narrow, evidence-backed suppressions for the duplicate test-only dynamic-expression match, the four duplicate reports of the dedicated HTML-encoding helper, and the read-only prototype-traversal false positive present at the scanned `main` revision.
- Leave the single OAuth "Logic Flaw" finding open and unchanged: review against the scanned revision did not establish an authentication bypass, so it will neither be speculatively patched nor suppressed.
- Do not add a sanitization library or alter authorization discovery behavior to satisfy false-positive rules.

## Capabilities

### New Capabilities

- `semgrep-finding-disposition`: Evidence-backed remediation and narrow suppression of the reviewed `main`-tip Semgrep findings, including literal World manifest lookup and explicit exclusion of the unresolved OAuth finding.

### Modified Capabilities

- `world-package-reference-integrity`: The scheduled integrity workflow must treat GitHub context used in its summary as data rather than shell source.
- `dependency-security`: Dependabot version-update proposals for Bun and GitHub Actions must wait seven days.

## Impact

- `.github/workflows/world-package-integrity.yml` and its workflow-summary regression coverage.
- `.github/dependabot.yml` for both package ecosystems.
- `src/compiler/deployGradeCompiler.ts` and compiler tests covering World manifest lookup, including dependency directory names that are regular-expression metacharacters.
- Narrow suppressions in the scanned test helper, HTML-encoding helper, and `main` authorization-discovery traversal. The suppression for the traversal must target the scanned `main` code, not the rewritten authorization hook on the current migration branch.
- No OAuth callback, token-exchange, popup-bridge, dependency, or authorization-discovery behavior change.
