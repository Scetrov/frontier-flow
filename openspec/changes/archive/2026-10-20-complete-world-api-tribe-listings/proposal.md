## Why

The List of Tribe editor and the turret simulation modal both show only the 100 oldest tribes. `/v2/tribes` holds 167 records; World API serves 100 of them when a request omits `limit`, ordered by ascending id, so every tribe created after the hundredth is invisible. Nothing reports the shortfall: `metadata.total` is capped at `limit + 1`, so a truncated page is indistinguishable from a complete one, and both consumers succeed without an error.

The practical effect is that no current-cycle tribe can be selected. Cross-checking the live collection against the community index at `https://evedataco.re/api/tribes` on 2026-10-20 found 38 tribes there and exactly one of them — the NPC corp `1000167` — reachable in the application. The other 37 include every tribe with an active roster.

The configured endpoint is correct and current; this is not endpoint drift. The same host returns the complete collection when asked for it.

## What Changes

- Default World API collection URLs to a page size that covers the whole collection, so no consumer can omit `limit` and silently receive a partial list. An explicitly narrowed page size is preserved.
- Record the service's pagination constraints discovered by read-only probing: `limit` is accepted up to 1000 and rejected above it, and `offset` discards two records per unit, making offset paging unsafe.
- Collapse records that repeat an `id`, keeping each id's first position and last value, so the duplicate `1000167` resolves to `Clonebank 86` rather than the placeholder `NPC Corp 1000167` and option values stay unique.
- Report a truncated collection through `console.warn` when the service says more records exist than the requested page size, so a future regression is visible instead of silent.
- Extend World API client coverage for the page-size default, the explicit-limit override, a full 167-record read, duplicate collapse, id-less records, and both truncation branches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `world-api-connectivity`: collection requests must retrieve the complete collection, collapse repeated identifiers, and report truncation.

## Impact

- Primary code: `src/utils/worldApiClient.ts`. Both consumers (`src/nodes/NodeFieldEditor.tsx` via `src/nodes/nodeFieldEditorOptions.ts`, and `src/utils/turretSimulationReferenceData.ts`) reach the service through this boundary and need no change.
- Tests: `worldApiClient`, `nodeFieldEditorOptions`, `turretSimulationReferenceData`, `worldApiSuiIndependence`, and `canvasFlow` pinned the bare collection URLs and now pin the page size.
- The base URL, CSP, request origin, option mappings, and persisted numeric selections are unchanged, so `netlify.toml` and the Playwright CSP regression need no edit.
- No new runtime dependency, no graph schema change, and no package-reference change.
