# 1. Research

## 1.1 Decision: Materialize the Full Cached Dependency Tree During Deploy-Grade Build

**Decision**: Use the bundled `resolvedDependencies.dependencies` payload as the source of truth for deploy-grade compilation on cache hits, and materialize every required dependency package into the local file tree instead of reconstructing only `deps/world`.

**Rationale**: The shipped snapshots already contain package payloads for `MoveStdlib`, `Sui`, and `World`, but the current runtime path only turns the `World` package back into local files. That leaves transitive packages available for the builder to fetch at build time, which matches the observed `raw.githubusercontent.com/MystenLabs/sui/...` 429 failures.

**Alternatives considered**:

- Keep the current `world`-only reconstruction and add retries/backoff. Rejected because it does not remove the upstream dependency that triggers the 429s.
- Introduce a server-side proxy/cache for GitHub package files. Rejected for the initial fix because the repository already ships enough data to satisfy supported targets locally.
- Replace the snapshot format with a new flattened artifact. Rejected because the current serialized package payloads are already expressive enough for complete local materialization.

## 1.2 Decision: Preserve the Current Snapshot Schema and Add Validation Instead of Replacing It

**Decision**: Keep the existing `BundledDependencySnapshot` shape, but strengthen preload-time and runtime validation around required packages and non-empty file maps.

**Rationale**: The current snapshot format already serializes the full dependency package payloads returned by the builder. Replacing it would add migration cost without solving the main runtime gap.

**Alternatives considered**:

- Add a brand-new binary or tarball-based snapshot format. Rejected because the JSON snapshots are already checked in, inspectable, and compatible with the current runtime loader.
- Store only `world` files in the snapshot. Rejected because the observed failures come from transitive dependencies, not only the root `world` package.

## 1.3 Decision: Treat Bundled Snapshots as Release Artifacts That Must Track `packageReferences.ts`

**Decision**: Require every maintained remote `sourceVersionTag` in `packageReferences.ts` to have a matching validated snapshot under `public/deploy-grade-resolution-snapshots/`.

**Rationale**: The cache-first design only works if the static assets remain aligned with the supported remote targets. Missing or stale snapshots would silently push users back onto the network-backed path.

**Alternatives considered**:

- Allow releases to ship without a matching snapshot and rely on runtime fallback. Rejected because that would make the 429 regression reappear for supported targets.
- Load snapshots lazily from a remote CDN at runtime. Rejected because it adds another network dependency and does not guarantee offline bundle integrity.

## 1.4 Decision: Keep Network Fetches as an Explicit Fallback, Not the Primary Path

**Decision**: Use bundled snapshots first for supported targets, and only fall back to `fetchWorldSource()` plus live dependency resolution when the snapshot is missing, invalid, or intentionally unsupported.

**Rationale**: The existing network-backed path remains necessary for unsupported tags and local experimentation, but it should no longer be the common path for maintained targets.

**Alternatives considered**:

- Remove the fallback and hard-fail on any snapshot miss. Rejected because local and future targets still need a recovery path.
- Always run both cache and network resolution in parallel. Rejected because it preserves unnecessary GitHub traffic and complicates deterministic deploy-grade behavior.