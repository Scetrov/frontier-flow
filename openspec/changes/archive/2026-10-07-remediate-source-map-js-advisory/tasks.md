## 1. Confirm the vulnerable baseline

- [x] 1.1 Record the current `source-map-js@1.2.1` Bun resolution, its consumers, and a failing OSV-Scanner result for GHSA-68fv-2mgg-jv7q / CVE-2026-93749.
- [x] 1.2 Verify the latest compatible fixed release and its registry integrity; use 1.2.2 or a later compatible 1.x release based on current registry evidence.
- [x] 1.3 Baseline the selected OSV-Scanner release against the current lockfile, triage any unrelated findings, and record the upstream hook commit SHA before enabling the gate.

## 2. Remediate the dependency

- [x] 2.1 Add the verified `source-map-js` override and regenerate `bun.lock` without changing unrelated dependency resolutions.
- [x] 2.2 Confirm `@tailwindcss/node`, `css-tree`, `magicast`, and `postcss` all resolve the patched version and recorded integrity.
- [x] 2.3 Re-run OSV-Scanner and show GHSA-68fv-2mgg-jv7q is absent; do not add a blanket ignore file for remaining findings.

## 3. Add bounded regression coverage

- [x] 3.1 Add a security regression that loads the resolved installed package, checks its patched version and integrity, accepts a minimal valid indexed source map, and rejects small negative, fractional, and non-numeric offsets.
- [x] 3.2 Ensure the regression contains no multi-million-line or larger offset fixture and cannot be satisfied by testing an independently installed copy.
- [x] 3.3 Wire the regression into the existing security test command used by unit tests and pre-commit.

## 4. Add the local OSV-Scanner hook

- [x] 4.1 Add the official `osv-scanner` pre-commit hook pinned to the verified full commit SHA, with `always_run: true`, `pass_filenames: false`, and the `pre-commit` stage only.
- [x] 4.2 Configure it to scan the committed `bun.lock` explicitly, excluding installed or generated trees from the scan scope; verify the manifest separately through the regression and a frozen-lockfile install.
- [x] 4.3 Keep signed-commit, build, lint, typecheck, audit, and unit-test hooks enabled; do not document or use `--no-verify`.
- [x] 4.4 Document unsupported `deno.lock` scanning as a limitation rather than a successful scan, including the structural check used to support that statement.
- [x] 4.5 Verify no GitHub Actions workflow or CI job gained an OSV-Scanner step and the existing CI `npm-audit` gate remains unchanged.

## 5. Verify and document

- [x] 5.1 Run the new hook with `pre-commit run osv-scanner` and the relevant security, build, and unit checks; demonstrate the pre-remediation lockfile fails and the remediated lockfile passes.
- [x] 5.2 Document the advisory, selected version and integrity, hook revision, local-only execution, failure behavior, and rollback in the security documentation.
- [x] 5.3 Validate and archive this OpenSpec after implementation and verification, before the final commit/PR; retain signing and all existing pre-commit gates when committing is requested.
