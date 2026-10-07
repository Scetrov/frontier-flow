# Disposable Sui gRPC validator

This migration replaces maintained JSON-RPC calls only. GraphQL and the separate
Walrus testnet configuration remain unchanged. Never use a remote signed write as
a substitute for local verification.

## Compatibility-spike environment

Verified: Podman 6.1.2; Sui CLI `1.68.0-16bf4d124ac5`; SDK `2.35.0`.
The CLI binary used in the spike has SHA256
`c4afd3b878531ea5c99f5c1b8db68fa65bbbfc1adfe765414553b7488f4371b9`.
This is an observed local artifact hash, not a claim of an upstream signature.
Use a reviewed CLI binary and verify its hash before mounting it.

```sh
SUI_BIN=/home/scetrov/.local/bin/sui
printf '%s  %s\n' c4afd3b878531ea5c99f5c1b8db68fa65bbbfc1adfe765414553b7488f4371b9 "$SUI_BIN" | sha256sum --check
podman run -d --name frontier-grpc-spike --pull=never \
  -p 127.0.0.1:19000:9000 \
  -v "$SUI_BIN:/usr/local/bin/sui:ro" \
  -e HOME=/tmp -e RUST_LOG=error \
  docker.io/library/node@sha256:05c08ce4291e9a58f59456a7985176defb12cdd42271f35ff81a3e167ea61d4c \
  sui start --force-regenesis --committee-size 1 --fullnode-rpc-port 9000
# Run bounded gRPC probes against http://127.0.0.1:19000.
# Always clean up, including after unsuccessful verification:
podman rm -f frontier-grpc-spike
```

The digest-pinned image must be present locally (`--pull=never`), or explicitly
pulled by the same fully qualified digest. No host keystore, host HOME, persistent
volume or real signing key is mounted. Genesis/state are disposable. Do not run
`--force-regenesis` against the developer's persistent network directory.

The fullnode provides gRPC StateService, LedgerService, MovePackageService and
TransactionExecutionService on its RPC port. The bounded spike verified balance,
owned-object listing, package content, datatype identity, genesis effects/events,
and read-only simulation return bytes without a PostgreSQL indexer. It did not
prove extension-specific mutation/authorization parity; that remains a separate
integration gate using test-only local keys.

## Verified application dependencies

Direct packages pinned for this migration, with registry integrity retained in `bun.lock`:

- `@mysten/sui` 2.35.0
- `@mysten/dapp-kit-react` 2.1.39
- `@mysten/dapp-kit-core` 1.6.37
- `@mysten/wallet-standard` 0.21.33
- `@mysten/walrus` 1.2.34

Legacy `@mysten/dapp-kit` is not an application dependency. The wallet kit instance and chain identifiers stay stable across local endpoint edits. Endpoint-aware clients are resolved per operation. A stored legacy `frontier-flow:sui-wallet` session is not reused; the UI asks the operator to reconnect. Reconnect does not delete graphs or authorize signing.

## Operation mapping

JSON-RPC balance, object/package reads, publication, confirmation, authorization execution, and simulation execution use `SuiGrpcClient`. Existing GraphQL discovery, ownership, simulation suggestions, and package-reference verification stay on GraphQL. Walrus graph transfer stays on its own testnet gRPC client and must be signed with `network: "testnet"`, not the selected local deployment target.

Maintained diagnostic scripts use `scripts/lib/suiGrpcDiagnostic.ts`. They are not a JSON-RPC fallback. Do not point them at the retired public JSON-RPC root.

## Rollback

A rollback to the previous release does not restore retired public JSON-RPC. Preserve graphs and package bundles. Disable network-dependent actions rather than describing rollback as restoring Sui service.

## Deployed-origin read-only smoke

The documented site origin is `https://frontier-flow.scetrov.live/`. On 2026-10-07 a
Chromium page loaded that origin (HTTP 200) and issued a real read-only
`GetBalance` for `0x1` to `https://fullnode.testnet.sui.io`. The browser response
was gRPC-web with `grpc-status: 0` and the same SUI balance as a direct SDK read.
No signature or submission was sent. `scripts/sui-grpc-readonly-smoke.mjs` remains
an opt-in node probe; a node probe is not this browser-origin result.

## Deployed browser access

Production local gRPC access is scoped to `localhost` and `127.0.0.1` using
HTTP/HTTPS on configured ports. Non-loopback production endpoints require a
reviewed explicit CSP allowlist; development retains configurable hosts. Do not
add broad `http:`/`https:` permissions. Chromium may require the site's local
network access permission; denial is an unavailable-service condition, not a zero
balance. Do not disable browser security features to make verification pass.

## Deterministic outage fixtures

`tests/fixtures/sui-grpc-responder.mjs` provides a loopback-only HTTP responder
with an explicit allowed browser origin and three modes: `success`, `unavailable`
(HTTP 503), and `rejected-preflight` (OPTIONS 403 without CORS approval). It rejects
legacy JSON-RPC envelopes and unexpected root/service paths. Always close its
server in a `finally` block. Its success body is a real gRPC-web/protobuf balance
response for 12.5 SUI, not a mocked hook.

```sh
node --test tests/fixtures/sui-grpc-responder.node-test.mjs
```

These fixture checks are not proof of browser preflight enforcement. Browser
integration must use real cross-origin requests and production-equivalent CSP;
fulfilling OPTIONS/POST through Playwright routes is insufficient. Live browser
verification is opt-in, bounded and read-only. Record unavailable verification as
unsuccessful, never replace it with a fixture pass.

## Isolated mutation parity

A disposable container on `127.0.0.1:9000` with an ephemeral faucet key verified
application publication, `confirmPublishedPackageWithClient`, signed authorization
effects/events, and native `vector<u8>` simulation. Newly created objects and
transactions were not immediately visible; authorization effect reads poll until
their deadline. The application still rejects local-target simulation before any
request. That run is not EVE world-package authorization and not a remote write.
