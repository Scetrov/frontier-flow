## Context

A generated Graphify index exists locally in `graphify-out/`. Pi and other compatible agents load root `AGENTS.md`; fresh clones will not have the ignored index.

## Goals / Non-Goals

Goals: make existing graph navigation discoverable, preserve local artifacts, and gracefully handle absent tools or indexes.

Non-goals: commit the index, add dependencies, configure global skills, install Git hooks, or automatically run semantic extraction.

## Decisions

- Use Graphify's generated AGENTS.md guidance, supplemented with availability checks and source verification. A global skill would not travel with this repository, and platform-specific hooks would add unnecessary coupling.
- Keep the user's directory-wide ignore rule instead of maintaining artifact-specific exclusions: caches and future output formats should also remain local.
- Refresh code relationships locally after code edits; leave LLM-backed rebuilds under operator control.

## Risks / Trade-offs

- [Index is missing or stale] → Fall back to source search and verify graph findings against current files.
- [Semantic rebuild has cost or sends source externally] → Never initiate it automatically.

## Migration Plan

Merge the instructions and ignore rule. Existing local index remains untouched; fresh clones can optionally build an index. Roll back by reverting these documentation and ignore changes.

## Open Questions

None.
