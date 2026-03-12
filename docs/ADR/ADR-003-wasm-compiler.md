# ADR 3: In-Browser WASM Compilation via sui-move-builder

## Context

Frontier Flow generates Sui Move source code from a visual node graph. This source code must be compiled into bytecode modules before it can be published to the Sui blockchain. There are three viable approaches for performing this compilation.

A server-side compiler would run the full `sui move build` toolchain on a backend service. This approach is reliable and unconstrained by browser memory limits, but it requires deploying and maintaining backend infrastructure, introduces network latency during iterative development, and means user-authored smart contract code must leave the browser — creating a data exfiltration vector.

An in-browser WASM compiler executes the Move compiler entirely within the user's browser via WebAssembly. This eliminates infrastructure costs and network round-trips, and ensures that code never leaves the client. The tradeoff is exposure to browser memory limits, dependency on a third-party WASM binary, and limited diagnostic output compared to the native compiler.

A hybrid approach would use WASM as the primary path with a server-side fallback for failure cases. This offers the best reliability, but adds substantial complexity in maintaining two compilation paths and managing the routing logic between them.

The `@zktx.io/sui-move-builder` package is an established WASM wrapping of the official Move compiler, used by other tools in the Sui ecosystem. It provides a `/lite` entrypoint optimised for in-browser use.

## Decision

We will use `@zktx.io/sui-move-builder/lite` for in-browser WASM compilation as the primary and only compilation path. We will lazy-load the WASM bundle to minimise initial page load impact. We will pin the dependency to an exact version and verify the WASM binary checksum against a known-good hash before execution. A server-side fallback is deferred to a future iteration, to be reconsidered if browser compilation failures exceed an acceptable threshold.

## Status

Accepted.

## Consequences

The application remains a fully serverless static SPA that can be deployed to Netlify without any backend infrastructure. User-authored smart contract code never leaves the browser, which eliminates an entire class of privacy and data security concerns. Compilation latency is minimal because there is no network round-trip.

The WASM binary is a third-party supply chain dependency. A compromised package version could inject malicious bytecode into compiled modules, which is tracked as risk R-11 in the Risk Register. Browser memory constraints may limit the complexity of graphs that can be compiled, tracked as R-14. When compilation fails, the Move compiler produces raw error output referencing source line numbers — this output must be intercepted and mapped back to originating canvas nodes, which is tracked as R-16. The compiler error traceability pipeline described in the Solution Design is the primary mitigation for this last consequence.
