## 1. Publication Metadata Foundation

- [x] 1.1 Extract a typed, fail-closed parser for maintained `Published.toml` target sections and normalized replacement-versus-upgrade metadata.
- [x] 1.2 Add parser fixtures and unit tests for valid upgrades, valid replacements, missing sections, duplicate keys, malformed IDs, and incomplete identity fields.
- [x] 1.3 Add typed comparison helpers that produce target- and field-level drift diagnostics without applying metadata to an active bundle.

## 2. Atomic Runtime References

- [x] 2.1 Replace the checked-in Stillness package, original package, Object Registry, Server Address Registry, source tag, toolchain, and verification metadata with the verified replacement bundle while retaining the verified Utopia bundle.
- [x] 2.2 Refactor package-reference resolution so remote bundles remain checked-in and version-2/version-3 browser overrides are ignored or removed instead of partially merged.
- [x] 2.3 Represent runtime manifest observations separately from active references and expose matched, stale, unavailable, and malformed freshness outcomes.
- [x] 2.4 Integrate stale-reference status into remote target readiness and user-facing deployment messaging so a drifted target cannot deploy.
- [x] 2.5 Add migration and runtime tests covering matching observations, identity drift, toolchain drift, fetch failure, malformed manifests, legacy stored overrides, and unchanged local-validator behavior.

## 3. Deploy-Grade Cache Alignment

- [x] 3.1 Change the Stillness target mapping in `scripts/deploy-cache-packages.json` from `v0.0.23` to the matching `v0.0.24` source tag.
- [x] 3.2 Regenerate and check in the validated `v0.0.24` deploy-grade resolution snapshot, removing the obsolete Stillness target association without disturbing snapshots still used by other targets.
- [x] 3.3 Update cache loader and compiler tests to prove Stillness selects the new snapshot, Utopia continues selecting `v0.0.21`, and source-tag/cache mismatches fail explicitly.

## 4. Repository Integrity Command

- [x] 4.1 Add a Bun validation script with injectable network clients, fixed authoritative endpoints, bounded timeouts and retries, structural response validation, and credential-safe diagnostics.
- [x] 4.2 Implement current-manifest and pinned-source-tag checks for published ID, original ID, toolchain version, and resolved upstream revision.
- [x] 4.3 Implement deploy-cache manifest, snapshot existence, source-tag mapping, and existing snapshot-integrity checks for every maintained remote target.
- [x] 4.4 Implement Sui testnet GraphQL checks for package existence, registry Move types rooted at `originalWorldPackageId`, and registry IDs created by the original package publication transaction.
- [x] 4.5 Add deterministic script tests for coherent targets, manifest drift, source drift, cache drift, mixed-lineage registries, replacement registry discovery, malformed responses, and exhausted endpoint retries.
- [x] 4.6 Expose the validator as `bun run check:world-package-references` and verify successful output identifies both targets and their resolved upstream revisions.

## 5. Scheduled Validation

- [x] 5.1 Add a weekly and manually dispatchable GitHub Actions workflow with `contents: read`, concurrency cancellation, bounded job timeout, frozen Bun install, and SHA-pinned third-party actions.
- [x] 5.2 Run the shared integrity command from the workflow and publish a concise job summary while granting no permission or mechanism to commit, push, or open issues.
- [x] 5.3 Validate the workflow syntax and add repository-level tests or static assertions for schedule, permissions, action pinning, and invoked command where existing workflow-testing patterns permit.

## 6. Maintenance Documentation

- [x] 6.1 Create `docs/WORLD-PACKAGE-REFERENCE-RUNBOOK.md` covering authority precedence, upgrade versus replacement classification, all atomic fields, matching source-tag selection, on-chain registry discovery, cache regeneration, validation, real-WASM testing, rollback, browser-state migration, and scheduled-failure remediation.
- [x] 6.2 Correct `docs/REMOTE-DEPLOYMENT-DEPENDENCY-RESOLUTION.md` so it distinguishes observational manifest refresh from authoritative checked-in bundles and documents all package-reference fields.
- [x] 6.3 Link the runbook from `README.md`, `docs/DEPLOYMENT.md`, and the dependency-resolution documentation.

## 7. End-to-End Verification

- [x] 7.1 Run focused parser, package-reference, readiness, cache-loader, compiler, and integrity-command tests and resolve all failures.
- [x] 7.2 Run `bun run lint`, `bun run typecheck`, and `bun run test:run` successfully.
- [x] 7.3 Run the production build and verify generated artifacts do not introduce unintended repository changes.
- [x] 7.4 Run the real-WASM integration check against the updated Stillness source/cache path and record any external-service limitations separately from code failures.
- [x] 7.5 Run `bun run check:world-package-references` against live upstream and Sui testnet endpoints and confirm Stillness and Utopia pass all validation layers.
