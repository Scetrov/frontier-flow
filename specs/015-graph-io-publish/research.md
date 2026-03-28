# 1. Research: Graph Import, Export, and Publish

**Feature**: 015-graph-io-publish  
**Date**: 2026-03-28

## 1.1. R1. Portable Graph Document Shape

**Decision**: Represent one saved contract as one versioned portable YAML document containing contract metadata plus the graph snapshot.

**Rationale**: The existing contract library already treats each saved graph as a discrete `NamedFlowContract`. Exporting the active contract as a single document preserves that mental model, keeps the file portable, and avoids leaking unrelated local-library state into the interchange format.

**Alternatives considered**:

- Export the full contract library in one document — rejected because the user asked for graph-level transfer, not library backup semantics.
- Export raw React Flow JSON without a Frontier Flow envelope — rejected because versioning and validation would be weaker.

## 1.2. R2. YAML Codec Strategy

**Decision**: Use the `yaml` package for serialization and parsing, then validate the parsed result against explicit TypeScript-friendly schema guards.

**Rationale**: YAML is a user-visible interchange format, but the app still needs predictable parsing and stable output. A dedicated YAML package keeps encoding/decoding logic simple while the validation layer enforces strict shape checks before the graph enters the contract library.

**Alternatives considered**:

- Manual YAML string generation and parsing — rejected as fragile and difficult to maintain.
- JSON export with a `.yaml` wrapper or front matter — rejected because it does not satisfy the requested format cleanly.

## 1.3. R3. Walrus Browser Integration

**Decision**: Use the official `@mysten/walrus` TypeScript SDK with `@mysten/sui`, and configure an explicit WASM URL for Vite/browser execution.

**Rationale**: `@mysten/walrus` is the official Mysten SDK package, includes direct blob read/write APIs, and documents the client-side Vite WASM-loading requirement. This matches the project stack and avoids inventing a custom HTTP client around Walrus internals.

**Alternatives considered**:

- A custom fetch wrapper over undocumented Walrus endpoints — rejected because it would duplicate SDK behavior and increase maintenance risk.
- A server-side publisher service — rejected because this repo is currently browser-only and the feature spec does not require backend infrastructure.

## 1.4. R4. Walrus Storage Shape

**Decision**: Store the portable graph YAML as a single Walrus blob using `writeBlob` and read it back with `readBlob`.

**Rationale**: The exported graph is one document, so direct blob APIs are the simplest mapping. Walrus file/quilt abstractions are useful for multi-file payloads, but they would add complexity with no benefit for a single graph document.

**Alternatives considered**:

- `writeFiles` with a quilt containing a single YAML file — rejected as unnecessary abstraction overhead.
- Storing separate metadata and graph blobs — rejected because one self-contained document is easier to validate and share.

## 1.5. R5. Publish UX Under Browser Wallet Constraints

**Decision**: Design publish as an explicit user-driven flow with visible stages and action boundaries rather than as a hidden background operation.

**Rationale**: Walrus browser uploads can involve many requests, and the SDK documents that wallet popups may be blocked unless certain signing steps occur directly from user interactions. A dedicated dialog/stepper is the safest UX surface for publish while keeping the entry point under the existing Save controls.

**Alternatives considered**:

- A single background publish button with silent progress — rejected because it hides transaction boundaries and increases popup-block risk.
- A full-page publish experience outside the drawer — rejected because the feature should stay integrated with existing save controls.

## 1.6. R6. Local Contract Library Remains Authoritative

**Decision**: Keep the local saved-contract library as the editable source of truth. Import creates local contract entries; publish adds Walrus provenance to the active entry but does not convert the app into a Walrus-backed editor.

**Rationale**: The current application already auto-saves locally and depends on the contract library for active graph switching. Preserving that architecture minimizes regression risk and keeps Walrus focused on transfer and sharing.

**Alternatives considered**:

- Treat Walrus as the canonical storage backend after publish — rejected because it would broaden the feature into remote-sync architecture.
- Replace local contracts on import automatically — rejected because the spec prioritizes safe, non-destructive behavior.
