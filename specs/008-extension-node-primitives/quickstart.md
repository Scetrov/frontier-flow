# Quickstart: Extension Node Primitive Refactor

## Goal

Verify that the canvas supports primitive boolean composition, editable list-valued nodes, seeded example contracts in the Load panel, and safe legacy graph migration.

## Prerequisites

- Bun installed and available in the shell
- Project dependencies installed
- Workspace opened at `/home/scetrov/source/frontier-flow`
- Browser environment available for manual or Playwright verification

## Happy Path

1. Start the app with `bun dev`.
2. Open the node palette and confirm primitive boolean operator nodes for `NOT`, `AND`, `OR`, and `XOR` are available.
3. Build a simple rule equivalent to "exclude same tribe unless aggressor" using `Is Same Tribe`, `Is Aggressor`, `NOT`, and `AND` or `OR` as appropriate.
4. Add a node that uses a list-valued field, open its editor, add multiple tribe or type ID values, save, and reopen it to confirm persistence.
5. Open the Load panel in a clean local state and confirm curated example contracts are already present.
6. Load one seeded example and verify the canvas renders a complete graph without manual repair.

## Legacy Migration Path

1. Prepare or load a saved graph containing a retired config-object node or bundled exclusion node.
2. Restore the graph.
3. Confirm exact legacy mappings are replaced with the new primitive-node structure automatically.
4. Confirm any non-convertible legacy content is preserved in a safe load state and surfaced with a clear remediation notice instead of disappearing silently.

## Unsaved Work Protection Path

1. Modify the current canvas without saving.
2. Open the Load panel and select a seeded example contract.
3. Confirm the application asks for explicit confirmation before replacing the current graph.

## Test Execution

1. Run targeted unit and component tests for node definitions, migration, contract storage, and field editor behavior.
2. Run Playwright coverage for seeded example loading and legacy restore behavior.
3. Run the normal verification commands required by the workspace before merging.

## Expected Evidence

- Primitive operator nodes appear in the node catalogue and connect only through valid boolean sockets.
- List-valued node data survives save, reload, and node re-open flows.
- Seeded example contracts appear in the Load panel without erasing user-created contracts.
- Legacy graphs with exact mappings auto-migrate successfully.
- Legacy graphs without exact mappings produce actionable remediation instead of silent node loss.
