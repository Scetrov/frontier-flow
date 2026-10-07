# Endpoint verification evidence

## Read-only probes (2026-10-07)

Candidate origin: `https://world-api-stillness.live.pub.evefrontier.com`.
Requests used a 15-second timeout, no credentials, and an Origin header of `https://frontierflow.scetrov.live` (a probe value, not a verified deployment URL). These are HTTP checks, not deployed-browser CORS verification.

- `GET /v2/tribes`: HTTP 200; `Access-Control-Allow-Origin: *`; top-level keys `data`, `metadata`; 100 records returned; metadata `{ "total": 101, "limit": 100, "offset": 0 }`.
- First tribe fields: `id`, `name`, `nameShort`, `description`, `taxRate`, `tribeUrl`. First record: numeric ID `1000044`, name `NPC Corp 1000044`, short name `SAK`.
- `GET /v2/ships`: HTTP 200; `Access-Control-Allow-Origin: *`; top-level keys `data`, `metadata`; 11 records; metadata `{ "total": 11, "limit": 100, "offset": 0 }`.
- First ship fields: `id`, `name`, `classId`, `className`, `description`. First record: numeric ID `81609`, name `USV`, class ID `25`, class name `Frigate`.
- `GET /docs/index.html`: HTTP 200; Swagger UI references `doc.json`.
- `GET /docs/doc.json`: HTTP 200; title `World API`, description `EVE Frontier World API`, version `v2.0.0`, terms of service `https://evefrontier.com/en`; declares both collections and their ID routes. Its `host` is empty and it does not independently identify the Stillness environment or dataset.
- `GET /config`: HTTP 200; a signing-key configuration array, with no environment identifier.

The earlier design observation of two tribes was not reproduced: this probe returned metadata total 101. No conclusion about current/intended environment follows from HTTP success alone.

## Provenance research

- Official builder example fetched from `https://raw.githubusercontent.com/projectawakening/builder-examples/develop/smart-storage-unit/readme.md` still references `https://world-api-stillness.live.tech.evefrontier.com/v2/types`, not the candidate hostname.
- Search results reference the candidate in `https://frontier.scetrov.live/develop/world-api/` and `https://frontier.scetrov.live/devsecops/useful-urls/`, explicitly unofficial development notes. These are not sufficient authoritative confirmation under task 1.1.
- The candidate serves its own API documentation, but the retrieved document does not establish the intended Stillness dataset.

## Reproduction

- `bunx vitest run src/__tests__/canvasFlow.test.tsx -t 'opens a node field editor'`: failed before the fix, unable to render Pegasus Cartel. The cold-cache fixture only accepts the public tribes URL and explicitly rejects any obsolete/unexpected URL.
- Local Chromium loaded the existing built app using `startProductionCspApp` from `tests/fixtures/production-csp-app.mjs` (temporary OpenSSL loopback certificate). With the original policy, `page.evaluate(() => fetch(publicTribesUrl))` rejected with `Failed to fetch` and emitted a `securitypolicyviolation` whose blocked URI was the public tribes URL.
- Routing `https://world-api-stillness.live.tech.evefrontier.com/**` to `route.abort('failed')`, then fetching that collection in the same browser, reproduced a rejected fetch with `Failed to fetch`. No remote services were modified.
- `podman info --format '{{.Host.Security.Rootless}}'` was available; reproduction used the installed local Chromium harness, requiring no new container image or dependency.
- Repeatable post-fix built-app command: `bun run build && bunx playwright test tests/e2e/world-api-built-app.spec.ts --project=chromium`. The policy-removal regression in that suite reproduces the CSP rejection explicitly.

## Post-fix verification

- Targeted six-file suite: 59 tests passed, including the originally failing cold-cache canvas regression.
- `bun run lint && bun run typecheck && bun run test:run && bun run build`: passed. Full unit result: 114 files passed, 1 skipped; 831 tests passed, 1 skipped. Configured security tests passed.
- `bunx playwright test tests/e2e/world-api-built-app.spec.ts tests/e2e/sui-grpc-built-app.spec.ts --project=chromium`: 5 passed. The built app runs with the policy derived from `netlify.toml`; both collections retry and preserve numeric IDs across reopen/reload. Removing the public origin causes a CSP violation as expected. Existing built-app Sui transport tests remain green.
- `pre-commit run --all-files`: all six configured pre-commit-stage hooks passed (OSV, build, lint, typecheck, audit, unit/security tests). The pre-commit hook is already installed. No commit or signing attempt was requested.
- `openspec validate world-api-connectivity --type spec --strict`: passed after spec sync. A broader `openspec validate --specs --strict` also reported four failures in unchanged pre-existing specs (`best-practices-badge`, `ci-quality-gates`, `repository-security-governance`, `type-aware-quality-linting`); these are outside this change and were not modified.
- `git diff --check`: passed. No production `live.tech` World API references remain; remaining source hits are negative assertions. Changed files do not include graph schemas, package-reference bundles, wallet transport, dependency manifests or lockfiles.

## Production live smoke: unsuccessful (rollout gate)

Command: `bun scripts/world-api-readonly-smoke.ts --live --origin=https://frontier-flow.scetrov.live/`.

- Exit 1, honestly reporting failed deployed-browser verification.
- Direct bounded tribes and ships GETs: HTTP 200, valid envelopes, CORS `*`, tribes count 100 / total 101, ships count 11 / total 11.
- Production document: HTTP 200, but its actual `connect-src` still permits only `https://world-api-stillness.live.tech.evefrontier.com`, not the replacement origin.
- Browser tribes fetch: `TypeError: Failed to fetch`, CSP violation for the public tribes URL.
- Browser ships fetch: `TypeError: Failed to fetch`, CSP violation for the public ships URL.
- This is the existing production policy, not the locally corrected policy. No deployment was performed. A preview containing this change must pass the smoke before rollout approval; no preview PR number was supplied or created.
- Task 4.1 records a completed check, not a successful live smoke. The maintainer requested a PR to generate a preview. Archival uses the passing local verification; failed production-browser verification remains an explicit rollout gate, to be rerun against the PR preview before merge/rollout approval.
- `openspec validate restore-world-api-connectivity --strict`: passed before archival. With maintainer approval to sync, `openspec archive restore-world-api-connectivity --yes` created the main `world-api-connectivity` spec (four requirements) and archived the change on 2026-10-07. The archive command warned about its own not-yet-completed finalization task; no implementation tasks were incomplete.

## PR #124 preview verification

Netlify's preview for signed commit `afd2157c2dfaf9317a37df52ee3a2bb667519f28` became available at `https://deploy-preview-124--frontier-flow.netlify.app/`. The opt-in live smoke exited 0: actual preview CSP permits the public Stillness origin, both browser collection GETs returned HTTP 200 with valid data arrays, and neither emitted CSP violations. Tribes returned 100 records (total 101), ships 11. Evidence was posted in PR comment `https://github.com/Scetrov/frontier-flow/pull/124#issuecomment-6046812102`. Production must still be checked after deployment.

## CI e2e follow-up

Reported job: `https://github.com/Scetrov/frontier-flow/actions/runs/37686581997/job/113016572254?pr=124`.

- CI's authorization workflow expected fixture ship ID `900002` but received live ID `81611`. Its ships/tribes route interceptors still used the retired `live.tech` hostname, allowing restored public-origin requests to reach real data.
- Reproduced before the fix with `CI=true bunx playwright test tests/e2e/authorize.spec.ts --project=chromium --workers=2`, and again in rootless Podman. Both reproduced the same expected/received mismatch.
- Fixture URLs now use production's exported `buildWorldApiUrl` helper. Exact collection interceptors take precedence over a fail-closed catch-all World API interceptor. Observed collection URLs are asserted; unexpected requests cannot silently retrieve live data. The client's independent canonical-origin regression is retained.
- The unchanged targeted Podman reproduction passed after the fixture correction (1 passed).
- Container used cached image content ID `sha256:6e92c4fd8dfdf7276d56743a65002a91c9eb35dbe7af327e6c85bd204b646156`, `--userns=keep-id`, `--network=host`, `CI=true`, two workers, a read/write repository mount, and read-only installed Bun, Playwright Chromium, host userland/library mounts. This reuses the installed toolchain rather than claiming a hermetic CI image.
- Initial full container run lacked the host OpenSSL configuration and failed certificate creation; mounting `/etc/ssl` read-only corrected the harness without changing application code. The subsequent full run exposed a separate mobile tutorial accessibility/color-contrast failure. No tutorial code, assertion, or retry setting was changed. A full confirmation run passed all 68 applicable e2e tests with 22 expected skips (90 discovered).
- Full commands: `bun run build && bun run test:e2e --workers=2` under the above container environment, followed by a confirmation `bun run test:e2e --workers=2`.

## Provenance gate

The maintainer confirmed the candidate origin and intended dataset in this implementation conversation (selected “Confirm as maintainer”). Production is `https://frontier-flow.scetrov.live/`; previews follow `https://deploy-preview-{PR#}--frontier-flow.netlify.app/`. This resolves task 1.1's provenance gate. No rollout or successful live-browser verification is claimed by these HTTP probes.
