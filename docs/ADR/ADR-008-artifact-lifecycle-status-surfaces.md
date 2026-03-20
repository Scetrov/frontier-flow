# ADR 8: Separate Compilation Status from Deployment Lifecycle

## Context

Frontier Flow now produces a richer generated artifact than a raw `.move` source string. A successful pipeline run can emit a deterministic Move package, compile it through the WASM toolchain, retain dependency metadata, and expose post-compile readiness information for downstream deployment work.

Earlier UI iterations allowed deployment-oriented readiness text to piggyback on the same footer surface as compilation. That coupled two distinct lifecycle concerns:

- whether the current graph compiled successfully
- whether the resulting artifact is ready to be deployed to an existing turret

That coupling created misleading states where a compiled artifact looked partially broken because deployment prerequisites were unresolved. It also made the artifact contract harder to reason about because compile success and deployment follow-up were represented as one blended status narrative.

## Decision

We will model compilation and deployment as separate lifecycle channels on the generated artifact.

- `CompilationStatus` remains the state machine for the active build attempt: `idle`, `compiling`, `compiled`, or `error`.
- `GeneratedContractArtifact.compileReadiness` captures whether the generated package is internally ready to hand off to the compiler or adjacent compile-time consumers.
- `GeneratedContractArtifact.deploymentStatus` captures post-compile deployment state for the current target mode.
- Footer and preview UI surfaces must render compilation and deployment as separate indicators, each with its own detail panel or explanatory copy.

The generated artifact is the single source of truth for these lifecycle channels. UI components may derive labels and summaries, but they must not collapse deployment readiness back into compile success.

## Status

Accepted.

## Consequences

Users can distinguish a healthy compile from a blocked deployment handoff without reading ambiguous status text. The artifact contract becomes clearer for tests, persistence, and future deployment workflows because compile and deployment concerns evolve independently.

This adds some surface area to the artifact model and requires coordinated documentation when labels or lifecycle semantics change. Tests covering footer status rendering, preview messaging, and generated artifact helpers must be updated whenever either lifecycle channel changes.
