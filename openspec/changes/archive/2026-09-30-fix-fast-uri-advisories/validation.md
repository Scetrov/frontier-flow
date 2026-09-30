# Validation evidence (2026-09-30)

## Investigation

- OSV API advisories: https://osv.dev/GHSA-58mr-gqgx-xq4g, https://osv.dev/GHSA-hrr3-gc8f-f4qj, https://osv.dev/GHSA-qw65-cvwx-89v3.
- Dependency path: @commitlint/cli → @commitlint/load → @commitlint/config-validator → ajv → fast-uri.
- The manifest override and bun.lock selected 3.1.6. The pre-existing node_modules contained stale 3.1.0, so reproduction used verified tarballs rather than that installation.
- npm registry checked live: `three` = 3.1.8; `latest` = 4.2.1. The compatible latest 3.x release is 3.1.8, which fixes all three advisories; forcing 4.x would violate Ajv's ^3.0.1 dependency range.
- No direct fast-uri usage found in application source or Netlify functions. This is a confirmed vulnerable development-tool dependency, not a demonstrated deployed-application exploit.

## Container reproduction

Both registry tarballs were verified against their published SHA-512 integrity before extraction. Identical committed regression tests were run against each package in network-disabled Podman containers:

```sh
podman run --rm --network=none \
  -e FAST_URI_TEST_PACKAGE=/fast-uri \
  -v /tmp/frontier-fast-uri-VERSION/package:/fast-uri:ro \
  -v "$PWD/scripts/security:/tests:ro" \
  docker.io/library/node@sha256:05c08ce4291e9a58f59456a7985176defb12cdd42271f35ff81a3e167ea61d4c \
  node --test /tests/fast-uri-regression.mjs
```

| Package | Advisory regressions | Valid URI control | Exit |
| --- | --- | --- | --- |
| 3.1.6 | All three fail as expected | Pass | 1 |
| 3.1.8 | All three pass | Pass | 0 |

Malformed-host vectors use the upstream regression cases `http://[fe80`, `http://[`, and `http://[not-an-ip`. The advisory's credential-bearing URL spelling did not reproduce the bracket bug as written, so the tests use confirmed upstream cases instead. Port serialization and normalization throw on malformed ports; equality fails closed by returning false.

## Scanner verification

OSV-Scanner v2.6.0 release binary was verified against SHA-256 `ca69b3d3cd08f889a49dc0a383122f71cc528b83803671df5fd874d97485b108` supplied by the GitHub release API.

```sh
osv-scanner scan source -L /tmp/frontier-osv-baseline/bun.lock --format json
osv-scanner scan source -L bun.lock --format json
```

- Baseline lockfile from HEAD: 461 package entries, exactly the three reported advisories on fast-uri 3.1.6, exit 1.
- Patched Bun lockfile: 461 package entries, no vulnerabilities, exit 0.
- Scanner does not support this repository's Deno v5 lockfile. Separate structural inspection confirms deno.lock contains only remote/workspace sections and no npm packages or fast-uri; no clean OSV scan of that file is claimed.

## Project verification

- `bun install --lockfile-only`: passed; only fast-uri resolution and integrity changed in bun.lock.
- `bun install --frozen-lockfile`: passed.
- `bun run test:security`: 4/4 passed against the actual Ajv consumer resolution.
- `pre-commit run --all-files`: build, lint, typecheck, audit, unit tests all passed.
- `bun run test:coverage`: 101 test files passed, one skipped; 707 tests passed, one skipped; four additional security tests passed. Coverage gates passed (83.63% statements, 72.45% branches, 87.68% functions, 83.92% lines).
- `git diff --check`: passed.

The security tests run from both test:run (pre-commit) and test:coverage (CI), without adding dependencies. Existing Husky hook configuration was not disabled or changed.
