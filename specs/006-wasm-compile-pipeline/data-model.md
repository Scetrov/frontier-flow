# Data Model: WASM Contract Compilation Pipeline

**Feature**: 006-wasm-compile-pipeline  
**Date**: 2026-03-18

## 1. Intermediate Representation (IR)

### 1.1 IRNode

Normalised representation of a single canvas node, stripped of UI metadata.

| Field          | Type                                          | Description                                                                       |
| -------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `id`           | `string`                                      | React Flow node ID (e.g., `"dnd_3_1708642800000"`)                                |
| `type`         | `string`                                      | Node type from the definition registry (e.g., `"aggression"`, `"getTribe"`)       |
| `label`        | `string`                                      | Sanitised display label (post Phase 3)                                            |
| `category`     | `NodeCategory`                                | `"event-trigger" \| "data-accessor" \| "data-source" \| "logic-gate" \| "action"` |
| `fields`       | `Record<string, string \| number \| boolean>` | User-editable field values                                                        |
| `inputs`       | `Record<string, IRConnection>`                | Inbound connections keyed by target socket ID                                     |
| `outputs`      | `Record<string, IRConnection[]>`              | Outbound connections keyed by source socket ID                                    |
| `sockets`      | `readonly SocketDefinition[]`                 | Socket definitions from the node definition                                       |
| `estimatedGas` | `number \| undefined`                         | Gas cost annotation (populated by optimiser)                                      |
| `pruned`       | `boolean \| undefined`                        | Whether this node was pruned by the optimiser                                     |

### 1.2 IRConnection

Represents a single edge between two node sockets.

| Field            | Type         | Description                             |
| ---------------- | ------------ | --------------------------------------- |
| `sourceNodeId`   | `string`     | Source node ID                          |
| `sourceSocketId` | `string`     | Source socket ID                        |
| `targetNodeId`   | `string`     | Target node ID                          |
| `targetSocketId` | `string`     | Target socket ID                        |
| `socketType`     | `SocketType` | Resolved socket type for the connection |

### 1.3 IRGraph

The complete normalised graph used by all pipeline phases.

| Field            | Type                  | Description                            |
| ---------------- | --------------------- | -------------------------------------- |
| `nodes`          | `Map<string, IRNode>` | All nodes indexed by ID                |
| `connections`    | `IRConnection[]`      | All connections in the graph           |
| `executionOrder` | `string[]`            | Topologically sorted node IDs          |
| `moduleName`     | `string`              | Sanitised module name for Move package |

## 2. Pipeline Output Types

### 2.1 EmitterOutput

Result of Phase 4 code emission.

| Field       | Type               | Description                                 |
| ----------- | ------------------ | ------------------------------------------- |
| `code`      | `string`           | Raw Move source code string                 |
| `sourceMap` | `SourceMapEntry[]` | Line-to-node mapping for error traceability |

### 2.2 SourceMapEntry

Maps an emitted source line to its originating node.

| Field             | Type                  | Description                                                 |
| ----------------- | --------------------- | ----------------------------------------------------------- |
| `line`            | `number`              | 1-indexed line number in the emitted `.move` file           |
| `astNodeId`       | `string`              | The IR node ID that generated this line                     |
| `reactFlowNodeId` | `string`              | The React Flow node ID (same as `astNodeId` unless aliased) |
| `context`         | `string \| undefined` | Specific socket or field context                            |

### 2.3 AnnotatedLine

A single line of emitted Move source with metadata.

| Field    | Type     | Description                                   |
| -------- | -------- | --------------------------------------------- |
| `code`   | `string` | The Move source code text                     |
| `nodeId` | `string` | Originating IR node ID                        |
| `indent` | `number` | Indentation level (number of 4-space indents) |

## 3. Validation and Diagnostics

### 3.1 ValidationResult

Result of Phase 2 constraint validation.

| Field         | Type                   | Description                                   |
| ------------- | ---------------------- | --------------------------------------------- |
| `valid`       | `boolean`              | Whether the graph passes all validation rules |
| `diagnostics` | `CompilerDiagnostic[]` | Validation errors and warnings                |

### 3.2 CompilerDiagnostic

A structured representation of a single compilation or validation issue.

| Field             | Type                   | Description                                           |
| ----------------- | ---------------------- | ----------------------------------------------------- |
| `severity`        | `"error" \| "warning"` | Severity level                                        |
| `rawMessage`      | `string`               | Original error/warning message                        |
| `line`            | `number \| null`       | Source line number (null for validation-phase errors) |
| `reactFlowNodeId` | `string \| null`       | Traced React Flow node ID (null if unmappable)        |
| `socketId`        | `string \| null`       | Specific socket ID (for unconnected input warnings)   |
| `userMessage`     | `string`               | Human-readable message for the UI                     |

## 4. Compilation State

### 4.1 CompilationStatus (Discriminated Union)

Drives the footer indicator, Build button, and auto-compile orchestration.

| Variant                                                 | Fields        | Description                                  |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| `{ state: "idle" }`                                     | —             | No compilation activity; awaiting idle timer |
| `{ state: "compiling" }`                                | —             | Compilation in progress                      |
| `{ state: "compiled", bytecode: Uint8Array[] }`         | `bytecode`    | Last compilation succeeded                   |
| `{ state: "error", diagnostics: CompilerDiagnostic[] }` | `diagnostics` | Last validation/compilation failed           |

### 4.2 State Transitions

```text
idle → compiling         (idle timer fires OR Build button clicked)
compiling → compiled     (compilation succeeds)
compiling → error        (validation or compilation fails)
compiled → idle          (user edits graph)
error → idle             (user edits graph)
compiling → idle         (user edits graph during compilation — abort)
```

## 5. Code Generator Interface

### 5.1 NodeCodeGenerator

Strategy interface implemented by each node type's code generator.

| Method     | Signature                                                       | Description                           |
| ---------- | --------------------------------------------------------------- | ------------------------------------- |
| `nodeType` | `readonly string`                                               | Node type this generator handles      |
| `validate` | `(node: IRNode) => ValidationResult`                            | Validates minimum required inputs     |
| `emit`     | `(node: IRNode, context: GenerationContext) => AnnotatedLine[]` | Generates annotated Move source lines |

### 5.2 GenerationContext

Shared mutable context passed through all generators during emission.

| Field            | Type                  | Description                                |
| ---------------- | --------------------- | ------------------------------------------ |
| `imports`        | `Set<string>`         | Accumulated `use` import statements        |
| `bindings`       | `Map<string, string>` | Variable bindings: binding name → node ID  |
| `structs`        | `string[]`            | Struct definitions to emit at module scope |
| `entryFunctions` | `string[]`            | Entry function signatures                  |
| `moduleName`     | `string`              | Active module name                         |
| `sourceMap`      | `SourceMapEntry[]`    | Accumulating source map entries            |
| `currentLine`    | `number`              | Current line number counter                |

## 6. Optimisation Report

### 6.1 OptimizationReport

Produced by Phase 3.5, consumed by diagnostics UI.

| Field                | Type                                   | Description                                 |
| -------------------- | -------------------------------------- | ------------------------------------------- |
| `originalNodeCount`  | `number`                               | Total IR nodes before optimisation          |
| `optimizedNodeCount` | `number`                               | Total IR nodes after optimisation           |
| `nodesRemoved`       | `string[]`                             | Node IDs removed by dead branch elimination |
| `nodesRewritten`     | `Array<{ nodeId, pass, description }>` | Nodes rewritten by optimisation passes      |
| `gasBefore`          | `number`                               | Estimated gas before optimisation           |
| `gasAfter`           | `number`                               | Estimated gas after optimisation            |

## 7. Entity Relationships

```text
FlowNode[] + FlowEdge[]
        │
        ▼ (Phase 1: irBuilder)
    IRGraph
    ├── IRNode[]
    │   ├── inputs: Record<socketId, IRConnection>
    │   └── outputs: Record<socketId, IRConnection[]>
    └── connections: IRConnection[]
        │
        ▼ (Phase 2: validator)
    ValidationResult
    ├── valid: boolean
    └── diagnostics: CompilerDiagnostic[]
        │
        ▼ (Phase 3: sanitiser → Phase 3.5: optimiser)
    IRGraph (sanitised, optimised)
        │
        ▼ (Phase 4: emitter)
    EmitterOutput
    ├── code: string (Move source)
    └── sourceMap: SourceMapEntry[]
        │
        ▼ (moveCompiler: WASM)
    CompilationResult
    ├── modules: Uint8Array[] (bytecode)
    └── dependencies: string[]
        │
        ▼ (on error: errorParser)
    CompilerDiagnostic[]
        │
        ▼ (state machine)
    CompilationStatus (idle | compiling | compiled | error)
```
