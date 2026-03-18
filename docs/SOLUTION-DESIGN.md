---
title: Frontier Flow - Solution Design
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-02-22
author: Scetrov
description: Low-level technical implementation details and code references for Frontier Flow.
---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [1. Component Hierarchy \& Internals](#1-component-hierarchy--internals)
  - [Component Hierarchy Code](#component-hierarchy-code)
  - [1.1 Header Component Internals](#11-header-component-internals)
  - [1.2 Sidebar Component Internals](#12-sidebar-component-internals)
  - [1.3 CodePreviewModal Internals](#13-codepreviewmodal-internals)
  - [1.4 ErrorBoundary State](#14-errorboundary-state)
  - [1.5 DnDFlow Configuration](#15-dndflow-configuration)
  - [1.6 Toast Notification System](#16-toast-notification-system)
- [2. Socket Implementation \& Styling](#2-socket-implementation--styling)
  - [2.1 Socket Connection Rules](#21-socket-connection-rules)
  - [2.2 Visual Socket Styling](#22-visual-socket-styling)
  - [2.3 Socket Implementation](#23-socket-implementation)
  - [2.4 Connection Validation Hook](#24-connection-validation-hook)
- [3. Node Specifications \& Styling](#3-node-specifications--styling)
  - [3.1 Node Type Registry](#31-node-type-registry)
  - [3.2 Common UI Node Styling (CCP Aligned)](#32-common-ui-node-styling-ccp-aligned)
- [4. State Management Initialisation](#4-state-management-initialisation)
  - [4.1 App-Level State Hooks](#41-app-level-state-hooks)
  - [4.2 Initial Nodes](#42-initial-nodes)
  - [4.3 Initial Edges](#43-initial-edges)
- [5. Code Generation Architecture](#5-code-generation-architecture)
  - [5.1 Compilation Pipeline Overview](#51-compilation-pipeline-overview)
  - [5.2 Phase 1: Parsing and Intermediate Representation (IR)](#52-phase-1-parsing-and-intermediate-representation-ir)
  - [5.3 Phase 2: Constraint Engine (Ensuring Completeness)](#53-phase-2-constraint-engine-ensuring-completeness)
  - [5.3.1 Phase 3: Input Sanitisation](#531-phase-3-input-sanitisation)
  - [5.3.2 Phase 3.5: AST Pruning \& Gas Optimization](#532-phase-35-ast-pruning--gas-optimization)
  - [5.4 Phase 4: Move Code Emitter (Handling CCP's API Unknowns)](#54-phase-4-move-code-emitter-handling-ccps-api-unknowns)
  - [5.4.1 Compiler Error → Node Mapping](#541-compiler-error--node-mapping)
  - [5.5 Testing Strategy (Ensuring Predictability)](#55-testing-strategy-ensuring-predictability)
  - [5.6 Output Structure Example](#56-output-structure-example)
  - [5.7 Deployment \& Wallet Integration](#57-deployment--wallet-integration)
  - [5.7.1 Package Upgrade Flow](#571-package-upgrade-flow)
- [6. Configuration Files](#6-configuration-files)
  - [6.1 `package.json`](#61-packagejson)
  - [6.2 `vite.config.ts`](#62-viteconfigts)
  - [6.3 `tailwind.config.js`](#63-tailwindconfigjs)
  - [6.4 `postcss.config.js`](#64-postcssconfigjs)
  - [6.5 `index.html`](#65-indexhtml)
  - [6.6 `index.css` setup references](#66-indexcss-setup-references)
- [7. Integrated Testing Architecture](#7-integrated-testing-architecture)
  - [7.1 Testing Panel UI \& Socket Modals](#71-testing-panel-ui--socket-modals)
  - [7.2 Graph I/O Identification](#72-graph-io-identification)
  - [7.3 Execution Parity](#73-execution-parity)
  - [7.4 External Dependency Mocking](#74-external-dependency-mocking)
  - [7.5 Lifecycle \& State Resetting](#75-lifecycle--state-resetting)
  - [7.6 Error Mapping \& Visual Feedback](#76-error-mapping--visual-feedback)
  - [7.7 Automated Accessibility Testing](#77-automated-accessibility-testing)
- [8. GitHub Integration \& Caching](#8-github-integration--caching)
  - [8.1 GitHub OAuth \& Rate Limits](#81-github-oauth--rate-limits)
  - [8.2 Dependency Caching Engine (IndexedDB)](#82-dependency-caching-engine-indexeddb)
  - [8.3 Repository Persistence (Saving/Loading)](#83-repository-persistence-savingloading)

---

## 1. Component Hierarchy & Internals

### Component Hierarchy Code

```tsx
<StrictMode>
  <ErrorBoundary>
    <App>
      <ReactFlowProvider>
        <Header onPreview={handlePreview} />
        <main>
          <DnDFlow nodes={...} edges={...} ... />
          <Sidebar />
        </main>
        <CodePreviewModal isOpen={...} code={...} />
      </ReactFlowProvider>
    </App>
  </ErrorBoundary>
</StrictMode>
```

### 1.1 Header Component Internals

**Props:**

```typescript
interface HeaderProps {
  onPreview: () =void;
  onAutoArrange: () =void;
  // Note: Network selection and wallet connection state are handled internally
  // by dapp-kit hooks (useCurrentAccount, useSuiClientQuery, etc.)
}
```

**Logo SVG:**

```html
<svg viewBox="0 0 24 24">
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
</svg>
```

### 1.2 Sidebar Component Internals

**Node Definitions Array:**

```typescript
const nodeDefinitions = [
  {
    type: "aggression",
    label: "Aggression",
    description: "Check aggression level",
    color: "bg-[var(--brand-orange)]",
  },
  {
    type: "proximity",
    label: "Proximity",
    description: "Detect nearby entities",
    color: "bg-[var(--brand-orange)]",
  },
  {
    type: "getTribe",
    label: "Get Tribe",
    description: "Retrieve tribe data",
    color: "bg-[var(--socket-entity)]",
  },
  {
    type: "listOfTribe",
    label: "List of Tribe",
    description: "Enumerate tribes",
    color: "bg-[var(--socket-vector)]",
  },
  {
    type: "isInList",
    label: "Is in List",
    description: "Verify item membership",
    color: "bg-[var(--socket-signal)]",
  },
  {
    type: "addToQueue",
    label: "Add to Queue",
    description: "Push to priority queue",
    color: "bg-[var(--socket-vector)]",
  },
  {
    type: "hpRatio",
    label: "HP Ratio",
    description: "Get target HP %",
    color: "bg-[var(--socket-value)]",
  },
  {
    type: "shieldRatio",
    label: "Shield Ratio",
    description: "Get target Shield %",
    color: "bg-[var(--socket-value)]",
  },
  {
    type: "armorRatio",
    label: "Armor Ratio",
    description: "Get target Armor %",
    color: "bg-[var(--socket-value)]",
  },
];
```

**Drag Implementation:**

```typescript
const onDragStart = (
  event: React.DragEvent,
  nodeType: string,
  label: string,
) ={
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.setData("application/label", label);
  event.dataTransfer.effectAllowed = "move";
};
```

### 1.3 CodePreviewModal Internals

**Props:**

```typescript
interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () =void;
  code: string;
}
```

**Copy Implementation:**

```typescript
const handleCopy = () ={
  navigator.clipboard.writeText(code);
  setCopied(true);
  setTimeout(() =setCopied(false), 2000);
};
```

### 1.4 ErrorBoundary State

```typescript
interface State {
  hasError: boolean;
  error?: Error;
}
```

### 1.5 DnDFlow Configuration

**Props:**

```typescript
interface DnDFlowProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: Connection) =void;
}
```

**ReactFlow Configuration:**

```typescript
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onDragOver={onDragOver}
  onDrop={onDrop}
  nodeTypes={nodeTypes}
  colorMode="dark"
  fitView
>
  <Background gap={20} color="var(--bg-secondary)" />
  <Controls className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] !shadow-xl" />
  <MiniMap
    className="bg-[var(--bg-secondary)] !border-[var(--border-color)] !shadow-xl overflow-hidden"
    nodeColor="var(--bg-secondary)"
    maskColor="rgba(15, 23, 42, 0.6)"
  />
</ReactFlow>
```

**Drop Handler:**

```typescript
const onDrop = useCallback(
  (event: React.DragEvent) ={
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    const label = event.dataTransfer.getData("application/label");

    if (!type) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode: Node = {
      id: `dnd_${id++}_${Date.now()}`,
      type,
      position,
      data: { label: label || `${type} node` },
    };

    setNodes((nds) =nds.concat(newNode));
  },
  [screenToFlowPosition, setNodes],
);
```

### 1.6 Toast Notification System

**Purpose:** Provide non-blocking feedback during compilation and deployment.

**Implementation Details:**

- Uses a simple state array or lightweight context to manage active toasts.
- Positioned fixed (e.g., bottom-right or top-right).
- Event types: `info` (compiling), `success` (deployed), `error` (compilation/tx failed).
- Auto-dismisses after a short timeout (e.g. 5000ms), except for critical errors.

**Accessibility:**

- Toast container must use `role="alert"` (for errors) or `aria-live="polite"` (for info/success).
- Ensure toast content is announced by screen readers immediately upon mount.

---

## 2. Socket Implementation & Styling

### 2.1 Socket Connection Rules

```typescript
// Type compatibility matrix
const socketCompatibility: Record<string, string[]= {
  rider: ["rider", "any"],
  tribe: ["tribe", "any"],
  standing: ["standing", "number", "any"],
  wallet: ["wallet", "any"],
  priority: ["priority", "any"],
  target: ["target", "rider", "any"],
  boolean: ["boolean", "any"],
  list: ["list", "any"],
  number: ["number", "standing", "any"],
  string: ["string", "any"],
  any: [
    "rider",
    "tribe",
    "standing",
    "wallet",
    "priority",
    "target",
    "boolean",
    "list",
    "number",
    "string",
    "any",
  ],
};

// Connection validation function
function canConnect(sourceType: string, targetType: string): boolean {
  if (sourceType === "any" || targetType === "any") return true;
  return socketCompatibility[sourceType]?.includes(targetType) ?? false;
}
```

### 2.2 Visual Socket Styling

```css
/* Socket base styles */
.socket {
  width: 18px;
  height: 18px;
  border-radius: 0px;
  border: 2px solid var(--border-color);
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;
}

.socket:hover {
  transform: scale(1.2);
  box-shadow: 0 0 8px currentColor;
}

/* Socket type colors */
.socket--rider {
  background-color: var(--socket-entity);
}
.socket--tribe {
  background-color: var(--socket-entity);
}
.socket--standing {
  background-color: var(--socket-value);
}
.socket--wallet {
  background-color: var(--socket-value);
}
.socket--priority {
  background-color: var(--socket-vector);
}
.socket--target {
  background-color: var(--socket-entity);
}
.socket--boolean {
  background-color: var(--socket-signal);
}
.socket--list {
  background-color: var(--socket-vector);
}
.socket--number {
  background-color: var(--socket-value);
}
.socket--string {
  background-color: var(--socket-value);
}
.socket--any {
  background-color: var(--socket-any);
}

/* States */
.socket--invalid {
  opacity: 0.3;
  cursor: not-allowed;
}
.socket--valid-target {
  animation: pulse 0.5s ease infinite alternate;
  box-shadow: 0 0 12px currentColor;
}

@keyframes pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.3);
  }
}
```

### 2.3 Socket Implementation

```typescript
interface SocketDefinition {
  id: string;
  type: SocketType;
  position: "left" | "right" | "top" | "bottom";
  direction: "input" | "output";
  label: string;
}

type SocketType =
  | "rider"
  | "tribe"
  | "standing"
  | "wallet"
  | "priority"
  | "target"
  | "boolean"
  | "list"
  | "number"
  | "string"
  | "any";

const socketColors: Record<SocketType, string= {
  rider: "var(--socket-entity)",
  tribe: "var(--socket-entity)",
  standing: "var(--socket-value)",
  wallet: "var(--socket-value)",
  priority: "var(--socket-vector)",
  target: "var(--socket-entity)",
  boolean: "var(--socket-signal)",
  list: "var(--socket-vector)",
  number: "var(--socket-value)",
  string: "var(--socket-value)",
  any: "var(--socket-any)",
};

export function getSocketColorFromHandle(
  handleId: string | null | undefined,
): string {
  if (!handleId) return socketColors.any;
  const socketType = handleToSocketType[handleId];
  return socketType ? socketColors[socketType] : socketColors.any;
}
```

### 2.4 Connection Validation Hook

```typescript
import { useCallback } from "react";
import { Connection, useReactFlow } from "@xyflow/react";

export function useConnectionValidation() {
  const { getNode } = useReactFlow();

  const isValidConnection = useCallback(
    (connection: Connection): boolean ={
      const sourceNode = getNode(connection.source!);
      const targetNode = getNode(connection.target!);

      if (!sourceNode || !targetNode) return false;

      // Get socket types from node data
      const sourceSocket = sourceNode.data.sockets?.find(
        (s: SocketDefinition) =s.id === connection.sourceHandle,
      );
      const targetSocket = targetNode.data.sockets?.find(
        (s: SocketDefinition) =s.id === connection.targetHandle,
      );

      if (!sourceSocket || !targetSocket) return false;
      if (
        sourceSocket.direction !== "output" ||
        targetSocket.direction !== "input"
      )
        return false;

      return canConnect(sourceSocket.type, targetSocket.type);
    },
    [getNode],
  );

  return { isValidConnection };
}
```

---

## 3. Node Specifications & Styling

### 3.1 Node Type Registry

```typescript
export const nodeTypes = {
  aggression: AggressionNode,
  proximity: ProximityNode,
  getTribe: GetTribeNode,
  listOfTribe: ListOfTribeNode,
  isInList: IsInListNode,
  addToQueue: AddToQueueNode,
  hpRatio: HpRatioNode,
  shieldRatio: ShieldRatioNode,
  armorRatio: ArmorRatioNode,
};
```

### 3.2 Common UI Node Styling (CCP Aligned)

```css
/* Node Container */
.node-container {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 0px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  min-width: 200px;
  transition:
    border-color 200ms ease,
    box-shadow 200ms ease;
}

.node-container:hover {
  border-color: var(--brand-orange);
  box-shadow: 0 0 16px rgba(255, 71, 0, 0.2);
}

/* Node Header */
.node-header {
  background: var(--brand-orange);
  padding: 0.5rem 0.75rem;
  font-family: "Disket Mono", monospace;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--text-dark);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.node-header-type {
  font-size: 0.625rem;
  opacity: 0.8;
}

/* Handle */
.react-flow__handle {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 0px;
}
```

---

## 4. State Management Initialisation

### 4.1 App-Level State Hooks

```typescript
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
const [generatedCode, setGeneratedCode] = React.useState("");
```

### 4.2 Initial Nodes

```typescript
const initialNodes: Node[] = [
  {
    id: "1",
    type: "proximity",
    position: { x: 50, y: 200 },
    data: { label: "Proximity" },
  },
  {
    id: "2",
    type: "getTribe",
    position: { x: 350, y: 200 },
    data: { label: "Rider" },
  },
  {
    id: "3",
    type: "listOfTribe",
    position: { x: 350, y: 50 },
    data: { label: "Friendlies" },
  },
  {
    id: "4",
    type: "isInList",
    position: { x: 620, y: 200 },
    data: { label: "Is Friendly?" },
  },
  {
    id: "5",
    type: "addToQueue",
    position: { x: 900, y: 200 },
    data: { label: "Priority Queue" },
  },
];
```

### 4.3 Initial Edges

```typescript
const initialEdges: Edge[] = [
  // Proximity → Expand Rider (target → rider input)
  {
    id: "e1-2",
    source: "1",
    target: "2",
    sourceHandle: "target",
    targetHandle: "rider",
    animated: true,
    style: { stroke: "var(--socket-entity)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--socket-entity)" },
  },
  // Expand Rider → Is in List (tribe → item to check)
  {
    id: "e2-4",
    source: "2",
    target: "4",
    sourceHandle: "tribe",
    targetHandle: "input_item",
    animated: true,
    style: { stroke: "var(--socket-entity)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--socket-entity)" },
  },
  // List of Tribe → Is in List (friendly list)
  {
    id: "e3-4",
    source: "3",
    target: "4",
    sourceHandle: "items",
    targetHandle: "input_list",
    animated: true,
    style: { stroke: "var(--socket-vector)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--socket-vector)" },
  },
  // Proximity → Add to Queue (priority passthrough)
  {
    id: "e1-5-priority",
    source: "1",
    target: "5",
    sourceHandle: "priority",
    targetHandle: "priority_in",
    animated: true,
    style: { stroke: "var(--socket-vector)", strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--socket-vector)" },
  },
  // Is in List (NO) → Add to Queue predicate (if NOT friendly)
  {
    id: "e4-5",
    source: "4",
    target: "5",
    sourceHandle: "no",
    targetHandle: "predicate",
    animated: true,
    style: { stroke: "var(--socket-signal)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--socket-signal)" },
  },
  // Proximity → Add to Queue (entity)
  {
    id: "e1-5-entity",
    source: "1",
    target: "5",
    sourceHandle: "target",
    targetHandle: "entity",
    animated: true,
    style: { stroke: "var(--socket-entity)", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--socket-entity)" },
  },
];
```

---

## 5. Code Generation Architecture

Transforming a visual React Flow graph into a valid, safe, and functional Sui Move smart contract requires a robust compilation pipeline. Because the exact low-level Move semantics and CCP APIs are subject to change, our architecture is heavily modularized into a **Compilation Pipeline**.

### 5.1 Compilation Pipeline Overview

The current graph-to-Move path lives entirely inside `src/compiler/` and runs in five deterministic stages plus a WASM compile handoff:

1. `buildIrGraph()` normalises React Flow nodes and edges into a stable IR, preserving deterministic execution order and tracking disconnected or unresolved graph paths.
2. `validateGraph()` rejects unsupported node types, missing required inputs, socket mismatches, disconnected entry paths, and unresolved ordering before emission starts.
3. `collectSanitizationDiagnostics()` and `sanitizeGraph()` enforce Move-safe identifiers while still blocking module or node names that cannot be recovered safely.
4. `emitMove()` produces the generated package artifact (`Move.toml`, `sources/<module>.move`, and source map) with stable section ordering for preview and compile.
5. `compileMove()` submits the artifact files to `@zktx.io/sui-move-builder/lite`, decodes returned bytecode modules, and maps compiler output back through the generated source map.

`compilePipeline()` is the single orchestration boundary. It returns one result object consumed by auto-compile, manual build, footer diagnostics, and the Move preview.

The generator operates in five distinct phases to ensure the output is deterministic, secure, and gas-efficient:

```mermaid
flowchart TD
    A[React Flow Graph Coordinates] -->|1. Parse| B(Intermediate Representation)
    B -->|2. Constrain| C(Semantic Constraint Engine)
    C -->|3. Sanitise| D(Input Sanitiser)
    D -->|3.5 Optimise| O(AST Pruning & Gas Optimiser)
    O -->|4. Emit| E(Move Code Emitter Template)
    E --F[Valid Sui Move Code .move]
```

### 5.2 Phase 1: Parsing and Intermediate Representation (IR)

The raw `Node[]` and `Edge[]` data from React Flow contains UI-specific metadata (coordinates, selection state, z-index) that is irrelevant to the smart contract.

We parse the React Flow graph into a purely semantic **Intermediate Representation (AST/IR)**:

- **Execution Flow**: Determined by trigger nodes (e.g., `Proximity`) tracing through execution pathways (logic gates) to reach resolution (action nodes).
- **Data Flow**: Determined by value resolving (e.g., passing a `target` Entity out of a socket and into a `GetTribe` node input).

_Goal: Completely decouple the visual UI data from the code compilation phase._

### 5.3 Phase 2: Constraint Engine (Ensuring Completeness)

To guarantee that any graph constructed in the UI can actually be represented in Move, we must mathematically constrain the builder. The Constraint Engine runs against the IR before any code is emitted.

**Core Rules:**

1. **Acyclic Execution**: Smart contracts have strict gas/compute limits. We enforce Directed Acyclic Graphs (DAGs) for execution pathways to prevent infinite unrolled loops or recursion. If a cycle is detected, code generation aggressively fails.
2. **Type Safety Validation**: Re-asserts that UI connections are valid at the compiler level (e.g., throwing an error if a user somehow hacked the UI to force a `Signal` socket into a `Vector` input).
3. **Resource Context Checks**: Move is a strict resource-oriented language. The engine ensures that non-copyable objects (like specific game capabilities) are not dropped or illegally duplicated, simulating Move's borrow checker at the graph level.
4. **Graph Pruning**: Unconnected, orphaned, or completely isolated logic trees are safely ignored and stripped from the execution path.

### 5.3.1 Phase 3: Input Sanitisation

Before the IR reaches the Optimiser or Emitter, all user-supplied values (node labels, field inputs) are validated against a strict allowlist to prevent Move code injection. This phase is a mandatory, discrete step that cannot be bypassed by modifications to other phases.

**Sanitisation Rules:**

- All identifiers interpolated into generated code must match: `/^[a-zA-Z_][a-zA-Z0-9_]*$/`
- Values failing validation are rejected with a user-facing error mapped to the originating node
- HTML and script content is stripped to prevent XSS in the UI layer

**Implementation:** `src/utils/sanitiser.ts`

See [SECURITY.md §7.1](./SECURITY.md#71-code-generation-safety) for the full input validation policy and [TESTING-STRATEGY.md §4.1](./TESTING-STRATEGY.md#41-code-generator-pipeline) for the sanitiser test coverage requirements.

### 5.3.2 Phase 3.5: AST Pruning & Gas Optimization

The Constraint Engine validates _correctness_; this phase enforces _efficiency_. Visual graphs frequently produce valid-but-bloated IR trees — redundant lookups, dead branches kept alive by partial connections, and naive vector operations that would hemorrhage gas on-chain. The optimizer runs four sequential passes against the validated IR before it reaches the Emitter.

**Optimizer Interface:**

```typescript
interface OptimizationPass {
  /** Human-readable identifier for diagnostics. */
  name: string;
  /** Returns a transformed (pruned/rewritten) copy of the IR tree. */
  apply: (ir: IRNode[]) =IRNode[];
  /** Estimated gas savings category for UI reporting. */
  impact: "minor" | "moderate" | "significant";
}

/** Registry of all active optimization passes, executed in order. */
const optimizationPipeline: OptimizationPass[] = [
  deadBranchElimination,
  redundantVectorFolding,
  constantPropagation,
  gasCostReordering,
];
```

**Pass Descriptions:**

1. **Dead Branch Elimination:** Walks the IR tree bottom-up. Any `IRNode` whose output bindings have zero downstream consumers is pruned from the tree. This catches orphaned data transformers (e.g., a `GetTribe` node whose `standing` and `wallet` outputs are entirely unconnected) that passed the Constraint Engine because they are structurally valid but semantically inert.

2. **Redundant Vector Folding:** Identifies duplicate `vector::contains` or `vector::push_back` invocations operating on identical input references within the same execution scope. Collapses them into a single instruction with a shared `let` binding, preventing redundant memory allocations in the emitted Move.

3. **Constant Propagation:** Evaluates statically-deterministic sub-trees at compile time. If a `ListOfTribe` node defines a single-element vector, `vector::contains(list, &item)` is replaced with a direct `==` equality check — completely eliminating the vector allocation and iteration.

4. **Gas-Cost Reordering:** Each IR node carries an estimated gas weight annotation (derived from expected opcode cost tables). The optimizer reorders independent operations within a scope to front-load cheap boolean guards before expensive external API lookups (e.g., `frontier::directory::get_tribe`), maximizing the probability of early-exit short-circuiting.

**Diagnostics Output:**

After optimization, the pipeline emits a structured `OptimizationReport` available to the Testing Panel and CodePreviewModal:

```typescript
interface OptimizationReport {
  /** Total IR nodes before optimization. */
  originalNodeCount: number;
  /** Total IR nodes after optimization. */
  optimizedNodeCount: number;
  /** Nodes removed by Dead Branch Elimination. */
  nodesRemoved: string[];
  /** Nodes rewritten by optimization passes. */
  nodesRewritten: Array<{
    nodeId: string;
    pass: "dead-branch" | "vector-folding" | "constant-propagation";
    description: string;
  }>;
  /** Total estimated gas before optimization. */
  gasBefore: number;
  /** Total estimated gas after optimization. */
  gasAfter: number;
  /** Per-pass summary of what was pruned/rewritten. */
  passResults: Array<{
    passName: string;
    nodesRemoved: number;
    nodesRewritten: number;
  }>;
}
```

### 5.4 Phase 4: Move Code Emitter (Handling CCP's API Unknowns)

Since the exact EVE Frontier Move API is unreleased, the **Emitter** uses a Pluggable Strategy Pattern. Every Node Type maps to a specific `CodeGenerator` interface.

**Example Node Generator Interface:**

```typescript
interface NodeCodeGenerator {
  /** Node type this generator handles. */
  readonly nodeType: NodeType;
  /** Validates if this specific node has its minimum required inputs. */
  validate: (node: IRNode) =ValidationResult;
  /** Generates annotated Move source lines for this node. */
  emit: (node: IRNode, context: GenerationContext) =AnnotatedLine[];
}
```

By isolating the code emission logic to individual node templates, we can easily swap out the generated Move string constants when CCP finalizes their APIs—without having to rewrite the parser or graph traversal logic.

**AST Source Map Annotations:**

In addition to emitting Move code, every `NodeCodeGenerator.emit()` call injects a trailing comment on each generated line that encodes the originating AST Node ID:

```move
let target = radar::scan_closest(); // @ff-node:dnd_3_1708642800000
let tribe = directory::get_tribe(target); // @ff-node:dnd_5_1708642800001
```

These annotations are stripped during production builds but are preserved during development and testing to power the **Compiler Error → Node Mapping** pipeline (see §5.4.1).

### 5.4.1 Compiler Error → Node Mapping

The compiler wrapper and error parser now operate on the generated artifact rather than a placeholder source string:

- `src/compiler/moveCompiler.ts` passes the emitted `Move.toml` plus `sources/<module>.move` to the WASM compiler.
- Successful builds attach decoded bytecode modules and dependency names back onto the artifact so downstream consumers can treat the artifact as the single source of truth.
- `src/compiler/errorParser.ts` converts raw compiler text into structured diagnostics with `stage = "compilation"`, preserving unmapped line numbers when no source-map entry exists.
- Fallback compiler messages without line information still surface as actionable diagnostics instead of being dropped.

This keeps the footer, node-focus error flows, and generated-source review aligned with the exact package that was compiled.

The local Constraint Engine catches the majority of graph errors before compilation. However, edge cases exist where a graph passes all local validation but triggers a native Move compiler error during WASM compilation (e.g., subtle borrow conflicts, module-level naming collisions, or dependency version mismatches). For a non-technical gamer, the raw Move compiler output is cryptic and hostile. This subsystem translates those errors into actionable, visual feedback on the canvas.

**Source Map Structure:**

The Emitter builds a `SourceMap` during code generation, mapping each emitted line number to its originating AST Node ID and, transitively, to the React Flow Node ID:

```typescript
interface SourceMapEntry {
  /** 1-indexed line number in the emitted .move file. */
  line: number;
  /** The IR/AST node that generated this line. */
  astNodeId: string;
  /** The React Flow Node ID this AST node was parsed from. */
  reactFlowNodeId: string;
  /** The specific socket or field context, if applicable. */
  context?: string;
}

interface EmitterOutput {
  /** The raw Move source code string. */
  code: string;
  /** Line-to-node mapping for error traceability. */
  sourceMap: SourceMapEntry[];
}
```

**Compiler Error Parser:**

When `buildMovePackage` from `@zktx.io/sui-move-builder/lite` returns an error (or the WASM process throws), the raw error string is parsed using a set of regex patterns tuned to the Move compiler's output format:

```typescript
interface CompilerDiagnostic {
  /** Severity: 'error' | 'warning'. */
  severity: "error" | "warning";
  /** The original compiler error message. */
  rawMessage: string;
  /** Extracted line number from the .move source, if parseable. */
  line: number | null;
  /** Resolved React Flow Node ID from the source map. */
  reactFlowNodeId: string | null;
  /** Human-readable explanation for the UI toast/panel. */
  userMessage: string;
}

/** Regex patterns for Move compiler error output. */
const MOVE_ERROR_LINE_REGEX = /──\s*sources\/.*\.move:(\d+):(\d+)/;
const MOVE_ERROR_MSG_REGEX = /error\[E\d+\]:\s*(.+)/;

export function parseCompilerOutput(
  rawOutput: string,
  sourceMap: SourceMapEntry[],
): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const errorBlocks = rawOutput.split("error[");

  for (const block of errorBlocks) {
    const lineMatch = MOVE_ERROR_LINE_REGEX.exec(block);
    const msgMatch = MOVE_ERROR_MSG_REGEX.exec(`error[${block}`);

    const line = lineMatch ? parseInt(lineMatch[1], 10) : null;
    const mapEntry = line ? sourceMap.find((e) =e.line === line) : undefined;

    diagnostics.push({
      severity: "error",
      rawMessage: msgMatch?.[1]?.trim() ?? block.trim(),
      line,
      reactFlowNodeId: mapEntry?.reactFlowNodeId ?? null,
      userMessage: mapEntry
        ? `Node "${mapEntry.reactFlowNodeId}" failed: ${msgMatch?.[1] ?? "Unknown compiler error"}`
        : `Compiler error at line ${line ?? "?"}: ${msgMatch?.[1] ?? block.trim()}`,
    });
  }

  return diagnostics;
}
```

**Canvas Error Activation Flow:**

```mermaid
flowchart LR
    A["WASM compiler error"] --B["parseCompilerOutput()"]
    B --C["Resolve line → SourceMapEntry"]
    C --D["Extract reactFlowNodeId"]
    D --E["Apply .node-error-highlight to canvas node"]
    E --F["Show userMessage in error toast + Testing Panel"]
```

When one or more `CompilerDiagnostic` entries resolve to a valid `reactFlowNodeId`, the application dispatches a node-update action that applies the `.node-error-highlight` CSS class to the matching React Flow node(s). Unresolvable errors (no matching source map entry) are displayed in a generic error panel with the raw compiler output preserved for advanced users.

### 5.5 Testing Strategy (Ensuring Predictability)

Graph-to-Move verification is split across unit, component, hook, and browser coverage:

- Compiler unit tests cover supported graph emission, unsupported graph rejection, identifier sanitization, source-map parsing, and WASM wrapper success/failure handling.
- Hook tests assert that `useAutoCompile()` preserves artifact-aware status, chooses artifact-backed source for preview, and aborts stale or superseded builds.
- Component tests cover manual build entry points, footer diagnostics, and the Move preview filename/source handoff.
- Playwright compilation coverage validates the end-to-end flow from canvas edits to compiled status to artifact-backed Move preview.

The intent is that every visible compile state in the UI is backed by the same generated artifact that the WASM compiler consumed.

To guarantee that contracts function exactly as they look, the code generation pipeline must be heavily verified. Predicting outputs is paramount to smart contract security.

1. **Unit Testing the Validator**: Test synthetic graphs with deliberate cycles, type mismatches, and missing connections to ensure the Constraint Engine throws appropriate, human-readable compilation errors.
2. **IR Generation Tests**: Pass mock React Flow JSON arrays and assert that the resulting AST correctly models the hierarchical execution flow.
3. **Snapshot Testing the Emitter**: Run standard graph configurations through the Emitter and use Vitest snapshot testing on the resulting `.move` text. Any structural change to a node's generation template will actively flag a snapshot failure.
4. **Integration Tooling (Future)**: An automated Github Action wrapper that takes the generated `.move` string, writes it to a temporary environment, and natively runs `sui move build`. If the actual Sui Move compiler encounters an error, the integration test fails. This guarantees 100% syntactical correctness.

### 5.6 Output Structure Example

While the final semantics will evolve, the fallback structure wraps the graph's AST execution flow into a standard Sui Move module wrapper:

```move
#[allow(unused_use)]
module builder_extensions::turret_logic;

use sui::{bcs, event};
use world::turret::{Self, TargetCandidate, ReturnTargetPriorityList, OnlineReceipt, Turret};
use world::character::{Self, Character};

public struct TurretAuth has drop {}

public struct PriorityListUpdatedEvent has copy, drop {
    turret_id: ID,
    priority_list: vector<TargetCandidate>,
}

// Execution Stream: Extension entry point called by the game server
// when target candidate behaviour changes (entered proximity, started/stopped attack).
public fun get_target_priority_list(
    turret: &Turret,
    owner_character: &Character,
    target_candidate_list: vector<u8>,
    receipt: OnlineReceipt,
): vector<u8{
    assert!(turret::turret_id(&receipt) == object::id(turret), 1); // EInvalidOnlineReceipt
    
    // Deserialize BCS candidates
    let candidates = turret::unpack_candidate_list(target_candidate_list);
    let mut return_list = vector::empty<ReturnTargetPriorityList>();
    let mut i = 0u64;
    let len = vector::length(&candidates);
    
    // [Emitter injects node-specific targeting logic here based on IR]
    // Example: friend-or-foe turret logic with behaviour-based weighting
    while (i < len) {
        let candidate = vector::borrow(&candidates, i);
        let mut weight = turret::candidate_priority_weight(candidate);
        let same_tribe = turret::candidate_character_tribe(candidate) == character::tribe(owner_character);
        let mut excluded = same_tribe && !turret::candidate_is_aggressor(candidate);
        
        // Apply behaviour-based adjustments
        if (turret::candidate_behaviour_change(candidate) == turret::behaviour_change_started_attack()) {
            weight = weight + 10000;
        } else if (turret::candidate_behaviour_change(candidate) == turret::behaviour_change_entered()) {
            if (!same_tribe || turret::candidate_is_aggressor(candidate)) {
                weight = weight + 1000;
            };
        } else if (turret::candidate_behaviour_change(candidate) == turret::behaviour_change_stopped_attack()) {
            excluded = true;
        };
        
        if (!excluded) {
            let entry = turret::new_return_target_priority_list(
                turret::candidate_item_id(candidate),
                weight,
            );
            vector::push_back(&mut return_list, entry);
        };
        i = i + 1;
    };
    
    event::emit(PriorityListUpdatedEvent {
        turret_id: object::id(turret),
        priority_list: candidates,
    });
    
    turret::destroy_online_receipt(receipt, TurretAuth {});
    bcs::to_bytes(&return_list)
}
```

### 5.7 Deployment & Wallet Integration

**Wallet & Network State:**
Managed by `@mysten/dapp-kit` providers wrapping the main application (`SuiClientProvider` and `WalletProvider`). Networks configured: `localnet`, `devnet`, `testnet`, `mainnet`.

**Localnet Faucet:**
When `localnet` is selected and the active account balance is exactly 0, the `Header` component displays a "Get Tokens" button. This invokes `requestSuiFromFaucetV0` using the localnet faucet URL.

**Move WASM Compilation Wrapper (`src/utils/moveCompiler.ts`):**

```typescript
import {
  initMoveCompiler,
  buildMovePackage,
} from "@zktx.io/sui-move-builder/lite";

export async function compileMoveTarget(generatedCode: string) {
  await initMoveCompiler();

  // Note: For Frontier dependency resolution, Move.toml needs specific definitions
  // referencing the correct upstream repository or mock.
  const files = {
    "Move.toml": `[package]\nname = "builder_extensions"\nversion = "0.0.1"\n\n[dependencies]\nSui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }\nworld = { local = "../world" }\n\n[addresses]\nbuilder_extensions = "0x0"`,
    "sources/turret_logic.move": generatedCode,
  };

  return await buildMovePackage({
    files,
    silenceWarnings: false,
  });
}
```

**Transaction Generation:**
Upon successful compilation, the bytecodes (`result.modules`) and dependencies (`result.dependencies`) are injected into a new Programmable Transaction Block (PTB) via `@mysten/sui/transactions`.

```typescript
import { Transaction } from "@mysten/sui/transactions";

const txb = new Transaction();
const upgradeCap = txb.publish({
  modules: result.modules,
  dependencies: result.dependencies,
});
txb.transferObjects([upgradeCap], txb.pure.address(account.address));

// Transaction is then executed via signAndExecuteTransactionBlock from dapp-kit
```

### 5.7.1 Package Upgrade Flow

Publishing a new package is the initial deployment vector, but EVE Frontier players will routinely iterate on their Smart Assembly logic. The system must support **upgrading an existing on-chain package** — replacing its bytecode while preserving shared object state — without requiring the user to understand Sui's upgrade mechanics.

**UpgradeCap Persistence:**

After the initial `txb.publish()`, the returned `UpgradeCap` object ID is persisted locally via `idb-keyval`, keyed by the package name and active network:

```typescript
import { get, set } from "idb-keyval";

interface StoredUpgradeCap {
  /** The on-chain UpgradeCap object ID. */
  objectId: string;
  /** The package ID this cap governs. */
  packageId: string;
  /** Network where this cap exists. */
  network: "localnet" | "devnet" | "testnet" | "mainnet";
  /** Module name for deduplication. */
  moduleName: string;
  /** Deployment timestamp (ISO 8601). */
  deployedAt: string;
  /** Digest of the latest deployed bytecode. */
  latestDigest: string;
}

const UPGRADE_CAP_KEY = (pkg: string, network: string) =>
  `frontier_upgrade_cap_${pkg}_${network}`;

export async function storeUpgradeCap(
  packageName: string,
  network: string,
  cap: StoredUpgradeCap,
): Promise<void{
  await set(UPGRADE_CAP_KEY(packageName, network), cap);
}

export async function getUpgradeCap(
  packageName: string,
  network: string,
): Promise<StoredUpgradeCap | undefined{
  return get(UPGRADE_CAP_KEY(packageName, network));
}
```

**Upgrade Transaction Construction:**

When an existing `UpgradeCap` is detected, the Deploy button switches to "Upgrade" mode and constructs an upgrade transaction instead of a publish transaction:

```typescript
import { Transaction } from "@mysten/sui/transactions";

async function buildUpgradeTransaction(
  result: CompilationResult,
  storedCap: StoredUpgradeCap,
): Promise<Transaction{
  const txb = new Transaction();

  // 1. Authorise the upgrade using the existing UpgradeCap
  const upgradeTicket = txb.moveCall({
    target: "0x2::package::authorize_upgrade",
    arguments: [
      txb.object(storedCap.objectId), // UpgradeCap
      txb.pure.u8(0), // UpgradePolicy::Compatible
      txb.pure.vector("u8", result.digest), // Package digest
    ],
  });

  // 2. Commit the upgrade with new bytecode modules
  const upgradeReceipt = txb.upgrade({
    modules: result.modules,
    dependencies: result.dependencies,
    package: storedCap.packageId,
    ticket: upgradeTicket,
  });

  // 3. Finalise — commit the upgrade receipt back to the UpgradeCap
  txb.moveCall({
    target: "0x2::package::commit_upgrade",
    arguments: [txb.object(storedCap.objectId), upgradeReceipt],
  });

  return txb;
}
```

**UI State Logic:**

The `Header` component queries IndexedDB on mount and on network change to determine whether a prior deployment exists:

```typescript
const [deployMode, setDeployMode] = useState<"publish" | "upgrade">("publish");
const [storedCap, setStoredCap] = useState<StoredUpgradeCap | undefined>();

useEffect(() ={
  getUpgradeCap("frontier_protocols", activeNetwork).then((cap) ={
    setStoredCap(cap);
    setDeployMode(cap ? "upgrade" : "publish");
  });
}, [activeNetwork]);
```

The Deploy button label, icon, and click handler adapt accordingly. A confirmation modal warns the user before executing an upgrade, displaying the previous package ID and the active `UpgradePolicy`.

---

## 6. Configuration Files

### 6.1 `package.json`

```json
{
  "name": "frontierflow",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

### 6.2 `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

### 6.3 `tailwind.config.js`

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### 6.4 `postcss.config.js`

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

### 6.5 `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>frontierflow</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 6.6 `index.css` setup references

For CSS setup see `src/index.css` leveraging Tailwind. Core design variables are defined in the `:root` scope such as `--brand-orange: #ff4700;`. Font imports for "Disket Mono" and "Inter".

---

## 7. Integrated Testing Architecture

### 7.1 Testing Panel UI & Socket Modals

- **Component:** A dedicated `TestingPanel.tsx` that docks alongside the sidebar or acts as a bottom drawer.
- **Dynamic Inputs:** The UI scans the graph for boundary output handles (inputs to the graph) and generates form fields based on the respective socket types (e.g., array builder for `list`, custom text inputs for `rider` Entity hashes).
- **Test Cases:** Users can define and save multiple "Scenarios" (Test Cases) consisting of a mapping of input values to expected output assertions.

### 7.2 Graph I/O Identification

- **Implicit Detection:** Nodes with no incoming connections (graph entry points like `Proximity`) are treated as test inputs. Nodes with no outgoing connections (graph exit points like `AddToQueue`) are treated as output assertions.
- **Explicit Overrides:** Users can right-click nodes to explicitly mark specific edges/sockets as mocked inputs or assertions.

### 7.3 Execution Parity

- **Client-Side (TypeScript):** Evaluated strictly via an Interpreter over the Intermediate Representation (AST). This requires duplicating base Move logic (e.g., vector operations, math overflows) in TS for local instant feedback.
- **WASM Move Execution:** Generates `#[test]` modules appended to the `sources/` output and runs via the `@zktx.io/sui-move-builder/lite` testing capabilities. This provides the ultimate source of truth but is slower than the TS pathway.

### 7.4 External Dependency Mocking

Because the Move code interacts with external Frontier APIs (e.g., `frontier::radar`), the `codeGenerator.ts` must inject dependency injection or emit mock versions of these modules into the testing module block when `#[test_only]` is compiled. Test cases allow the user to define this Mock State.

### 7.5 Lifecycle & State Resetting

- **Granular Debouncing:** When `onNodesChange` and `onEdgesChange` fire, the system clears the _Execution Results_ (Success/Fail traces).
- **Isolation:** The _Test Cases_ data (user-provided mock inputs) is maintained separately from the transient execution state. Nudging a node visually will clear the test pass/fail UI overlay but completely retain the configured mock data.

### 7.6 Error Mapping & Visual Feedback

The testing engine handles three distinct error surfaces, each mapped back to the originating React Flow Node:

1. **TypeScript AST Evaluation Errors:** When the local TS interpreter throws during graph evaluation, the error's stack trace is resolved against the IR tree. The AST Node ID → React Flow Node ID mapping identifies the failing node.
2. **Move `abort` / Test Assertion Failures:** When a `#[test]` module compiled via WASM aborts, the abort code or assertion message is parsed and matched against the test case's node bindings.
3. **Native WASM Compiler Errors:** When the graph passes the Constraint Engine but the Move compiler itself rejects the generated code, the `parseCompilerOutput()` function (see §5.4.1) regex-parses the compiler's error stream, cross-references the emitted source map annotations (`// @ff-node:*`), and resolves the error to a specific `reactFlowNodeId`.

**Visual Application:**

For all three error types, the canvas applies the `.node-error-highlight` CSS class to the resolved node:

```css
.node-error-highlight {
  border: 2px solid var(--error-glow) !important;
  box-shadow: 0 0 16px rgba(255, 59, 48, 0.4);
  animation: error-pulse 1s ease infinite alternate;
}

@keyframes error-pulse {
  from {
    box-shadow: 0 0 8px rgba(255, 59, 48, 0.2);
  }
  to {
    box-shadow: 0 0 24px rgba(255, 59, 48, 0.6);
  }
}
```

A structured error summary is simultaneously rendered in the Testing Panel, displaying the human-readable `userMessage` from each `CompilerDiagnostic` alongside the raw compiler output (collapsed by default) for advanced debugging.

### 7.7 Automated Accessibility Testing

The CI pipeline integrates automated audits to maintain the WCAG 2.1 Level AA mandate:

- **Lint-time (ESLint):** `eslint-plugin-jsx-a11y` catches missing ARIA roles, unlabelled inputs, and invalid interactive element semantics during development.
- **E2E (Axe-core):** The Playwright testing suite includes a11y audit steps using `@axe-core/playwright`. Audits run across the primary UI states:
  - Default graph (initial state)
  - Code Preview Modal (open)
  - Testing Panel (open)
- **Manual Checklist:** Developers perform a manual "Keyboard Only" run of the [Core User Flows](./USER-FLOWS.md) before merging UI changes.

---

## 8. GitHub Integration & Caching

The application handles GitHub dependency fetching and data persistence directly from the browser environment.

### 8.1 GitHub OAuth & Rate Limits

- **OAuth Mechanism:** The application initialises a standard GitHub OAuth App flow. Because pure front-end applications cannot securely store the GitHub Client Secret, we utilise a **Netlify Function** as a lightweight serverless backend to handle the OAuth token exchange callback.
- **WASM Dependency Fetching:** The `@zktx.io/sui-move-builder/lite` compiler inherently requests dependencies from GitHub (such as `sui-framework`). We attach the authenticated user's token to these GitHub API requests via interceptors or compiler configuration. This increases the unauthenticated rate limit from 60 requests/hour to 5,000 requests/hour.

### 8.2 Dependency Caching Engine (IndexedDB)

Fetching the entire `sui-framework` per compilation is slow and burns through rate limits even when authenticated. The solution is an IndexedDB caching layer via `idb-keyval`.

- **Cache Keys:** Formatted as `{repo_owner}+{repo_name}+{branch/hash}+{file_path}`.
- **Interception:** Before the WASM compiler issues a network fetch for a Move dependency, the cache engine checks IndexedDB.
- **Hit:** Returns the file string locally (latency < 5ms).
- **Miss:** Fetches via GitHub API, writes to IndexedDB for the cache key, and returns the file to the compiler.

### 8.3 Repository Persistence (Saving/Loading)

Users can sync their local work directly to their remote GitHub tracking repositories.

- **Graph State Synchronization:** The application stringifies the active `Node[]` and `Edge[]` React Flow state and persists it as a `frontier-flow-graph.json` to the remote repository.
- **Generated Code Synchronization:** Transformed Move strings (`sources/*.move` and `Move.toml`) are committed directly to the repository via the GitHub REST API (`PUT /repos/{owner}/{repo}/contents/{path}`).
- **Conflict Resolution:** The client checks for the current file `sha` before making a PUT request to ensure valid, non-conflicting commits.
