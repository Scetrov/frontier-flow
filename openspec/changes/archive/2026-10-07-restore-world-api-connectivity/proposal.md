## Why

Issue #119 cannot load List of Tribe options because the configured Stillness World API hostname (`world-api-stillness.live.tech.evefrontier.com`) no longer resolves. The replacement candidate `https://world-api-stillness.live.pub.evefrontier.com` responds successfully with browser CORS support; restoring this independent data path must not wait for the separate Sui JSON-RPC migration.

## What Changes

- Establish the public Stillness hostname as the shared World API base URL after verifying its environment and collection schema; remove production requests to the obsolete hostname.
- Route node-editor tribe/ship options, simulation reference data, and the existing World API client through that shared configuration without changing persisted node selections.
- Update the deployed Content Security Policy to permit the replacement origin.
- Provide actionable World API failure messaging and an explicit retry path without blaming Sui or discarding selections.
- Add regression coverage of the actual List of Tribe editor workflow, ship and simulation consumers, failed fetch/retry behavior, and deployed CSP behavior. Keep deterministic tests separate from opt-in live endpoint checks.

## Capabilities

### New Capabilities

- `world-api-connectivity`: Shared Stillness endpoint configuration, browser access, recoverable lookup failures, and regression coverage for World API consumers.

### Modified Capabilities

None. Existing package-reference integrity requirements remain unchanged.

## Impact

- Primary code: `src/nodes/NodeFieldEditor.tsx`, `src/nodes/nodeFieldEditorOptions.ts`, `src/utils/worldApiClient.ts`, and `src/utils/turretSimulationReferenceData.ts`.
- Hosting: `netlify.toml` connect-src policy and any corresponding deployment/security assertions.
- Tests: canvas/editor, World API client, simulation reference-data, and Playwright browser suites.
- No new runtime dependency is expected. No graph schema, package-reference bundle, wallet, or Sui transport change is included.
- Companion change: `migrate-sui-to-grpc`. Implement this change first for rapid restoration; the two fixes address separate failures in #119 and neither may claim to resolve the other's path.
