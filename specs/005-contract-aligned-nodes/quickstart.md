# Quickstart: Contract-Aligned Nodes

**Feature**: 005-contract-aligned-nodes  
**Date**: 2026-03-17

## Prerequisites

- Bun ≥ 1.0
- Node.js ≥ 18 (for Playwright)
- Git (branch `005-contract-aligned-nodes` checked out)

## Setup

```bash
# Install dependencies
bun install

# Start dev server
bun dev
```

## What Changed

This feature replaces the 9 placeholder node definitions with 31 contract-aligned node definitions derived from `docs/CONTRACTS.md`. The node palette now accurately represents the reusable scoring, filtering, config-access, and data-access concepts from EVE Frontier turret strategy contracts.

### Key Files

| File                                    | Change                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `src/data/node-definitions.ts`          | 31 contract-aligned definitions with reusable config accessors |
| `src/nodes/createNode.tsx`              | New factory function for generating node components  |
| `src/nodes/index.ts`                    | Registry generated via factory (was manual imports)  |
| `src/nodes/BaseNode.tsx`                | Unchanged — all nodes render through this            |
| `src/utils/socketTypes.ts`              | Existing compatibility rules validated against the new node set |
| `src/__tests__/nodeDefinitions.test.ts` | Parameterized tests for all 29 definitions           |
| `src/__tests__/canvasFlow.test.tsx`     | Canvas drop coverage plus unknown-node migration handling |
| `src/__tests__/socketTypes.test.ts`     | Socket compatibility regression tests for valid, invalid, and `any` links |
| `src/__tests__/Sidebar.test.tsx`        | Sidebar grouping and drag-metadata coverage          |
| `tests/e2e/canvas.spec.ts`              | Browser coverage for dropping representative contract nodes |

### Deleted Files

The individual node component files (`AggressionNode.tsx`, `ProximityNode.tsx`, `GetTribeNode.tsx`, `ListOfTribeNode.tsx`, `IsInListNode.tsx`, `AddToQueueNode.tsx`, `HpRatioNode.tsx`, `ShieldRatioNode.tsx`, and `ArmorRatioNode.tsx`) are replaced by the factory pattern in `createNode.tsx`.

## Verify

```bash
# Run unit tests
bun run test:run

# Run type checker
bun run typecheck

# Run linter
bun run lint

# Run E2E tests
bun run test:e2e
```

## Using the New Nodes

1. Open the app in the browser (`http://localhost:5179`)
2. The sidebar shows 31 nodes grouped by category
3. Drag representative nodes from each category onto the canvas, for example `Aggression`, `Get Priority Weight`, `Get Tribe List from Config`, `Exclude Same Tribe`, `Group Bonus Config`, and `Add to Queue`
4. Connect sockets — valid links such as `target` → `target` are accepted, while invalid links such as `number` → `tribe` are rejected
5. Compose a full targeting graph (for example `Proximity` → `Get Tribe` → `Exclude Same Tribe` → `Behaviour Bonus` → `Add to Queue`)
6. If a saved graph contains a removed node type, the canvas omits that node and logs a warning instead of crashing
