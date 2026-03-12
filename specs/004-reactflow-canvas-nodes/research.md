# Research: ReactFlow Canvas Node Components

**Feature**: 004-reactflow-canvas-nodes | **Date**: 2026-03-12

## 1. ReactFlow v12 Custom Node Architecture

**Decision**: Use `@xyflow/react` v12 custom node components with typed `Handle` elements for sockets.

**Rationale**: ReactFlow v12 provides a stable, well-documented API for custom nodes via the `nodeTypes` registry. Each custom node is a React component receiving `NodeProps`. Handles (sockets) are declared inline using `<Handle>` with `type="source"` or `type="target"` and a unique `id`. The `isValidConnection` prop on `<ReactFlow>` enables connection validation at the framework level.

**Alternatives considered**:
- Building a custom canvas from scratch — rejected because ReactFlow already handles pan/zoom, node dragging, edge routing, selection, and keyboard shortcuts. Reimplementing this would violate the constitution's "favour immutable data and pure functions" principle by introducing unnecessary complexity.
- Using `react-flow-renderer` (v10) — rejected because the project already depends on `@xyflow/react` v12 which is the renamed/successor package.

**Key findings**:
- Custom nodes receive `{ data, id, selected }` via `NodeProps`
- `nodeTypes` must be defined outside component render to avoid re-registration on every render
- `Handle` components accept `position` (Top/Right/Bottom/Left), `type` (source/target), and `id`
- `screenToFlowPosition()` converts drop coordinates to flow coordinates
- `useNodesState` and `useEdgesState` provide React state management for nodes/edges

## 2. Socket Type System Design

**Decision**: Implement a domain-specific socket type system with 11 socket types mapping to 5 Move core types (Signal, Entity, Value, Vector, Any), using a compatibility matrix for connection validation.

**Rationale**: The HLD and SOLUTION-DESIGN define a clear socket type hierarchy where domain types (rider, tribe, target, standing, wallet, number, string, boolean, list, priority) inherit colour from their Move core type. The `any` type acts as a universal wildcard. This maps directly to how the generated Move code handles type compatibility.

**Alternatives considered**:
- Flat type system with only 5 core types — rejected because domain-specific socket names (e.g., "rider" vs "tribe") provide clearer semantics even when they share the same Move core type (Entity). The UI benefits from descriptive labels.
- No type validation (connect anything) — rejected because it violates Constitution Principle IV (Predictable Code Generation) — invalid connections would produce invalid Move code.

**Key findings**:
- `SocketType` is a string union of 11 domain types
- `socketCompatibility` record maps each type to its compatible targets
- `canConnect(source, target)` is the validation function
- `any` connects to everything; same-core-type sockets are cross-compatible (e.g., `target` ↔ `rider`)
- Socket colours are determined by CSS variables (`--socket-entity`, `--socket-value`, etc.)

## 3. IsInList Diamond Shape

**Decision**: Implement the IsInList node as a 45° CSS-rotated square with counter-rotated inner content.

**Rationale**: The spec (FR-011) requires the IsInList node to render as a diamond to visually distinguish it as a logic gate / decision node. CSS `transform: rotate(45deg)` on the outer container with `transform: rotate(-45deg)` on inner content achieves this without SVG complexity.

**Alternatives considered**:
- SVG-based diamond shape — rejected because it adds unnecessary SVG rendering complexity when CSS transform achieves the same result with standard ReactFlow Handle positioning.
- Clip-path polygon — rejected because it clips child elements and makes Handle positioning difficult.

**Key findings**:
- Outer container: `transform: rotate(45deg)`
- Inner content (text, icon): `transform: rotate(-45deg)` to keep text readable
- Handle positions must account for the rotation (Top input becomes top-left corner visually)
- The node has 4 sockets at cardinal positions: Left (input_item), Top (input_list), Right-top (yes), Right-bottom (no)

## 4. DnDFlow Component Architecture

**Decision**: Create a `DnDFlow` component as a dedicated wrapper around `<ReactFlow>` that handles drag-and-drop, connection validation, and canvas configuration.

**Rationale**: The SOLUTION-DESIGN specifies DnDFlow as an internal component within App.tsx that receives nodes/edges state and handlers as props. This separates canvas concerns from application-level state. The component uses `useReactFlow().screenToFlowPosition()` to convert drop coordinates.

**Alternatives considered**:
- Inline ReactFlow directly in App.tsx — rejected because the component needs `useReactFlow()` hook which requires being inside `ReactFlowProvider`, making a child component necessary.
- Separate route/page for canvas — rejected because the app is a single-page editor.

**Key findings**:
- `DnDFlow` must be a child of `ReactFlowProvider`
- Drop handler reads `application/reactflow` and `application/label` from `dataTransfer`
- Node IDs use `dnd_${counter}_${Date.now()}` format for uniqueness
- `onConnect` callback creates edges with `addEdge` from ReactFlow
- `isValidConnection` prop enables per-connection type checking

## 5. Node Component Structure Pattern

**Decision**: All 9 node components follow a consistent template: Lucide icon + header + typed Handles, using shared CSS classes for CCP-aligned industrial styling.

**Rationale**: Consistency is required by the design system (DESIGN-SYSTEM.md). Each node uses the same container/header/body pattern with only the icon, header colour, socket definitions, and category differing.

**Alternatives considered**:
- Single generic node component with configuration-driven rendering — considered but deferred. While this could reduce code duplication, individual components allow per-node customisation (e.g., IsInList diamond shape) and make the codebase more explicit per Constitution Principle I (readable, explicit solutions over clever shortcuts). A shared `BaseNode` utility can still extract common rendering logic.

**Key findings**:
- Node categories determine header background colour:
  - Event Trigger (Proximity, Aggression): `var(--brand-orange)`
  - Data Accessor (GetTribe, HpRatio, ShieldRatio, ArmorRatio): `var(--socket-entity)` or `var(--socket-value)`
  - Data Source (ListOfTribe): `var(--socket-vector)`
  - Logic Gate (IsInList): `var(--socket-signal)`
  - Action (AddToQueue): `var(--socket-vector)`
- Each node imports its Lucide icon: Radar, Swords, UserSearch, List, Layers, Heart, Shield, ShieldHalf
- IsInList has no icon (shape is the differentiator)

## 6. Edge Styling

**Decision**: Edges inherit colour from the source socket's Move core type, with 2px stroke (3px for Vector) and CSS animation.

**Rationale**: The HLD defines edge colour by source socket type. This creates visual continuity — data flowing from a blue (Entity) socket produces blue edges. Animated strokes make the flow direction visible.

**Alternatives considered**:
- Static edges — rejected because animation provides visual feedback per Constitution Principle II.
- Target-coloured edges — rejected because source colouring is established in the design system.

**Key findings**:
- Edge colour determined by `getSocketColorFromHandle(sourceHandleId)`
- `markerEnd` uses closed arrow markers
- Default edge type: `smoothstep` for angular routing matching the industrial aesthetic
- Custom edge styling via `style` prop on edge data

## 7. Cycle Detection

**Decision**: Implement cycle detection in the connection validation logic to prevent circular dependencies (FR-014).

**Rationale**: Circular graph references would cause infinite loops in the code generation pipeline. The Move runtime does not support cyclical execution, so the visual editor must prevent cycles at connection time.

**Alternatives considered**:
- Allow cycles and detect at code generation time — rejected because early feedback (at connection time) is better UX and aligns with Constitution Principle II (immediate visual feedback).

**Key findings**:
- DFS traversal from the target node back to the source node before accepting a connection
- If source is reachable from target, the connection would create a cycle → reject
- Complexity is O(V+E) per connection attempt, acceptable for expected graph sizes (< 50 nodes)

## 8. Existing Codebase State

**Decision**: The existing codebase provides the UI shell (Header, Sidebar, Footer) but the canvas area is a static hero section. This feature replaces the hero content with a live ReactFlow canvas.

**Findings**:
- `src/nodes/` directory exists but contains only `.gitkeep` — all node components must be created
- `src/types/nodes.ts` has a minimal `NodeDefinition` interface — must be extended with socket definitions
- `src/data/node-definitions.ts` has 5 entries — must be updated to 9 verified nodes with full socket metadata
- `src/App.tsx` renders a static landing page in the canvas area — must be replaced with `ReactFlowProvider` + `DnDFlow`
- `src/components/Sidebar.tsx` already implements drag-and-drop with `dataTransfer` — compatible with the DnDFlow drop handler
- `src/index.css` already defines socket colour CSS variables — no CSS variable changes needed
- No `src/utils/socketTypes.ts` exists — must be created
- No connection validation hook exists — must be created
