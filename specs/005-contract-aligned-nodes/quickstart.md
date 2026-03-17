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

This feature replaces the 9 placeholder node definitions with 29 contract-aligned node definitions derived from `docs/CONTRACTS.md`. The node palette now accurately represents the reusable scoring, filtering, and data-access concepts from EVE Frontier turret strategy contracts.

### Key Files

| File                                    | Change                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `src/data/node-definitions.ts`          | 29 contract-aligned definitions (was 9 placeholders) |
| `src/nodes/createNode.tsx`              | New factory function for generating node components  |
| `src/nodes/index.ts`                    | Registry generated via factory (was manual imports)  |
| `src/nodes/BaseNode.tsx`                | Unchanged — all nodes render through this            |
| `src/__tests__/nodeDefinitions.test.ts` | Parameterized tests for all 29 definitions           |
| `src/__tests__/canvasFlow.test.tsx`     | Updated to use new node types                        |
| `src/__tests__/Sidebar.test.tsx`        | Updated fixture to use new node definition           |

### Deleted Files

The individual node component files (`AggressionNode.tsx`, `ProximityNode.tsx`, etc.) are replaced by the factory pattern in `createNode.tsx`.

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

1. Open the app in the browser (`http://localhost:5173`)
2. The sidebar shows 29 nodes grouped by category
3. Drag any node onto the canvas
4. Connect sockets — only type-compatible connections are allowed
5. Compose a full targeting graph (e.g., Proximity → Get Tribe → Exclude Same Tribe → Behaviour Bonus → Add to Queue)
