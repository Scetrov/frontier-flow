# Research: WASM Contract Compilation Pipeline

**Feature**: 006-wasm-compile-pipeline  
**Date**: 2026-03-18

## 1. @zktx.io/sui-move-builder WASM Integration

### Decision: Use `@zktx.io/sui-move-builder/lite` with lazy loading

**Rationale**: ADR-003 mandates this package as the primary and only compilation path. The `/lite` entrypoint is optimised for in-browser use and reduces the WASM bundle size.

**API Surface**:

- `initMoveCompiler()` — Must be called once before any compilation. Loads the WASM binary.
- `buildMovePackage({ files, silenceWarnings? })` — Accepts a `Record<string, string>` where keys are file paths (e.g., `"Move.toml"`, `"sources/turret_logic.move"`) and values are file contents. Returns `{ modules: Uint8Array[], dependencies: string[] }`. Errors are thrown as exceptions with raw Move compiler output as the message.

**Alternatives considered**:

- Server-side compilation (rejected per ADR-003: adds infrastructure, latency, and data exfiltration risk)
- Hybrid WASM + server fallback (rejected: too complex for first iteration)

### Key findings

1. Package is **not yet installed** — must be added as an exact-pinned dependency per SECURITY.md
2. No Vite WASM plugin is needed — the `/lite` entrypoint handles WASM loading internally via `fetch()`
3. `initMoveCompiler()` is async and should be called lazily on first compile, not at app startup
4. Errors from `buildMovePackage` are thrown exceptions containing raw Move compiler output text
5. The package requires `Move.toml` manifest alongside Move source files in the `files` record

## 2. Vite WASM Configuration

### Decision: No additional Vite plugin required

**Rationale**: The `@zktx.io/sui-move-builder/lite` package internalises WASM loading via dynamic `fetch()` or `import()`. Vite's default ESM handling is sufficient. If the WASM binary needs to be served as a static asset, Vite's `optimizeDeps.exclude` may be needed to prevent pre-bundling interference.

**Alternatives considered**:

- `vite-plugin-wasm` + `vite-plugin-top-level-await` (rejected: unnecessary overhead; the package handles its own loading)

### Vite configuration additions

- Add `@zktx.io/sui-move-builder` to `optimizeDeps.exclude` if pre-bundling causes issues
- Ensure `worker` format is compatible if the package uses Web Workers (verify at integration time)

## 3. Auto-Compile Idle Timer Strategy

### Decision: Debounced timer with AbortController cancellation

**Rationale**: The idle timer must reset on every graph edit and cancel in-flight compilations when the graph changes. Using `setTimeout` with cleanup and an `AbortController` for the async compilation provides clean cancellation semantics.

**Alternatives considered**:

- `requestIdleCallback` (rejected: inconsistent browser support, less predictable timing)
- Web Worker for compilation (deferred: adds complexity; evaluate if main-thread blocking becomes an issue)
- RxJS debounce (rejected: adding RxJS for one use case violates simplicity principle)

### Implementation approach

1. React hook `useAutoCompile` watches `nodes` and `edges` arrays by reference
2. On change: clear previous timer, set new `setTimeout(compileFn, IDLE_MS)`
3. `compileFn` creates an `AbortController`, runs the pipeline, checks `signal.aborted` before updating state
4. On unmount or new edit: abort controller is signalled, timer cleared
5. Default idle duration: 2500ms (configurable via constant)

## 4. Compilation Status State Machine

### Decision: Four-state discriminated union

**Rationale**: The status indicator requires four distinct visual states. A discriminated union provides exhaustive type checking and clean pattern matching.

```typescript
type CompilationStatus =
  | { readonly state: "idle" }
  | { readonly state: "compiling" }
  | { readonly state: "compiled"; readonly bytecode: Uint8Array[] }
  | { readonly state: "error"; readonly diagnostics: CompilerDiagnostic[] };
```

**Alternatives considered**:

- Enum + separate error array (rejected: less type-safe, error array could be stale)
- String union without payload (rejected: loses bytecode and diagnostic data)

### State transitions

- `idle` → `compiling` (idle timer fires or Build button clicked)
- `compiling` → `compiled` (compilation succeeds)
- `compiling` → `error` (validation or compilation fails)
- `compiled` → `idle` (user edits graph)
- `error` → `idle` (user edits graph)
- `compiling` → `idle` (user edits graph during compilation — abort)

## 5. Move.toml Package Manifest

### Decision: Generate a static Move.toml with EVE Frontier dependencies

**Rationale**: `buildMovePackage` requires a `Move.toml` manifest declaring the package name, Sui edition, and dependencies. For EVE Frontier turret strategies, the dependencies are `Sui` and `World` (the EVE Frontier game framework).

### Template

```toml
[package]
name = "{module_name}"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
builder_extensions = "0x0"
sui = "0x2"
```

**Note**: The exact `World` dependency (EVE Frontier game framework) may need to be resolved at integration time. The Move.toml generator should be a separate utility function that is easy to update.

## 6. Testing Strategy for WASM Mock

### Decision: Module-level mock of `@zktx.io/sui-move-builder/lite` in Vitest

**Rationale**: The WASM binary is too large and slow for unit tests (per TESTING-STRATEGY.md §9). Vitest's `vi.mock()` replaces the module with a factory that returns pre-compiled bytecode fixtures or throws synthetic error strings.

**Alternatives considered**:

- Running real WASM in tests (rejected: 10+ second load time per test suite)
- Manual dependency injection (rejected: would require restructuring the compiler module API purely for testing)

### Mock structure

```typescript
vi.mock("@zktx.io/sui-move-builder/lite", () => ({
  initMoveCompiler: vi.fn().mockResolvedValue(undefined),
  buildMovePackage: vi.fn().mockResolvedValue({
    modules: [new Uint8Array([1, 2, 3])],
    dependencies: [],
  }),
}));
```

For error tests, override `buildMovePackage` to throw with fixture error strings matching real Move compiler output format.

## 7. Code Generation Snapshot Testing

### Decision: Vitest inline snapshots + golden file snapshots

**Rationale**: Individual node generators use inline snapshots for fast iteration. Full-graph compilation uses golden file snapshots (`.move` files) for reviewable diffs in PRs.

**Alternatives considered**:

- Only inline snapshots (rejected: full Move modules are too large for inline)
- Only golden files (rejected: too heavy for individual node tests)

### Snapshot update policy

- Snapshot changes must be explicitly reviewed in PRs
- CI flags snapshot diffs with a comment for reviewer attention
- `bun run test -- -u` to update snapshots locally

## 8. Error Surfacing UI Pattern

### Decision: Footer status indicator + ARIA live region + node-level CSS class

**Rationale**: Errors need to be visible at three levels: (1) global status in footer, (2) accessible announcement via ARIA, (3) visual highlighting on specific nodes.

**Implementation**:

1. Footer `CompilationStatus` component with `aria-live="polite"` for screen reader announcements
2. `CompilerDiagnostic[]` propagated to `CanvasWorkspace` which adds `data-validation-error` attribute to affected nodes
3. BaseNode reads the attribute and applies a red/orange border CSS class
4. Error details accessible via clicking the footer status dot or an expandable panel

**Alternatives considered**:

- Toast notifications for each error (rejected: too intrusive for auto-compile; multiple toasts would stack)
- Dedicated error panel always visible (deferred: can be added later; footer indicator sufficient for MVP)

## 9. Build Button Placement and Behaviour

### Decision: Header right section, next to WalletStatus

**Rationale**: The Header already has a right-aligned action area with `WalletStatus`. Adding a Build button there is consistent with the existing layout. The button is secondary to auto-compile, so it should be visible but not dominant.

**Implementation**:

- Styled as a secondary action button matching the existing Header aesthetic
- Shows "Build" label with a small icon (hammer or similar from lucide-react)
- Disabled state during compilation (muted colour, no pointer events)
- Triggers the same pipeline as auto-compile via a shared `triggerCompile()` function from the hook

## 10. Per-Node Code Generation Architecture

### Decision: Strategy pattern with a registry mapping node types to generator functions

**Rationale**: The Solution Design (§5.4) specifies a `NodeCodeGenerator` interface. Each node type has its own `validate()` and `emit()` functions. A registry maps `NodeType → NodeCodeGenerator`. This allows adding new node types without modifying the emitter.

**Implementation approach**:

1. Generators are grouped by category in separate files (eventTriggers, dataAccessors, etc.)
2. Each file exports an array of `NodeCodeGenerator` implementations
3. `generators/index.ts` combines all arrays into a `Map<string, NodeCodeGenerator>` registry
4. The emitter iterates nodes in topological order, looks up each generator, calls `emit()`
5. Each `emit()` returns `AnnotatedLine[]` with the node ID for source map construction
