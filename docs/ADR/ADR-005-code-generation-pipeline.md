# ADR 5: Multi-Phase Code Generation Pipeline

## Context

The core value proposition of Frontier Flow is transforming a visual node graph into valid Sui Move source code. This transformation is inherently complex. Not all graph topologies represent valid programs — disconnected subgraphs, missing required inputs, and cyclic dependencies must be caught before any code is emitted. User-supplied node labels are interpolated into the generated output, creating an injection risk if sanitisation is not enforced. The generated code must be gas-efficient on the Sui VM, where every opcode costs real tokens. And when the WASM compiler produces errors, those errors reference Move source line numbers that mean nothing to a non-technical user — they must be traced back to specific nodes on the canvas.

A single-pass "template string" generator would conflate graph traversal, validation, input sanitisation, optimisation, and code emission into one monolithic function. This makes each concern difficult to test independently, creates opportunities for sanitisation to be accidentally bypassed by changes to the emitter, and makes the optimisation logic inextricable from the output formatting.

## Decision

We will implement a multi-phase compilation pipeline with clear boundaries between each phase. Phase 1 transforms the React Flow graph into a normalized Intermediate Representation. Phase 2 runs constraint validation against the IR, checking for graph completeness, type safety, and topological soundness. Phase 3 enforces input sanitisation, validating all user-supplied values against a strict alphanumeric allowlist before they can reach the emitter. Phase 3.5 performs AST pruning and gas optimisation — dead branch elimination, redundant vector folding, and constant propagation — operating entirely on the IR without modifying the emitter logic. Phase 4 emits the final Move source code from the validated and optimised IR, annotating each output line with `@ff-node:` comments that map back to originating node IDs for error traceability.

The IR serves as the stable interface between phases. Each phase receives the IR as input and either transforms it, validates it, or emits code from it.

## Status

Accepted.

## Consequences

Each phase has a single responsibility and can be independently unit-tested. The IR provides a stable interface that allows changes to one phase without affecting others — for example, adding a new optimisation pass in Phase 3.5 requires no changes to the emitter. Input sanitisation is a discrete, mandatory phase that cannot be accidentally bypassed by modifications to the code generation templates. The source map annotations produced by the emitter enable the compiler error traceability pipeline, which is critical for making Move compiler diagnostics accessible to non-technical users.

The multi-phase design produces more code than a single-pass generator. The IR definition becomes a critical shared interface; changes to its structure require updates across multiple phases. The AST optimisation passes introduce a risk that aggressive transformations could inadvertently alter the semantic meaning of the generated contract. This specific risk is tracked as R-03 in the Risk Register, and is mitigated by snapshot tests that compare optimised versus unoptimised output and by individual disable flags on each optimisation pass for debugging.
