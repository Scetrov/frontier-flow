# ADR 9: Separate Authoring Compilation from Deploy-Grade Dependency Resolution

## Context

ADR 3 established `@zktx.io/sui-move-builder/lite` as Frontier Flow's primary and only compilation path. That decision was correct for the original problem: generate and compile user-authored Move packages in the browser without introducing backend infrastructure or sending contract code to a server.

Remote deployment against live EVE Frontier `world` packages introduces a narrower but more demanding requirement than ordinary authoring-time compilation. A deployable extension must be compiled against the actual dependency graph of the target `world` package, not against a local approximation.

Frontier Flow currently does not meet that requirement.

The browser compiler path uses a local shim package defined in `src/compiler/worldShim.ts` for normal compilation. During remote deployment, `src/deployment/publishRemote.ts` rebuilds the extension package, keeps `world` as a local dependency, and injects a generated `deps/world/Published.toml` pointing at the target network's deployed package id.

This design is insufficient for deploy-grade dependency resolution:

- the dependency is still resolved as local source rather than as a real upstream package graph
- the current browser compile invocation passes only in-memory files, `network`, and `silenceWarnings`
- the compile path does not currently pass `Move.lock`, `rootGit`, or `resolvedDependencies`, which are the builder inputs intended for deterministic dependency resolution
- the resulting artifact can compile without actually linking the live `world` package, leading to publish-time verification failure

The missing inputs are not all the same kind of artifact, and they are not obtained from the same place.

- `Move.lock` is an upstream repository artifact. In the `world-contracts` repository it is available directly at `contracts/world/Move.lock`, alongside `contracts/world/Move.toml` and the package source tree.
- `rootGit` is not a file stored in the repository. It is builder input metadata derived from the known source identity of the root package: git URL, revision, and package subdirectory. For `world-contracts`, that means values equivalent to the repository URL, a pinned branch/tag/commit, and `contracts/world` as the subdirectory.
- `resolvedDependencies` is not checked into `world-contracts` and is not fetched as a static artifact. It is generated locally by the builder's dependency-resolution phase after Frontier Flow has assembled the root package files and provided enough source identity for the builder to resolve the package graph.

In practical terms, `world-contracts` provides enough information to identify the upstream package and supply its checked-in lockfile, but Frontier Flow must still derive `rootGit` and invoke the builder to generate `resolvedDependencies`.

Frontier Flow does already maintain useful target metadata in `src/data/packageReferences.ts`, including `worldPackageId`, `objectRegistryId`, and `serverAddressRegistryId`. That is sufficient for validation and runtime context, but not sufficient to reconstruct the compile-time dependency graph for a live `world` deployment.

The architecture therefore needs to distinguish two compilation concerns that were previously treated as one:

- authoring-time compilation for rapid in-browser feedback
- deploy-grade compilation for producing bytecode that is valid against the live target dependency graph

## Decision

We will keep in-browser WASM compilation as the primary authoring-time compilation path, but we will no longer treat the current browser-only shim-based path as sufficient for deploy-grade remote compilation.

Specifically:

- The local `world` shim remains acceptable for authoring-time generation and lightweight browser compilation.
- Remote deployment must not rely on `Published.toml` injected into a local shim package as the mechanism for resolving the live `world` dependency.
- Deploy-grade compilation must use a real dependency-resolution path that can reproduce the target `world` package graph.
- The preferred first implementation is a deploy-only source-resolved path using the actual upstream `world` package identity and lockfile inputs, including `Move.lock`, and where needed `rootGit` or `resolvedDependencies`.
- If the browser-based WASM toolchain cannot reliably compile the required upstream `world` revision, Frontier Flow will introduce a deploy-only server-assisted compilation path rather than continuing to force remote deployment through the shim-based browser path.

The expected artifact flow for that preferred path is:

- Frontier Flow fetches or assembles the upstream `world` package files, including `Move.toml`, `Move.lock`, and source files, from the pinned repository revision.
- Frontier Flow derives `rootGit` from that pinned repository identity rather than expecting it to exist as a checked-in file.
- Frontier Flow invokes the builder's dependency-resolution phase to produce `resolvedDependencies` for the selected target network.
- Frontier Flow reuses that generated `resolvedDependencies` during deploy-grade compilation so the published extension is built against the real dependency graph rather than the local shim.

This ADR refines ADR 3 rather than replacing it wholesale:

- ADR 3 remains in force for authoring-time compilation.
- ADR 3 no longer implies that browser-only compilation is the only acceptable path for deploy-grade remote deployment.

## Status

Accepted.

## Related Documents

- [ADR-003: In-Browser WASM Compilation via sui-move-builder](ADR-003-wasm-compiler.md) — refined, not replaced, by this ADR
- [Remote Deployment Dependency Resolution](../REMOTE-DEPLOYMENT-DEPENDENCY-RESOLUTION.md) — detailed analysis motivating this decision

## Consequences

Frontier Flow keeps the core benefits of the current browser compiler path for day-to-day authoring: fast feedback, no backend dependency for ordinary compilation, and no need to send user-authored code off-device during editing.

At the same time, the architecture becomes more honest about what remote deployment requires. Deploying against a live `world` package is a dependency-resolution problem, not merely a package-id substitution problem. The current shim-based approach can no longer be treated as equivalent to a real published dependency link.

This decision adds architectural complexity. Frontier Flow must now support two closely related but distinct compilation modes: a lightweight authoring path and a stricter deploy-grade path. The system also needs a richer metadata contract for target `world` references, including source identity and lockfile-aware resolution inputs, not just deployed package ids and object registry ids.

It also requires clearer provenance for build artifacts. The project must distinguish between:

- upstream checked-in artifacts, such as `Move.toml` and `Move.lock`
- derived builder inputs, such as `rootGit`
- generated resolution outputs, such as `resolvedDependencies`

That distinction matters because failures can occur at each layer for different reasons: stale upstream metadata, incorrect pinned source identity, or incompatible dependency-resolution output.

If the browser builder proves capable of source-resolved deploy-grade compilation once richer inputs are provided, Frontier Flow can preserve a fully client-side deployment experience. If not, the project will need a server-assisted build path for remote deploys, which introduces infrastructure, trust-boundary, provenance, and operational concerns that ADR 3 originally deferred.

The immediate product consequence is that remote deployment UX must surface dependency-resolution failures explicitly rather than framing them as generic wallet or RPC failures. The current user-facing error messaging already moves in this direction by reporting browser compiler dependency-linking limitations directly.

The immediate engineering consequence is that future work should focus on:

- introducing a real deploy-grade dependency-resolution model for `world`
- evaluating whether `Move.lock` plus upstream source identity is sufficient in-browser
- falling back to a server-assisted deploy compiler only if the richer browser path still fails
