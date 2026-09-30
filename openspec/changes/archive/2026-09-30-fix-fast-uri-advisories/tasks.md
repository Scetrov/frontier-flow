## 1. Investigation

- [x] 1.1 Confirm advisory ranges, compatible latest release, and dependency path.
- [x] 1.2 Reproduce all three affected behaviors using integrity-verified 3.1.6 in an isolated container.

## 2. Remediation

- [x] 2.1 Update the fast-uri override and regenerate the integrity-bearing Bun lockfile.
- [x] 2.2 Add security regressions and rerun the same tests against 3.1.8 in an isolated container.
- [x] 2.3 Verify frozen installation, OSV results, build, lint, typecheck, audit, and unit tests via pre-commit.

## 3. Delivery

- [x] 3.1 Record validation evidence and archive this change before the signed commit and PR.
