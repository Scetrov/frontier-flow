# 1. Quickstart: Graph Import, Export, and Publish

**Feature**: 015-graph-io-publish  
**Date**: 2026-03-28

## 1.1. Goal

Wire YAML import/export and Walrus publish/import into the existing saved-contract drawer without changing the local contract library as the primary editing model.

## 1.2. Install Dependencies

Add the new runtime dependencies:

```bash
bun add @mysten/walrus yaml
```

## 1.3. Add the Portable Document Layer

Create a versioned graph document module that:

1. Converts `NamedFlowContract` into a portable document.
2. Validates parsed documents before they become local contracts.
3. Reuses the existing unique-name logic for collision handling.

Expected implementation areas:

- `src/utils/graphDocument.ts`
- `src/utils/graphYaml.ts`
- `src/utils/contractStorage.ts`

## 1.4. Add the Walrus Client Wrapper

Create a thin wrapper over the official Walrus SDK that:

1. Builds a Walrus client with a Vite-friendly WASM URL.
2. Publishes a single YAML blob with typed progress callbacks.
3. Reads a blob back as UTF-8 YAML text.

Expected implementation areas:

- `src/utils/walrusGraphClient.ts`
- `src/utils/walrusGraphConfig.ts`

Implementation note:

- Import the Walrus WASM asset using a `?url` suffix so Vite can serve it to the browser runtime.

## 1.5. Extend the Saved Contract Drawer

Add a focused transfer surface under the existing Save, Save Copy, and Delete controls.

Recommended flow:

1. Keep Save, Save Copy, and Delete as the primary local actions.
2. Add Import, Export, and Publish as adjacent transfer actions.
3. Open a compact dialog or stepper for any action that needs file selection, Walrus reference entry, or publish progress.

Expected implementation areas:

- `src/components/CanvasWorkspace.tsx`
- `src/components/GraphTransferDialog.tsx`
- `src/hooks/useGraphTransfer.ts`

## 1.6. Verify the User Flows

Manual verification checklist:

1. Export the active contract and confirm a YAML file downloads with a readable graph document.
2. Import the same YAML file and confirm the graph reappears as a saved contract without overwriting existing contracts.
3. Publish the active contract to Walrus and confirm a reusable blob reference is shown.
4. Import from that Walrus reference and confirm the graph is restored locally.
5. Attempt malformed YAML and an invalid Walrus reference and confirm the current graph remains unchanged.

Expected timing targets:

1. YAML export should complete and trigger a browser download in under 1 second on a warm local session.
2. YAML import should validate and append the local contract in under 1 second for small graphs.
3. Walrus publish timing is dominated by wallet approval and network latency, but the local UI should advance from button press to the first progress state immediately and through each subsequent state without freezing the canvas.

Manual validation notes:

1. When an imported graph name conflicts with an existing saved or seeded contract, the imported graph should be renamed with the existing `(<n>)` suffix pattern instead of overwriting the existing entry.
2. Canceling or dismissing the transfer dialog should preserve the current draft contract name and active saved contract selection.
3. Invalid Walrus blob ids should surface an inline error and leave the current canvas unchanged.

## 1.7. Run Automated Checks

```bash
bun run lint
bun run typecheck
bun run test:run
```

If the transfer flow receives Playwright coverage in this feature slice, also run:

```bash
bun run test:e2e
```

Targeted verification for this feature slice:

```bash
bun run test:run src/__tests__/useGraphTransfer.test.ts src/__tests__/GraphTransferDialog.test.tsx src/__tests__/canvasFlow.test.tsx
bun run test:e2e -- graph-transfer.spec.ts
```
