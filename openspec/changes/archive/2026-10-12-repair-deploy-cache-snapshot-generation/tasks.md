## 1. Confirm the failing baseline

- [x] 1.1 Reproduce `Dependency cycle detected: starter_contract -> starter_contract` using the committed manifest, with no pending bundle edits.
- [x] 1.2 Confirm the same failure against the checked-in `v0.0.24` entry, establishing that it is not caused by any proposed repin.
- [x] 1.3 After removing `rootGit`, record the second failure, `Move.lock V4 package 'starter_contract' has duplicate named address 'world'`.

## 2. Repair the synthetic root package

- [x] 2.1 Remove the `rootGit` descriptor so the local root is not declared as its own git dependency.
- [x] 2.2 Remove the `world` named address that collides with the `world` dependency name.
- [x] 2.3 Confirm `bun run scripts/preload-deploy-cache.ts` completes and writes a snapshot for each manifest entry.

## 3. Make the behaviour testable

- [x] 3.1 Export `createSyntheticFiles` and extract `createDependencyResolutionRequest`.
- [x] 3.2 Guard the CLI entrypoint with `import.meta.main`, matching `scripts/check-world-package-references.ts`.

## 4. Add regression coverage

- [x] 4.1 Assert the synthetic manifest pins the requested git, revision, and subdirectory.
- [x] 4.2 Assert `[addresses]` declares no `world` entry while retaining `builder_extensions` and `starter_contract`.
- [x] 4.3 Assert the resolution request carries no `rootGit`.
- [x] 4.4 Verify both new assertions fail when the previous behaviour is restored, and that the suite passes once it is removed again.

## 5. Keep the change bounded

- [x] 5.1 Confirm no checked-in snapshot, bundle, or manifest entry is modified.
- [x] 5.2 Run `bun run lint` and `bunx tsc -b`.
