# Contract: Graph-To-Move Pipeline Interface

## Purpose

Define the stable interface between canvas state, the graph-to-Move compiler pipeline, and the UI surfaces that consume generation results.

## Input Contract

### Compile Request

**Producer**: Canvas workspace and manual build entry points

**Fields**:
- `nodes`: current canvas nodes
- `edges`: current canvas edges
- `moduleName`: requested contract/module name
- `trigger`: `auto` or `manual`
- `abortSignal`: optional cancellation signal for superseded builds

**Rules**:
- `nodes` and `edges` must represent the active graph at request time
- `moduleName` may be user-provided but must be sanitized before emission
- A newer request supersedes an in-flight request for an older graph snapshot

## Output Contract

### Pipeline Result

**Consumer**: Code preview, footer/build status, diagnostics UI, future deployment flow

**Fields**:
- `status`: `idle`, `compiling`, `compiled`, or `error`
- `artifact`: optional generated contract artifact
- `diagnostics`: ordered list of structured diagnostics
- `optimizationReport`: optional summary from optimisation passes

**Rules**:
- `artifact` is present only when emission succeeds
- `diagnostics` must be populated for unsupported graphs and compile failures
- `status=compiled` implies a valid generated artifact and successful WASM compile
- `status=error` implies at least one blocking diagnostic or compile error

## Diagnostic Contract

### Validation Diagnostics

**Produced by**: IR builder, validator, sanitizer, emission guards

**Required fields**:
- `severity`
- `stage`
- `userMessage`
- `reactFlowNodeId` when attributable
- `socketId` when attributable

**Rules**:
- Validation diagnostics block emission for unsupported or incomplete graphs
- Validation diagnostics should be surfaced before WASM compilation starts

### Compilation Diagnostics

**Produced by**: WASM compiler wrapper and compiler output parser

**Required fields**:
- `severity`
- `stage=compilation`
- `rawMessage`
- `userMessage`
- `line` when available
- `reactFlowNodeId` when source-map resolution succeeds

**Rules**:
- Raw compiler output must be parsed into user-facing diagnostics
- Line-based diagnostics should resolve back to graph nodes when source-map entries exist

## Compatibility Rules

- Existing auto-compile and manual build entry points must continue to consume one pipeline result shape
- Code preview must read emitted Move from the generated artifact rather than a placeholder source string
- Future deployment work may extend the result with persistence metadata without breaking these core fields
