## graphify

This project uses a local knowledge graph at `graphify-out/` for architectural hubs, community structure, and cross-file relationships. The generated index, caches, reports, and query memory are intentionally ignored by Git and are not included in fresh clones.

Run commands from the repository root. If the Graphify CLI or `graphify-out/graph.json` is missing, use normal source-search tools instead and mention that graph-assisted navigation is unavailable. Do not install tools or trigger LLM-backed extraction automatically. An operator can build a local code-only index with `graphify extract . --code-only`, or rebuild a semantic index with their configured backend.

When the user types `/graphify`, use the Graphify skill if installed; otherwise use the CLI commands below.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- Treat graph results as navigation hints, not authoritative evidence: verify relevant source files before making changes, especially when the index may be stale.
- After modifying code, run `graphify update .` when the CLI and local index are available to refresh AST relationships without LLM extraction. Semantic relationships may still need an operator-requested rebuild.
- Keep all generated `graphify-out/` contents local; never force-add the index to commits.
