# ADR 2: Local React State over Global State Libraries

## Context

The application manages several categories of state. Canvas state — nodes, edges, and viewport position — is owned by React Flow's built-in hooks. UI state covers modal visibility, sidebar selection, and toast notification queues. Session state includes the connected wallet, active Sui network, and GitHub OAuth token. Persistence state encompasses cached dependencies in IndexedDB and UpgradeCap references for deployed packages.

Global state management libraries such as Zustand, Jotai, and Redux Toolkit were considered. Each would introduce a centralised store that could serve as a single source of truth across the application.

However, the application is a single-page, single-route canvas editor. React Flow already provides the canonical graph state through `useNodesState` and `useEdgesState`. Wrapping these in a secondary state layer would add synchronization complexity with no clear benefit, since any state drift between the two layers would be a source of bugs. Wallet connection state and network selection are managed internally by `@mysten/dapp-kit` providers and hooks; duplicating this state externally would create the same synchronization risk. The component tree is shallow — App renders Header, DnDFlow, Sidebar, and the Code Preview Modal — so prop drilling is minimal and a `ReactFlowProvider` context is sufficient for shared values.

## Decision

We will use local React hooks combined with React Flow's built-in state as the primary state management approach. We will not introduce a global state management library. The `ReactFlowProvider` context and `@mysten/dapp-kit` providers will serve as the shared state boundaries for their respective domains.

## Status

Accepted.

## Consequences

The application has fewer abstractions, a simpler mental model, a smaller bundle, and no risk of state synchronization bugs between competing stores. Developers need only understand React hooks and the React Flow API, not a separate state management paradigm.

If the application grows to include multiple pages, introduces routing, or adds collaborative real-time editing, a centralised store will likely become necessary. This decision should be revisited if more than three levels of prop drilling emerge or if cross-page state sharing is required. At that point, this ADR would be superseded by a new decision selecting a specific global state library.
