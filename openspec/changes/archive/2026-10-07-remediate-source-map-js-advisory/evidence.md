# Implementation evidence

## Registry and upstream verification

Queried the live npm registry (`https://registry.npmjs.org/source-map-js`), OSV API (`https://api.osv.dev/v1/vulns/GHSA-68fv-2mgg-jv7q`), and GitHub latest-release API during implementation.

- npm `latest` and latest compatible 1.x release: **1.2.2**.
- Registry integrity: `sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==`.
- OSV confirms advisory `GHSA-68fv-2mgg-jv7q`, alias `CVE-2026-93749`.
- Latest OSV-Scanner release: **v2.6.0**.
- `git ls-remote` resolves release tag to full commit `e840a6e8adb14b7777c78e26cfbf6e2abc1d1fc6`.
- Downloaded Linux amd64 release binary and verified SHA256 against the release asset digest: `ca69b3d3cd08f889a49dc0a383122f71cc528b83803671df5fd874d97485b108`.

## Current dependency graph

`bun.lock` contains a single `source-map-js@1.2.1` resolution with integrity:

`sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==`

Consumers all declare `^1.2.1`, compatible with 1.2.2:

- `@tailwindcss/node@4.3.3`
- `css-tree@3.2.1`
- `magicast@0.5.4`
- `postcss@8.5.25`

## Container baseline attempt — blocked, not a vulnerability result

Ran the verified scanner binary with Podman in the existing digest-pinned image:

`docker.io/library/node@sha256:05c08ce4291e9a58f59456a7985176defb12cdd42271f35ff81a3e167ea61d4c`

Copied the current manifest and lockfiles into `/tmp/frontier-source-map-osv-cn7ndj` and mounted that directory read-only at `/evidence`. Executed:

```sh
/evidence/osv-scanner scan source --lockfile=bun.lock --format=json
```

Scanner extracted 422 packages, then exited **127** because the advisory request failed:

```text
Post "https://api.osv.dev/v1/querybatch": tls: failed to verify certificate: x509: certificate signed by unknown authority
```

The initial empty `results` array was **not** a clean scan. TLS verification was not disabled.

## Successful vulnerable baseline

The selected slim image lacks `/etc/ssl/certs/ca-certificates.crt`. The host's verified HTTPS request succeeded, while Node inside the container succeeded using its bundled certificates. With user approval, mounted the host CA bundle read-only at `/etc/ssl/certs/ca-certificates.crt` and repeated the same container scan.

The scanner extracted **422 packages** and exited **1** with exactly one affected package: `source-map-js@1.2.1`, advisory **GHSA-68fv-2mgg-jv7q**, alias **CVE-2026-93749**, maximum severity **8.7**. No unrelated advisories were reported. Successful baseline output is saved locally in `baseline.json` and `baseline.stderr` in `/tmp/frontier-source-map-osv-cn7ndj` (temporary, not a committed artifact).

## Dependency remediation and bounded regression

Added the exact `source-map-js: 1.2.2` override and regenerated with `bun install --ignore-scripts`. The lockfile diff contains only the added override and the `source-map-js` version/integrity replacement. All four consumers resolve the same installed `node_modules/source-map-js/package.json` at 1.2.2.

Repeated the container scan against the remediated lockfile with the trusted CA bundle mounted read-only: **422 packages**, exit **0**, no vulnerability findings. Output is saved locally at `/tmp/frontier-source-map-osv-cn7ndj/remediated.json`.

Added `scripts/security/source-map-js-regression.mjs` and wired it into `test:security`, already invoked by `test:run` and the existing unit-test hook. The regression verifies the override, all Bun source-map-js resolution rows, the recorded registry integrity, and all four consumers' installed package versions/paths. The behavioral fixtures use a minimal valid indexed map and only `-1`, `0.5`, `"1"`, `null`, and `false` malformed offsets for line and column. No large offset or independently installed test copy is used.

`bun run test:security`: **8/8 tests pass**, exit **0**.

## Final verification

- `bun install --frozen-lockfile --ignore-scripts`: exit **0**, no dependency changes; manifest/lockfile consistency verified.
- `pre-commit validate-config`: exit **0**.
- `pre-commit run osv-scanner --all-files` in an isolated Git repository containing the saved original lockfile and the exact new hook configuration: exit **1**, identifies GHSA-68fv-2mgg-jv7q and minimal fix 1.2.2.
- The same hook against the remediated working tree: exit **0**, passed.
- Fail-closed probe: ran the actual scanner hook with process-local proxy variables pointing to unavailable `127.0.0.1:1`. Advisory retrieval failed; scanner exited **127** and pre-commit exited **1**. Its zero-vulnerability summary after the error was not treated as success. Normal routing was not changed outside this subprocess.
- Negative regression probe: copied the regression and current manifest into a temporary fixture using the original Bun lockfile and the repository's installed modules. All three tests failed with `source-map-js must be patched`, expected 1.2.2 versus actual locked 1.2.1, before any behavioral fixture ran. No vulnerable package or large-offset fixture was executed.
- `pre-commit run --all-files`: exit **0**. OSV-Scanner, build, lint, typecheck, existing dependency audit, and unit tests all passed. The signed-commit hook remains configured for `commit-msg`; no commit was requested or attempted.
- Existing local-hook configuration is byte-for-byte preserved. No `.github/workflows` diff or OSV-Scanner references; CI still runs `bun run audit`.
- `openspec validate remediate-source-map-js-advisory --strict`: passed.
- `git diff --check`: passed.
- With user approval, synced all three new requirements to `openspec/specs/source-map-js-advisory/spec.md` and archived to `openspec/changes/archive/2026-10-07-remediate-source-map-js-advisory/`. The archive CLI's incomplete-task warning referred solely to task 5.3 (the archive operation itself); its checkbox was completed after successful archival.

Detailed local hook/probe logs are stored in `/tmp/frontier-source-map-osv-cn7ndj`: `hook-baseline.log`, `hook-remediated.log`, `hook-network-failure.log`, `regression-negative.log`, and `pre-commit-all.log`. These temporary logs are not committed and are not required to run the hook or tests.

## Scanner input support — implementation requires a design clarification

OSV-Scanner v2.6.0 accepts `--lockfile=bun.lock`, but rejects `--lockfile=package.json` with exit **127**, `could not determine extractor suitable to this file`. The pinned upstream supported-artifacts documentation lists `bun.lock`, `package-lock.json`, `pnpm-lock.yaml`, and `yarn.lock` for JavaScript, not `package.json`.

Passing the unsupported manifest as a lockfile would permanently block the hook. The user approved updating the design/spec and task 4.2: scan the resolved Bun graph through `bun.lock`, with the manifest verified separately by the regression and a frozen-lockfile install. No successful manifest vulnerability scan is claimed.

`--lockfile=deno.lock` is also rejected with exit **127** and no suitable extractor. A structural JSON check confirms the committed Deno lockfile is version **5**, with top-level `version`, `remote`, and `workspace` keys and no `npm` graph. This structural check is not a vulnerability scan.
