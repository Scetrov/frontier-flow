# 1. OSV vulnerability investigation

## 1.1. Dependency paths and fixes

The baseline command `osv-scanner scan source --lockfile=bun.lock --format=json` returned exit 1 with exactly the seven reported advisories across 438 packages. The same command after remediation returned exit 0 with no findings.

| Advisory            | Package        | Impact                                       | Fixed in current major | Selected |
| ------------------- | -------------- | -------------------------------------------- | ---------------------- | -------- |
| GHSA-333x-w4r6-6crp | fast-uri 3.1.8 | Suffix-reference scheme injection            | 3.1.9                  | 3.1.9    |
| GHSA-w74x-v6f9-j3xg | fast-uri 3.1.8 | Encoded-scheme spoofing                      | 3.1.9                  | 3.1.9    |
| GHSA-wjr9-j795-jxcr | fast-uri 3.1.8 | Host canonicalization confusion              | 3.1.9                  | 3.1.9    |
| GHSA-xhq7-xmqj-769h | fast-uri 3.1.8 | Relative-reference destination changes       | 3.1.9                  | 3.1.9    |
| GHSA-4qv8-2p9j-2685 | undici 8.12.1  | Unbounded EventSource parser state           | 8.12.2                 | 8.12.3   |
| GHSA-f72v-6w45-q472 | undici 8.12.1  | Mixed-case SRI verification bypass           | 8.12.2                 | 8.12.3   |
| GHSA-xjj6-f33q-929c | undici 8.12.1  | Unhandled stream error crashes fetch process | 8.12.2                 | 8.12.3   |

The paths are `@commitlint/config-validator → ajv → fast-uri` and `jsdom → undici`. These are development dependencies; lockfile exposure is confirmed, but this investigation does not establish a production application exploit. The old explicit fast-uri override and stale undici lockfile resolution caused the scanner findings.

The npm registry's `three` tag for fast-uri was 3.1.9 and its latest major was 4.2.3; Ajv requires 3.x. Undici's `latest` tag was 8.12.3, satisfying jsdom's `^8.11.2` requirement. Exact overrides retain registry-provided SHA-512 hashes in `bun.lock`. No unrelated dependency versions changed. The separate `deno.lock` contains neither affected package and requires no change.

## 1.2. Behavioral evidence

Run `node --test scripts/security/fast-uri-regression.mjs scripts/security/undici-regression.mjs`.

- Before remediation: all four new URI checks and all four Undici vulnerability checks failed (two checks exercise the EventSource advisory). Valid-behavior controls passed.
- After remediation: all 13 checks passed; `bun run test:security` passed all 17 security checks including previous advisories.
- The crash-sensitive content-encoding test runs in a bounded child process. Undici 8.12.1 terminated it with an unhandled `ResponseContentLengthMismatchError`; 8.12.3 rejected fetch without terminating the process.
- The suffix regression serializes an explicit component with an omitted scheme and a colon-bearing path. The advisory's string-normalization example is not a suitable patched-version assertion because malformed-input normalization can preserve the original string. The final serialization check was independently confirmed red against the published 3.1.8 package and green against 3.1.9.
- Encoded-scheme resolution now throws a malformed-scheme error; the regression asserts that rejection rather than expecting a returned URL.

## 1.3. Validation

- `pre-commit run --all-files`: OSV-Scanner, production build, lint, typecheck, vulnerability audit, and unit/security tests passed.
- `bun run test:coverage`: 119 test files passed, 935 tests passed, one existing test skipped; all coverage thresholds passed. The separate 17 security checks also passed.
- Both patched package SHA-512 hashes were compared directly with the npm version metadata and matched the committed lockfile.
- A clean install using CI's Bun 1.3.10 image, `docker.io/oven/bun:1.3.10@sha256:b86c67b531d87b4db11470d9b2bd0c519b1976eee6fcd71634e73abfa6230d2e`, passed `bun install --frozen-lockfile --ignore-scripts` and all eight URI tests via `bun test ./scripts/security/fast-uri-regression.mjs`.
- The initial URI reproduction also failed in that container. Full Undici behavioral tests ran under host Node 24.21.0, not Bun, to exercise Node-specific stream crash behavior.
- The host scanner was OSV-Scanner 2.3.3. The configured pre-commit scanner revision is pinned to v2.6.0 and also passed.
- Native `pre-commit install` refused the existing Husky `core.hooksPath`. With operator approval, `.husky/pre-commit` now invokes the configured pre-commit stage without replacing the existing commit-message signing checks.

## 1.4. Sources

Each advisory was checked against the live OSV API at `https://api.osv.dev/v1/vulns/<advisory-id>` and its referenced upstream security advisory. Release selection and integrity values were checked against `https://registry.npmjs.org/fast-uri` and `https://registry.npmjs.org/undici`.

- [Suffix-reference patch](https://github.com/fastify/fast-uri/commit/a9b8d67353630aab053cd727cf629023dd018d2b)
- [Encoded-scheme patch](https://github.com/fastify/fast-uri/commit/597f254c86d151568511eeb9a1df761fd12520b3)
- [EventSource retained-state patch](https://github.com/nodejs/undici/commit/789ef26461c648480433846607154f52d74ec9ab)
