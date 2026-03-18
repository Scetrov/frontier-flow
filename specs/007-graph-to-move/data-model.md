# Data Model: Graph To Move Generation

## Entities

### FlowGraph

**Description**: The React Flow canvas state submitted to the compiler pipeline.

**Fields**:
- `nodes`: ordered list of flow nodes from the canvas
- `edges`: ordered list of flow edges from the canvas
- `moduleName`: user-facing name normalized into a contract module name
- `graphKey`: stable hashable representation used to detect compile-relevant changes

**Relationships**:
- Produces one `IRGraph`
- Produces zero or one `GeneratedContractArtifact`
- Produces zero or more `GenerationDiagnostic` entries

**Validation rules**:
- Must contain at least one supported entry-point node
- Required sockets must be connected
- Edge types must satisfy the socket compatibility matrix
- Execution order must be resolvable as a DAG

### IRGraph

**Description**: The normalized, immutable graph representation used by the compiler pipeline.

**Fields**:
- `nodes`: map of `IRNode` objects keyed by graph node ID
- `connections`: typed connection list between node sockets
- `executionOrder`: stable topological ordering for deterministic emission
- `moduleName`: sanitized module identifier

**Relationships**:
- Derived from one `FlowGraph`
- Consumed by validator, sanitizer, optimiser, and emitter phases

**Validation rules**:
- Node references and socket references must resolve
- Execution order must be stable for identical graphs
- Unsupported node types must be reported before emission

### IRNode

**Description**: A semantic node stripped of UI-only metadata but retaining generation-relevant inputs.

**Fields**:
- `id`: stable graph node ID
- `type`: node type key
- `category`: event-trigger, data-source, data-accessor, logic-gate, scoring-modifier, or action
- `label`: sanitized display label or derived identifier seed
- `inputs`: required and optional input socket definitions
- `outputs`: output socket definitions
- `fields`: node configuration values relevant to emission

**Relationships**:
- Belongs to one `IRGraph`
- May participate in many `IRConnection` instances
- Maps to one `GraphToContractMappingRule`

**Validation rules**:
- `type` must have registered generator coverage for supported generation
- `fields` must satisfy node-specific validation before emission

### IRConnection

**Description**: A typed edge between two node sockets in the normalized graph.

**Fields**:
- `sourceNodeId`
- `sourceSocketId`
- `targetNodeId`
- `targetSocketId`
- `socketType`

**Relationships**:
- Belongs to one `IRGraph`
- Connects two `IRNode` instances

**Validation rules**:
- Both endpoints must exist
- Socket directions must be valid
- Socket types must be compatible

### GraphToContractMappingRule

**Description**: The approved translation rule for turning a supported node or flow pattern into Move code.

**Fields**:
- `nodeType`
- `generatorCategory`
- `requiredInputs`
- `emissionPattern`
- `diagnosticFallback`

**Relationships**:
- Applies to one or more `IRNode` instances of the same type
- Produces one or more sections inside a `GeneratedContractArtifact`

**Validation rules**:
- Every supported node type must have exactly one active mapping rule
- Unsupported node types must never fall through to partial emission

### GeneratedContractArtifact

**Description**: The full package passed to the WASM Sui Move compiler.

**Fields**:
- `moduleName`: sanitized Move module name
- `moveToml`: package manifest text
- `sourceFilePath`: package-relative source path
- `moveSource`: emitted Move source text
- `sourceMap`: ordered `SourceMapEntry` list
- `bytecodeModules`: compiled bytecode modules when compilation succeeds
- `dependencies`: resolved package dependency identifiers returned by the compiler

**Relationships**:
- Derived from one validated `IRGraph`
- Emits many `SourceMapEntry` values
- Produces zero or more compiler `GenerationDiagnostic` entries on failure

**Validation rules**:
- Must include all files required by the WASM compiler wrapper
- Must be deterministic for the same `IRGraph`
- Must not exist when blocking graph validation fails

### SourceMapEntry

**Description**: The trace record linking generated contract lines back to graph elements.

**Fields**:
- `line`
- `reactFlowNodeId`
- `socketId`
- `section`

**Relationships**:
- Belongs to one `GeneratedContractArtifact`
- Supports compiler error mapping into `GenerationDiagnostic`

**Validation rules**:
- Line references must be monotonic and match emitted output
- Every generated section tied to a graph node should have at least one trace entry

### GenerationDiagnostic

**Description**: A structured blocking or non-blocking message produced during validation or compilation.

**Fields**:
- `severity`: error or warning
- `stage`: validation, sanitization, emission, or compilation
- `rawMessage`
- `userMessage`
- `line`: optional generated source line
- `reactFlowNodeId`: optional graph node ID
- `socketId`: optional socket ID

**Relationships**:
- May attach to a `FlowGraph`, `IRNode`, or `GeneratedContractArtifact`
- Consumed by build status UI and error surfacing UI

**Validation rules**:
- Blocking diagnostics prevent emission or successful compilation
- Diagnostics should prefer graph attribution when source-map data exists

### CompilationStatus

**Description**: The state machine representing the active build lifecycle.

**Fields**:
- `state`: idle, compiling, compiled, or error
- `artifact`: optional `GeneratedContractArtifact`
- `diagnostics`: current diagnostic list
- `lastGraphKey`: last graph identity compiled or attempted

**Relationships**:
- Represents the current lifecycle for one active `FlowGraph`

**State transitions**:
- `idle -> compiling` when manual build or auto-compile starts
- `compiling -> compiled` when artifact emission and WASM compile succeed
- `compiling -> error` when blocking diagnostics or compiler errors occur
- `compiled -> idle` when the graph changes and a new build has not yet started
- `error -> compiling` when a new valid build attempt starts
