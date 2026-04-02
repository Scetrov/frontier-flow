# 1. Quickstart

## 1.1 Regenerate Bundled Deploy Cache Snapshots

Run the preload script from the repository root:

```bash
bun run ./scripts/preload-deploy-cache.ts ./scripts/deploy-cache-packages.json
```

Expected outcome:

- `public/deploy-grade-resolution-snapshots/v0.0.18.json` is regenerated.
- `public/deploy-grade-resolution-snapshots/v0.0.21.json` is regenerated.
- The script fails if a required package payload is missing.

## 1.2 Verify Target Coverage

Confirm that every maintained remote target in `src/data/packageReferences.ts` has a matching snapshot file under `public/deploy-grade-resolution-snapshots/`.

## 1.3 Run Focused Verification

Run the deploy-grade tests:

```bash
bun run test:run src/__tests__/dependencySnapshotValidation.test.ts src/__tests__/compiler/deployGradeCompiler.test.ts src/__tests__/deploymentExecutor.test.ts src/__tests__/compiler/moveCompiler.test.ts src/__tests__/worldSourceFetcher.test.ts
```

Expected outcome:

- Cache-hit deploy-grade compilation reuses bundled snapshots.
- Invalid or mismatched snapshots trigger fallback or targeted validation errors.
- Transitive dependency materialization is covered in unit tests.
- Authoring-time compilation remains isolated from deploy-grade snapshot loading.

## 1.4 Manual Browser Check

1. Start the app with `bun run dev`.
2. Open DevTools Network and filter on `raw.githubusercontent.com`.
3. Trigger deploy-grade compilation for `testnet:stillness` or `testnet:utopia`.
4. Confirm that a cache-hit compile produces no `MystenLabs/sui` source fetches.

## 1.5 Fallback Check

Temporarily rename or remove a matching snapshot file, then trigger deploy-grade compilation again.

Expected outcome:

- The runtime reports a cache miss or invalid snapshot.
- The network-backed fetch path is used only after the cache cannot satisfy the request.

## 1.6 Verification Notes

- Focused local verification passed: `47` tests across the deploy-grade compiler, executor, snapshot validation, authoring compiler, and world-source fetcher suites.
- Snapshot regeneration passed for `v0.0.18` and `v0.0.21` with the updated manifest coverage.
- Maintain `scripts/deploy-cache-packages.json` only for supported remote targets that ship bundled cache artifacts.
- Regenerated snapshots are deterministic because dependency package ordering and file ordering are canonicalized before serialization.
- Warm cache-hit timing should still be recorded manually against the `< 30s` target after the browser deploy flow is exercised on the target machine.