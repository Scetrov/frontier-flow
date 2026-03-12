# Quickstart: ReactFlow Canvas Node Components

**Feature**: 004-reactflow-canvas-nodes | **Date**: 2026-03-12

## Prerequisites

- Bun ≥ 1.0.0
- Node.js (for Playwright)
- Feature branch: `004-reactflow-canvas-nodes`

## Setup

```bash
git checkout 004-reactflow-canvas-nodes
bun install
bun dev
```

## Project Structure (Feature Files)

```text
src/
├── types/
│   └── nodes.ts              # Extended NodeDefinition, SocketDefinition, SocketType
├── data/
│   └── node-definitions.ts   # 9 verified node definitions with socket metadata
├── nodes/
│   ├── index.ts              # nodeTypes registry
│   ├── AggressionNode.tsx    # Event trigger node
│   ├── ProximityNode.tsx     # Event trigger node
│   ├── GetTribeNode.tsx      # Data accessor node
│   ├── ListOfTribeNode.tsx   # Data source node
│   ├── IsInListNode.tsx      # Logic gate node (diamond)
│   ├── AddToQueueNode.tsx    # Action node
│   ├── HpRatioNode.tsx       # Data accessor node
│   ├── ShieldRatioNode.tsx   # Data accessor node
│   └── ArmorRatioNode.tsx    # Data accessor node
├── utils/
│   └── socketTypes.ts        # Socket type system, colours, compatibility, validation
├── components/
│   └── Sidebar.tsx           # Updated with 9-node definitions
└── App.tsx                   # ReactFlowProvider + DnDFlow integration
```

## Key Commands

```bash
bun dev          # Start dev server
bun run build    # Type-check + build
bun run lint     # ESLint
bun run test     # Vitest (watch mode)
bun run test:run # Vitest (single run)
bun test:e2e     # Playwright E2E
bun run typecheck # TypeScript only
```

## Verification Steps

1. **Dev server starts without errors**: `bun dev` → opens at localhost:5173
2. **All 9 nodes appear in sidebar**: Verify the toolbox lists Proximity, Aggression, Get Tribe, List of Tribe, Is In List, Add to Queue, HP Ratio, Shield Ratio, Armor Ratio
3. **Drag-and-drop works**: Drag any node from sidebar → drops onto ReactFlow canvas
4. **Sockets render correctly**: Each node shows typed handles with correct colours
5. **Type-safe connections**: Connect entity→entity (accepted), entity→vector (rejected)
6. **Diamond shape**: IsInList renders as a rotated square
7. **Delete works**: Select a node → press Delete → node and connected edges removed
8. **Tests pass**: `bun run test:run` → all unit tests green
9. **E2E passes**: `bun run test:e2e` → all Playwright tests green
10. **Build succeeds**: `bun run build` → no type errors, clean build

## Architecture Notes

- **Node type registry** is defined outside component render (in `src/nodes/index.ts`) to prevent re-registration on every React render cycle
- **Socket validation** uses a compatibility matrix in `src/utils/socketTypes.ts` — `canConnect(sourceType, targetType)` returns boolean
- **DnDFlow** is a child component of `ReactFlowProvider` because it needs the `useReactFlow()` hook for `screenToFlowPosition()`
- **Edge colours** are determined by the source socket type using `getSocketColorFromHandle()`
- **Cycle detection** runs on each connection attempt via DFS traversal from target back to source
