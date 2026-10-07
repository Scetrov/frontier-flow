## Context

`bun.lock` resolves one copy of `source-map-js@1.2.1`. `@tailwindcss/node`, `css-tree`, `magicast`, and the overridden `postcss@8.5.25` all accept `^1.2.1`, so the vulnerable resolution is transitive rather than a direct application import. [GHSA-68fv-2mgg-jv7q](https://osv.dev/vulnerability/GHSA-68fv-2mgg-jv7q) affects 1.0.0 through 1.2.1 and is fixed in 1.2.2. The patched release rejects invalid section offsets and bounds accepted line offsets; its release notes identify the fix as CVE-2026-93749.

The repository already runs `bun run audit` (`bunx npm-audit --audit-level=high`) in both pre-commit and CI. That does not satisfy the request for OSV-Scanner, and prior fast-uri work used OSV-Scanner manually rather than as a hook. `.pre-commit-config.yaml` explicitly warns agents not to disable hooks or use `--no-verify`.

## Goals / Non-Goals

**Goals:** Move every Bun resolution outside the advisory range with integrity, prove the installed package rejects unsafe small malformed offsets, and make OSV-Scanner a fail-closed local pre-commit gate.

**Non-Goals:** Adding an OSV-Scanner CI workflow, replacing `npm-audit`, disabling existing hooks, scanning or modifying generated `node_modules`, changing application source-map behavior, or creating a regression input that can block an event loop. No claim is made that the deployed application is exploitable through this development/build dependency.

## Decisions

### Override the transitive resolution

Add a `source-map-js` override at the verified compatible fixed release, then regenerate `bun.lock` so all four consumers resolve the same integrity-pinned version. Verify the latest applicable 1.x release at implementation time; use 1.2.2 if it remains current, or a later compatible 1.x release if one exists. Do not jump to an incompatible major solely because it is newer.

Alternative: refresh only one consumer. Rejected because the lockfile has one shared resolution and a partial edit can be overwritten by the next install.

### Keep the regression bounded

Test the package resolved by the committed Bun graph, not a separately installed copy. Assert version 1.2.2 or later and its recorded integrity. Behavior tests may use negative, fractional, non-numeric, and other small invalid offsets, plus one minimal valid indexed source map. They must finish promptly.

Do not pass a multi-million-line or larger offset to either the patched or unpatched parser. A test timeout cannot interrupt the synchronous blocking behavior that defines this vulnerability, so a large fixture would recreate the denial of service. Version and OSV evidence cover the upper-bound fix; behavioral tests cover prompt rejection of small malformed input and preservation of valid maps.

### Run OSV-Scanner only as a pinned pre-commit hook

Add the official `osv-scanner` hook from `https://github.com/google/osv-scanner` on the `pre-commit` stage. Pin `rev` to the full commit SHA of the latest applicable release verified during implementation, not a floating branch. Use `always_run: true` and `pass_filenames: false`. Scan the committed `bun.lock` explicitly so `node_modules`, build output, and the unsupported Deno v5 lockfile do not create false failures or false clean claims. OSV-Scanner v2.6.0 does not support npm `package.json` extraction; verify the manifest separately through the advisory regression and a frozen-lockfile install rather than claiming it was vulnerability-scanned. If Deno lockfile support remains absent, record that limitation after a structural check; do not report it as a successful vulnerability scan.

The hook must fail when GHSA-68fv-2mgg-jv7q is present, when another detected vulnerability is present, or when the scanner cannot run or reach its advisory data. Do not add a broad ignore file to force success. Unrelated findings require remediation or a separately reviewed, advisory-specific exception; they are not silently accepted by this change.

Do not add the hook to `commit-msg`, and do not add an OSV-Scanner job, action, or duplicate script call to `.github/workflows/`. Existing CI audit requirements stay as they are.

Alternative: a Docker-image hook. Rejected unless its image is pinned by digest; the current upstream Docker hook example uses a mutable tag. The Go hook pinned by Git commit gives the required integrity anchor, at the cost of a longer first run.

## Risks / Trade-offs

- [Override conflicts with a consumer's declared range] → Confirm all current ranges accept the selected release and run the relevant build/test gate after lockfile regeneration.
- [A behavioral test becomes the exploit] → Forbid large line-offset fixtures and run tests only against the resolved patched package.
- [Scanner network or extra advisories block all commits] → Fail closed, establish a baseline before enabling the hook, and surface unrelated advisories for explicit review instead of ignoring them.
- [Recursive scanning fails on `deno.lock`] → Scan the supported Bun lockfile explicitly and document the unsupported file.
- [Developers bypass the new hook] → Keep the existing warning, do not document `--no-verify`, and verify with `pre-commit run osv-scanner`.

## Migration Plan

1. Record the current vulnerable resolution and a failing OSV result for GHSA-68fv-2mgg-jv7q.
2. Verify the fixed release and integrity, update the override and lockfile, and confirm every consumer resolves it.
3. Add the bounded regression and wire it into the existing security test command.
4. Pin and add the pre-commit hook, then run it without disabling any existing hook.
5. Confirm no CI workflow gained an OSV-Scanner job. Roll back by reverting the override, lockfile, hook, and tests together; do not leave a passing scanner configuration that ignores the advisory.

## Open Questions

- Does the verified latest 1.x release remain 1.2.2 at implementation time? The implementation must check the registry rather than trust this proposal.
- Does the baseline OSV-Scanner run report advisories other than GHSA-68fv-2mgg-jv7q? Those findings must be triaged before the hook is allowed to pass.
- Which exact upstream commit SHA corresponds to the selected OSV-Scanner release? Resolve and pin it during implementation.
