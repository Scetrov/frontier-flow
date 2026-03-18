# Quickstart: Graph To Move Generation

## Goal

Validate that a supported graph generates a real Move package and compiles through the in-browser WASM Sui Move compiler.

## Prerequisites

- Bun dependencies installed
- Browser environment capable of loading the WASM compiler
- Existing sample graph fixtures available in the repository

## Happy Path

1. Start the app with `bun run dev`.
2. Open the default supported graph or load a supported fixture graph.
3. Wait for auto-compile or trigger the manual build action.
4. Confirm the code preview shows emitted Move source for the active graph.
5. Confirm compilation completes against the generated package, not a placeholder artifact.
6. Verify the footer/build status reflects success and no blocking diagnostics are present.

## Unsupported Graph Path

1. Modify the graph so it contains an unsupported node type or missing required input.
2. Trigger a build.
3. Confirm the pipeline stops before successful compilation.
4. Confirm diagnostics identify the blocking graph element and explain why generation cannot continue.

## Test Execution

1. Run unit tests covering `src/compiler/` and generator fixtures.
2. Run integration tests covering full graph-to-Move pipeline behavior with mocked WASM compilation.
3. Run Playwright coverage for manual build, preview, and diagnostics surfacing.

## Expected Evidence

- Golden Move output for supported graph fixtures
- Structured diagnostics for unsupported graph fixtures
- Successful mocked or real WASM compile result tied to the generated artifact
- Stable output across repeated builds of the same graph
