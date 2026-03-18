# Quickstart: WASM Contract Compilation Pipeline

**Feature**: 006-wasm-compile-pipeline  
**Date**: 2026-03-18

## Prerequisites

- Bun installed (`bun --version` ≥ 1.0)
- Branch `006-wasm-compile-pipeline` checked out
- Dev server running (`bun dev`)

## 1. Install the WASM Compiler Dependency

```bash
bun add @zktx.io/sui-move-builder --exact
```

**Important**: Use `--exact` to pin the version (no `^` or `~`) per SECURITY.md.

## 2. Verify Vite Configuration

If the WASM binary fails to load in dev mode, add to `vite.config.ts`:

```typescript
optimizeDeps: {
  exclude: ["@zktx.io/sui-move-builder"],
},
```

## 3. Run Unit Tests

```bash
# Run all tests
bun run test:run

# Run only compiler tests
bun run test:run -- --reporter=verbose src/__tests__/compiler/

# Run with coverage
bun run test:run -- --coverage
```

## 4. Run E2E Tests

```bash
bun run test:e2e
```

## 5. Key Files

| File                                   | Purpose                                    |
| -------------------------------------- | ------------------------------------------ |
| `src/compiler/pipeline.ts`             | Main compilation orchestrator              |
| `src/compiler/irBuilder.ts`            | React Flow → IR transformer                |
| `src/compiler/validator.ts`            | Graph validation (Phase 2)                 |
| `src/compiler/sanitiser.ts`            | Input sanitisation (Phase 3)               |
| `src/compiler/optimiser.ts`            | AST pruning & gas optimisation (Phase 3.5) |
| `src/compiler/emitter.ts`              | IR → Move source code (Phase 4)            |
| `src/compiler/errorParser.ts`          | Move compiler error → diagnostic mapper    |
| `src/compiler/moveCompiler.ts`         | WASM wrapper (lazy-load + compile)         |
| `src/compiler/generators/`             | Per-node-type code generators              |
| `src/hooks/useAutoCompile.ts`          | Auto-compile on idle hook                  |
| `src/components/CompilationStatus.tsx` | Footer status indicator                    |

## 6. Manual Testing Checklist

1. Open the app → verify footer shows "Idle" with blue dot
2. Wait for idle timer → verify status transitions to "Compiling" then "Compiled" (green)
3. Add a disconnected node → verify status shows "Error" with red dot and warning about disconnected node
4. Click "Build" in header → verify compilation triggers immediately
5. During compilation, add a node → verify compilation restarts (status briefly returns to "Idle")
6. Remove all nodes → verify "Error" with "no entry point" message
