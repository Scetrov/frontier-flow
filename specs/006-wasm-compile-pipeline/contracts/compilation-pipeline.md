# Interface Contract: Compilation Pipeline

**Feature**: 006-wasm-compile-pipeline  
**Date**: 2026-03-18

## 1. Pipeline Orchestrator

The pipeline exposes a single async entry point consumed by the `useAutoCompile` hook and the Build button handler.

### `compilePipeline(nodes, edges, moduleName) → PipelineResult`

```typescript
interface PipelineResult {
  readonly status: CompilationStatus;
  readonly code: string | null;
  readonly sourceMap: SourceMapEntry[] | null;
  readonly optimizationReport: OptimizationReport | null;
}

/**
 * Execute the full compilation pipeline:
 * 1. Build IR from React Flow graph
 * 2. Validate IR (structural completeness, type safety, DAG check)
 * 3. Sanitise user inputs
 * 4. Optimise IR (dead branch elimination, vector folding, constant prop, gas reorder)
 * 5. Emit Move source code with source map
 * 6. Compile via WASM
 *
 * Returns early with error status if validation fails.
 * Throws only on unrecoverable errors (WASM load failure).
 */
async function compilePipeline(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
  moduleName: string,
  signal?: AbortSignal,
): Promise<PipelineResult>;
```

## 2. Auto-Compile Hook

### `useAutoCompile(nodes, edges, moduleName) → CompilationState`

```typescript
interface CompilationState {
  readonly status: CompilationStatus;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly triggerCompile: () => void;
}

/**
 * React hook that:
 * - Watches nodes/edges for changes
 * - Debounces with configurable idle duration (default 2500ms)
 * - Auto-triggers compilePipeline after idle
 * - Provides triggerCompile() for manual Build button
 * - Cancels in-flight compilation on new edits
 * - Returns current compilation status and diagnostics
 */
function useAutoCompile(
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
  moduleName: string,
): CompilationState;
```

## 3. Node Code Generator Registry

### `getGenerator(nodeType) → NodeCodeGenerator | undefined`

```typescript
/**
 * Look up the code generator for a given node type.
 * Returns undefined if no generator is registered (validation error).
 */
function getGenerator(nodeType: string): NodeCodeGenerator | undefined;
```

### Generator Coverage

Every node type in `nodeDefinitions` must have a registered generator:

| Category         | Node Types                                                                                                                                                           | Generator File        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| event-trigger    | `aggression`, `proximity`                                                                                                                                            | `eventTriggers.ts`    |
| data-accessor    | `getTribe`, `hpRatio`, `shieldRatio`, `armorRatio`, `getGroupId`, `getBehaviour`, `isAggressor`, `getPriorityWeight`                                                 | `dataAccessors.ts`    |
| scoring-modifier | `behaviourBonus`, `aggressorBonus`, `damageBonus`, `sizeTierBonus`, `groupBonusLookup`, `threatBonus`, `historyPenalty`                                              | `scoringModifiers.ts` |
| logic-gate       | `excludeOwner`, `excludeSameTribe`, `excludeStoppedAttack`, `excludeNpc`, `isInList`, `countAggressors`                                                              | `logicGates.ts`       |
| data-source      | `groupBonusConfig`, `roundRobinConfig`, `threatLedgerConfig`, `typeBlocklistConfig`, `getTribeListFromConfig`, `getItemListFromConfig`, `getCharacterListFromConfig` | `dataSources.ts`      |
| action           | `addToQueue`                                                                                                                                                         | `actions.ts`          |

## 4. WASM Compiler Wrapper

### `compileMove(code, moduleName) → CompileResult`

```typescript
interface CompileResult {
  readonly success: boolean;
  readonly modules: Uint8Array[] | null;
  readonly dependencies: string[] | null;
  readonly errors: CompilerDiagnostic[] | null;
}

/**
 * Compile Move source code using @zktx.io/sui-move-builder/lite.
 * Lazy-loads the WASM binary on first call.
 * Parses compilation errors into structured diagnostics.
 * Never throws — all errors are returned in the result.
 */
async function compileMove(
  code: string,
  moduleName: string,
  sourceMap: SourceMapEntry[],
): Promise<CompileResult>;
```

## 5. Compiler Error Parser

### `parseCompilerOutput(rawOutput, sourceMap) → CompilerDiagnostic[]`

```typescript
/**
 * Parse raw Move compiler error output into structured diagnostics.
 * Maps each error to the originating React Flow node ID via the source map.
 * Handles: single errors, multiple errors, warnings, unmappable lines, malformed output.
 */
function parseCompilerOutput(
  rawOutput: string,
  sourceMap: SourceMapEntry[],
): CompilerDiagnostic[];
```

## 6. Component Contracts

### Footer — CompilationStatus Component

**Props**:

```typescript
interface CompilationStatusProps {
  readonly status: CompilationStatus;
  readonly diagnostics: readonly CompilerDiagnostic[];
}
```

**Visual contract**:

| State     | Dot Colour | Label     | CSS Variable                      |
| --------- | ---------- | --------- | --------------------------------- |
| idle      | Blue       | Idle      | `var(--status-idle, #3b82f6)`     |
| compiling | Orange     | Compiling | `var(--brand-orange)`             |
| compiled  | Green      | Compiled  | `var(--status-compiled, #22c55e)` |
| error     | Red        | Error     | `var(--status-error, #ef4444)`    |

### Header — Build Button

**Props**:

```typescript
interface BuildButtonProps {
  readonly isCompiling: boolean;
  readonly onBuild: () => void;
}
```

**States**:

- Default: Clickable, normal styling
- Disabled: `isCompiling === true`, muted colour, `aria-disabled="true"`
