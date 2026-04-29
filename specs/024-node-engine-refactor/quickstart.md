# 1. Quickstart: Node Engine Refactor

## 1.1. Prerequisites

1. Install dependencies with `bun install` if the workspace is not already bootstrapped.
2. Work from branch `024-node-engine-refactor`.

## 1.2. Run the App

1. Start the authoring app with `bun run dev`.
2. Open the visual editor and confirm the toolbox renders normally.

## 1.3. Manual Verification Flow

1. Open the toolbox and verify `Entered / Attacked` is present in the event-trigger category.
2. Verify `Aggression` and `Proximity` are not offered in the toolbox.
3. Drag `Entered / Attacked` onto the canvas.
4. Drag `Add to Queue` onto the canvas and verify the queue node auto-connects from the trigger for both `priority` and `target` when those inputs are free.
5. Inspect the queue node and verify `Priority Out` is no longer rendered.
6. Load or restore a saved graph containing `Aggression` or `Proximity` and verify the nodes still render.
7. Exercise a queue weight value of `0` through save/compile behavior and verify the resulting stored or emitted value is `100`.

## 1.4. Automated Verification

1. Run `bun run typecheck`.
2. Run `bun run lint`.
3. Run `bun run test:run`.

## 1.5. High-Value Focus Areas

1. `src/__tests__/nodeDefinitions.test.ts`
2. `src/__tests__/Sidebar.test.tsx`
3. `src/__tests__/canvasFlow.test.tsx`
4. `src/__tests__/restoreSavedFlow.test.ts`
5. `src/__tests__/socketTypes.test.ts`
6. `src/__tests__/nodeFieldCatalog.test.ts`
7. `src/__tests__/compiler/generators/actions.test.ts`
8. `src/__tests__/compiler/irBuilder.test.ts`