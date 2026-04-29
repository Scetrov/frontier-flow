# 1. Research: Node Engine Refactor

## 1.1. Catalog Evolution

- **Decision**: Add a new `enteredAttacked` node definition that exposes the same `priority` and `target` output handles used today by `aggression` and `proximity`.
- **Rationale**: Matching the existing handle ids preserves downstream compatibility with `addToQueue`, target extractors, and existing socket validation rules in `src/utils/socketTypes.ts`.
- **Alternatives considered**: Introduce new output names for the merged trigger. Rejected because it would force broader restore and edge-migration work with no user-facing benefit.

## 1.2. Legacy Trigger Compatibility

- **Decision**: Keep `aggression` and `proximity` in `nodeDefinitions` and hydration, but mark them as deprecated and exclude deprecated definitions from `authorableNodeDefinitions`.
- **Rationale**: `hydrateFlowNode(...)` already restores nodes from the canonical registry, so leaving the runtime types intact preserves saved graphs while a stricter authoring filter hides them from the toolbox.
- **Alternatives considered**: Remove the old node types entirely or mark them as retired and route them through migrations. Rejected because the spec requires direct render/load compatibility for existing saved graphs.

## 1.3. Toolbox Visibility Strategy

- **Decision**: Reuse the existing `deprecation` model on `NodeDefinition` rather than adding a new `hideFromToolbox` property.
- **Rationale**: The project already distinguishes deprecated and retired nodes, and `NodeShell` can surface deprecation state on canvas nodes. Extending the authoring filter is simpler than introducing parallel visibility state.
- **Alternatives considered**: Add a standalone visibility boolean. Rejected because it duplicates meaning already represented by `NodeDeprecation` and increases maintenance overhead.

## 1.4. Trigger-Input Wiring Placement

- **Decision**: Reuse the existing `createAutoWiredAddToQueueEdges` helper behind the `Wire trigger inputs` node context-menu action inside `src/components/CanvasWorkspace.tsx`.
- **Rationale**: The context menu keeps the helper local to the selected queue node, makes the graph mutation explicit, and still reuses the same deterministic edge-generation logic.
- **Alternatives considered**: Trigger wiring inside `handleDrop` or a post-render effect. Rejected because those paths add implicit graph mutations during placement and make it harder to distinguish author intent from background automation.

## 1.5. Deterministic Trigger-Input Targeting

- **Decision**: When the author invokes `Wire trigger inputs`, wire to the first compatible `enteredAttacked` node in stable node order and only create missing `priority -> priority_in` and `target -> target` edges.
- **Rationale**: The feature must avoid duplicates and ambiguous multi-trigger behavior. Stable first-match selection keeps the behavior deterministic and easy to test.
- **Alternatives considered**: Wire to the nearest trigger by coordinates or connect to every compatible trigger. Rejected because spatial heuristics are harder to reason about and multi-connect would violate the spec’s duplicate/conflict constraints.

## 1.6. `addToQueue` Output Removal

- **Decision**: Remove the visible `priority_out` handle from `addToQueue` and align compiler expectations so the action still contributes the final queue weight without that public socket.
- **Rationale**: The socket is redundant in the authoring model, and restore logic already drops edges to missing handles. Compiler fallback behavior can be preserved without exposing the handle to users.
- **Alternatives considered**: Keep `priority_out` hidden in the UI but present in the schema. Rejected because the requirement explicitly removes the port and leaving it in the schema would preserve stale edge paths.

## 1.7. Weight Normalization Layer

- **Decision**: Normalize queue weight values at the node-field normalization layer and ensure compilation paths consume the normalized value so `0` becomes `100` before restore/save/compile outputs.
- **Rationale**: `normalizeNodeFields(...)` already runs during hydration and IR construction, which makes it the most central place to enforce a canonical saved value across restore and compilation.
- **Alternatives considered**: Normalize only in the compiler generator or only in UI event handlers. Rejected because generator-only logic would not fix restored state, and UI-only logic would miss imported or older saved graph data.

## 1.8. Test Strategy

- **Decision**: Update existing node definition, restore, sidebar, canvas, socket, and compiler tests instead of isolating the change in a new narrow suite.
- **Rationale**: The feature spans authoring metadata, restore compatibility, and compiler behavior. Existing tests already cover these seams and provide better regression protection than a standalone happy-path test file alone.
- **Alternatives considered**: Add only a few new focused tests. Rejected because several existing assertions around node counts, labels, default flow content, and removed handles will otherwise fail silently or remain stale.
