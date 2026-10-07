# World API connectivity

## Canonical endpoint and provenance

`src/utils/worldApiClient.ts` owns `https://world-api-stillness.live.pub.evefrontier.com` and collection URL construction. Node editors and simulation reference data use this boundary. No endpoint is inferred from the selected deployment target. The maintainer confirmed the public Stillness origin and intended dataset during the `restore-world-api-connectivity` implementation (2026-10-07).

Read-only probes returned HTTP 200, `{ data, metadata }` envelopes, and `Access-Control-Allow-Origin: *` for tribes and ships. Tribe fields include numeric `id`, `name`, and `nameShort`; ship fields include numeric `id`, `name`, `classId`, and `className`. The observed tribes metadata total was 101 (100 returned by default); ships total was 11. An earlier two-tribe observation was not reproduced. Existing pagination/query behavior is preserved; this change does not claim to retrieve every tribe in one default request.

The candidate's `/docs/doc.json` serves World API v2.0.0 documentation but does not identify the environment itself. The official builder example still referenced the obsolete `live.tech` hostname when checked. Environment confirmation therefore comes from the maintainer, not those documents.

## Deterministic verification

```sh
bunx vitest run src/__tests__/canvasFlow.test.tsx src/__tests__/NodeFieldEditor.test.tsx src/__tests__/nodeFieldEditorOptions.test.ts src/__tests__/worldApiClient.test.ts src/__tests__/turretSimulationReferenceData.test.ts src/__tests__/worldApiSuiIndependence.test.tsx
bun run lint
bun run typecheck
bun run test:run
bun run build
bunx playwright test tests/e2e/world-api-built-app.spec.ts tests/e2e/sui-grpc-built-app.spec.ts --project=chromium
pre-commit run --all-files
```

The cold-cache canvas regression originally failed because it rejects the obsolete URL. It now passes and checks saved selections after reopening. Browser tests use the built app served over loopback HTTPS with the exact CSP read from `netlify.toml`, network-boundary interception (not a mocked loader), tribe/ship parity, explicit retry, reload persistence, and a negative policy-removal test. Keyboard activation opens the editor and toggles its styled checkbox. Unit coverage mounts the real wallet status and editor together to verify that a Sui outage does not prevent World API selection.

## Opt-in live smoke

```sh
bun scripts/world-api-readonly-smoke.ts --live --origin=https://frontier-flow.scetrov.live/
# Once a PR preview exists:
bun scripts/world-api-readonly-smoke.ts --live --origin=https://deploy-preview-123--frontier-flow.netlify.app/
```

Requires the installed Playwright Chromium browser. The script performs credential-free GETs with 15-second request bounds, navigates to the explicit deployment origin with a 20-second bound, records its actual CSP, and fetches both collections inside that browser without intercepting responses. It validates collection envelopes and records CSP violations. Missing policy, navigation/network/HTTP/schema errors, or blocked browser access produce a nonzero exit. An HTTP CORS header alone is not browser verification. Ordinary CI never runs this script or depends on live service availability.

## Rollout and rollback

1. Ship the shared URL change and exact Netlify `connect-src` allowance together. Do not allow arbitrary hosts, disable CSP, use `no-cors`, or add a proxy.
2. Run deterministic quality gates and the preview-origin smoke; record the actual preview response header. Resolve any unavailable/failed verification before rollout approval.
3. Deploy atomically, then run the production-origin smoke and manually open List of Tribe and List of Ship. Select, save, reopen, and confirm numeric IDs persist.
4. If rollout fails, roll back the whole release atomically and explicitly report unavailable lookups. The retired hostname is not a working fallback. Retain users' stored node fields; failures must not erase selections.

The companion `migrate-sui-to-grpc` change concerns independent Sui transport behavior. World API errors must not be attributed to Sui without evidence. This change does not modify wallet transports, graph schemas, package-reference bundles, or runtime dependencies.

Detailed probe and execution evidence is retained in the OpenSpec change's `verification.md` (under `openspec/changes/archive/` after archival).
