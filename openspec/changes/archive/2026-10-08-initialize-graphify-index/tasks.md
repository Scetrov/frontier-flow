## 1. Repository initialization

- [x] 1.1 Add persistent Graphify navigation, availability fallback, and refresh guidance to root AGENTS.md.
- [x] 1.2 Preserve the graphify-out/ ignore fix without staging generated artifacts.

## 2. Validation and handoff

- [x] 2.1 Smoke-test a bounded query against the existing index and verify ignored artifacts.
- [x] 2.2 Run configured pre-commit checks.
- [x] 2.3 Archive this tooling-only change before the signed commit and PR.

Validation: a 300-token compilation query succeeded against 3,842 nodes; index, cache, and report paths are ignored, with no tracked graphify-out files. All configured pre-commit checks passed (OSV, build, lint, typecheck, audit, unit tests). The operator approved archiving without a delta spec because this change only affects development-tooling guidance.
