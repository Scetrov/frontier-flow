## Context

Issue #119 reports two independent failures. `NodeFieldEditor` directly fetches `/v2/tribes` or `/v2/ships` through `loadWorldApiOptions`; no Sui RPC is involved. The old Stillness `live.tech` hostname fails DNS resolution. A read-only probe on 2026-10-07 found the `live.pub` tribes endpoint returned HTTP 200, a `{ data, metadata }` envelope, and `Access-Control-Allow-Origin: *`. The response reported two tribes, so availability alone is not proof of the intended current dataset.

The base URL is duplicated between the node editor, simulation reference-data loader, and `worldApiClient`. The option loader caches successful results by URL. Netlify CSP currently allows only the old World API origin. The existing canvas test explicitly expects the obsolete URL, illustrating why a mocked happy-path test alone did not detect the outage.

## Goals / Non-Goals

**Goals:** Restore tribe and ship selection; consistently configure all existing World API consumers; retain numeric selection persistence; permit browser access under production CSP; expose recoverable service-specific errors; test the original user workflow and deployment policy.

**Non-Goals:** Sui transport migration, wallet changes, package-reference updates, automatic endpoint discovery, a generic proxy, new Utopia routing semantics, or a broad collection-pagination redesign. Preserve current Stillness-backed behavior independently of the selected deployment target; do not infer an unverified Utopia URL.

## Decisions

### One shared endpoint boundary

Use `https://world-api-stillness.live.pub.evefrontier.com` as the canonical default after recording endpoint/environment verification. Reuse and extend the existing `worldApiClient` configuration/URL-building boundary rather than introduce another base-URL constant. Consumers retain their presentation-specific mappings but obtain URLs from the same boundary. Preserve query parameters, payload validation, option labels/descriptions, cache isolation by resolved URL, and saved numeric IDs.

Alternative: replace each literal separately. Rejected because it retains the drift that caused inconsistent configuration. No runtime user-supplied endpoint is required; adding one would enlarge the CSP and trust-boundary scope.

### Treat browser policy as part of the fix

Update `netlify.toml` connect-src to allow the exact replacement HTTPS origin and remove the obsolete World API origin when unused. Do not broaden to arbitrary domains, disable CSP, use `no-cors`, or add a CORS proxy. The candidate service already returns CORS headers; the existing fault is DNS, not a browser permission that JavaScript can override.

### Keep failures local and recoverable

Show a World API-specific message for rejected fetches, non-success HTTP responses, and malformed collection envelopes. Browsers often expose DNS and CORS failures as the same `TypeError`; do not claim to distinguish them from that error alone. Provide an explicit retry action for the editor, do not cache failed requests as successful empty lists, and do not mutate saved selections when loading fails. Retain existing simulation partial-result behavior while identifying the failing data source. Retry must issue a new request, and unmount/stale responses must not update the editor.

Alternative: silently fall back to static or stale data. Rejected because it can misrepresent current tribes and ships.

### Layer regression evidence

1. Unit/consumer tests cover canonical URL construction, query parameters, mappings, valid empty collections, malformed envelopes, HTTP failures, rejected fetches, cache/retry behavior, and simulation partial failures.
2. A canvas/component regression opens the real List of Tribe editor, observes the request URL, selects an item, saves and reopens it. The obsolete hostname is rejected explicitly; an unconstrained mock returning success for every URL is insufficient. Include List of Ship parity.
3. A browser regression adds/opens the node and exercises success plus rejected-fetch/retry. Serve the built application with the actual Netlify CSP header (or an equivalent header derived from `netlify.toml`) so a missing allowlist entry fails. Intercept responses at the network boundary, not the data-loader hook.
4. An opt-in, read-only live smoke checks the tribes and ships endpoints, schema, and browser access from the deployed origin. Run bounded requests without wallet credentials or transactions. Deterministic CI does not rely on upstream uptime; record live failures as failures/unverified evidence, not passes.

## Risks / Trade-offs

- [Public hostname serves an old or different world] → Verify against authoritative EVE Frontier documentation or maintainer confirmation and record provenance before rollout; a 200 response and two records are not sufficient evidence.
- [CSP fixture diverges from production] → Derive the browser-test policy from `netlify.toml` and verify the actual preview/production response header during smoke testing.
- [Cached data conceals a bad endpoint] → Use cold-cache tests and ensure failures are never cached as success.
- [Mocked fetch masks browser behavior] → Require a production-policy browser test and separate real-origin smoke evidence.
- [Sui errors remain after this release] → Explicitly document the companion migration; keep World API UI and tests independent of wallet RPC availability.

## Migration Plan

1. Verify the candidate environment and both collection contracts; record the evidence in the implementation/PR.
2. Reproduce the old URL failure in deterministic tests and, where available, the project's container/browser harness.
3. Centralize URLs, update consumers and CSP together, and add recoverable errors without altering stored graph schemas.
4. Run targeted tests, full applicable quality gates, and built-app CSP browser coverage; perform the opt-in deployed-origin smoke.
5. Release independently before `migrate-sui-to-grpc`. If verification fails, block rollout rather than silently choosing another endpoint. Roll back the release atomically if necessary, explicitly reporting unavailable lookups; the obsolete hostname is not a working fallback.

## Open Questions

- What authoritative source confirms the public Stillness hostname and its current dataset? Implementation must resolve this before release.
- Which deployment preview can supply production-equivalent headers for the live browser smoke? A locally served build with the actual policy covers deterministic CI, but does not replace deployed-origin verification.
