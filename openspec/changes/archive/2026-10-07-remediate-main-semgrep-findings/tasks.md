## 1. Baseline

- [x] 1.1 Create the remediation branch from current `origin/main` and confirm the scanned traversal and workflow files match that baseline
- [x] 1.2 Record whether `useAuthorizationContracts.ts` still contains the scanned read-only traversal before editing it

## 2. Workflow and dependency policy

- [x] 2.1 Pass summary event, ref, run ID, and check outcome into the integrity workflow shell through environment bindings and quoted `printf` expansions
- [x] 2.2 Remove direct `${{ ... }}` interpolation from every `run` script while preserving Actions expressions in concurrency and step conditions
- [x] 2.3 Extend the workflow regression to reject shell-source interpolation and require the data-passing summary form
- [x] 2.4 Set `cooldown.default-days` to 7 for both Bun and GitHub Actions without changing their schedule, limit, or grouping

## 3. Manifest lookup

- [x] 3.1 Replace the dynamic World manifest regular expression with case-insensitive literal path comparison
- [x] 3.2 Add regression coverage for a case-insensitive match and for normalized World directory names containing regular-expression metacharacters

## 4. Narrow suppressions

- [x] 4.1 Add an evidence-backed inline suppression for the test-only dynamic expression without changing the test's behavior
- [x] 4.2 Add an evidence-backed inline suppression for the HTML encoder while preserving ampersand-first encoding
- [x] 4.3 Suppress the scanned prototype-traversal finding only if that traversal remains; otherwise record it as resolved by removal
- [x] 4.4 Verify no global Semgrep ignore, path exclusion, rule disablement, or sanitization dependency was added

## 5. Verification

- [x] 5.1 Confirm the OAuth callback and popup bridge have no behavioral diff and no Logic Flaw suppression
- [x] 5.2 Run the affected workflow, compiler, component, and authorization tests and record their results
