## Why

The repository already has a local Graphify index, but future agent sessions have no repository-level guidance to consume it. Generated index artifacts must remain outside version control.

## What Changes

- Add root `AGENTS.md` with graph-first navigation commands and safe missing-index fallback.
- Preserve the existing `.gitignore` change excluding `graphify-out/`.
- Document local refresh and rebuild boundaries without installing dependencies or hooks.

## Capabilities

### New Capabilities

None; this is development-tooling guidance only.

### Modified Capabilities

None; application requirements remain unchanged.

## Impact

Agent navigation and Git ignore rules only. No runtime code, dependency, CI, or API changes.
