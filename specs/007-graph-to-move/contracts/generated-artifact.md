# Contract: Generated Move Artifact

## Purpose

Define the package boundary for the real contract output consumed by the WASM Sui Move compiler.

## Artifact Shape

### Required Files

- `Move.toml`: package manifest for the generated contract
- `sources/<module-name>.move`: emitted Move source file for the active canvas graph

### Required Metadata

- `moduleName`: sanitized contract module name
- `sourceMap`: ordered trace records linking generated lines to graph nodes
- `dependencies`: compiler-reported package dependencies after successful compilation
- `bytecodeModules`: compiled bytecode modules after successful compilation

## Invariants

- The artifact must be complete enough for `@zktx.io/sui-move-builder/lite` to build as a package
- The same graph input must produce byte-for-byte identical `Move.toml` and Move source output
- Artifact emission must not proceed when blocking validation diagnostics are present
- Artifact contents must derive only from sanitized graph data and registered mapping rules

## Failure Modes

### No Artifact Emitted

Occurs when:
- the graph lacks a valid entry path
- a node type has no approved Move mapping rule
- required graph connections or fields are missing
- execution order cannot be resolved safely

### Artifact Emitted, Compile Failed

Occurs when:
- generated Move violates compiler rules despite passing pre-compile validation
- package dependencies or source structure are insufficient for successful WASM compilation
- browser/WASM compilation fails for runtime reasons

## Consumer Expectations

- Preview UI reads `moveSource` from the artifact
- Diagnostics UI reads `sourceMap` to map compiler lines back to graph nodes
- Build status UI uses the presence of compiled bytecode modules to determine successful compilation
- Future deployment logic may consume `bytecodeModules` without needing to reconstruct the package
