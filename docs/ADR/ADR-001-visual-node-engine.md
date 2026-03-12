# ADR 1: React Flow as Visual Node Engine

## Context

Frontier Flow requires an interactive, browser-based node graph editor that supports custom node types with typed input/output sockets, drag-and-drop from a sidebar toolbox, animated colour-coded edge connections, programmatic layout via external algorithms like Dagre, and high-performance rendering for graphs of 50 or more nodes.

Several alternatives exist in the JavaScript ecosystem. Rete.js is framework-agnostic with a plugin system, but its React adapter is less polished and has a smaller community. Litegraph.js offers a Canvas-based approach inspired by Blender, but provides no React integration and relies on an imperative API that conflicts with our declarative React architecture. Building a custom Canvas-based editor would give full control but would require an enormous development effort spent reinventing problems that mature libraries have already solved. Blockly, while backed by Google and strong at drag-and-drop, follows a block-based paradigm rather than a node-graph paradigm and is the wrong fit for data flow visualisation.

React Flow (`@xyflow/react`) is the most widely used node editor library in the React ecosystem. It provides first-class hooks (`useNodesState`, `useEdgesState`, `useReactFlow`) that align directly with our React 19 stack. Its native `<Handle>` components map naturally to our typed socket paradigm, and the `isValidConnection` callback allows implementing our socket compatibility matrix without any patches. Built-in components like `<MiniMap>`, `<Controls>`, and `<Background>` reduce boilerplate significantly.

## Decision

We will use `@xyflow/react` version 12 (React Flow) as the visual node engine for Frontier Flow. Each game domain node (e.g. Aggression, Proximity, GetTribe, ListOfTribe, IsInList, AddToQueue) will be implemented as a standard React component registered through React Flow's custom node type system. We will abstract React Flow usage behind wrapper hooks where feasible to localise the migration surface for future major version upgrades.

## Status

Accepted.

## Consequences

Development of new node types is rapid because each node is a standard React component with full control over rendering and behaviour. The library has strong TypeScript support and active maintenance, which aligns with our type-safety mandate.

The library adds approximately 80KB (gzipped) to the bundle size. Our application will be tightly coupled to React Flow's state model through `useNodesState` and `useEdgesState`, which means a future major version upgrade would require non-trivial refactoring across all node components and state management hooks. This risk is tracked in the Risk Register as R-13. Abstracting usage behind wrapper hooks will help contain this migration surface, but cannot eliminate it entirely.
