## Context

Remote deployment uses a `PackageReferenceBundle` that combines package identity, registry object IDs, source provenance, toolchain metadata, and deploy-grade cache selection. These fields form one compatibility boundary: a registry created by one original package lineage cannot safely be passed to entry points compiled against another lineage.

The checked-in Stillness bundle describes the former upgraded lineage (`published-at` `0xd2fd…4780`, `original-id` `0x28b4…448c`, source `v0.0.23`). Upstream now publishes a replacement Stillness lineage whose `published-at` and `original-id` are both `0x8b8a…1aa1`. The replacement publication created new Object Registry and Server Address Registry objects. Utopia remains unchanged as an upgrade (`published-at` `0x07e6…4bd1`, `original-id` `0xd12a…3f75`).

The browser currently fetches upstream `Published.toml` daily and overlays package identity and toolchain fields onto the checked-in bundle. Because `Published.toml` does not contain registry IDs or source-tag provenance, this can create a split bundle: new package identity with old registries, source, and cache.

Constraints include browser execution, deterministic checked-in deploy-grade snapshots, strict TypeScript, no implicit trust in mutable upstream data, least-privilege GitHub Actions, and the need to preserve local-validator configuration behavior.

## Goals / Non-Goals

**Goals:**

- Make every remote package-reference bundle internally coherent and update it atomically.
- Migrate Stillness to the verified replacement lineage while preserving the still-current Utopia lineage.
- Ensure mutable runtime observations cannot silently override part of an active bundle.
- Provide one reproducible command that validates manifest identity, source provenance, cache mapping, and on-chain registry coherence.
- Run that command weekly and manually in a read-only, supply-chain-conscious GitHub Actions workflow.
- Give maintainers a complete update and rollback runbook.

**Non-Goals:**

- Automatically commit or open pull requests when upstream changes.
- Always compile against the newest `world-contracts` tag; the source tag must correspond to the deployed target package.
- Discover or configure arbitrary networks beyond Stillness and Utopia.
- Replace normal deployment checks or the real-WASM integration suite.
- Change local-validator package configuration or local environment storage.
- Treat the EVE resource documentation as the sole source of truth when it conflicts with on-chain and published-package evidence.

## Decisions

### 1. Treat the remote reference bundle as an atomic configuration unit

A maintained remote target consists of:

- `worldPackageId` from `published-at`;
- `originalWorldPackageId` from `original-id`;
- `objectRegistryId`;
- `serverAddressRegistryId`;
- `sourceVersionTag`;
- `toolchainVersion`;
- provenance and verification date;
- one matching deploy-cache target mapping and checked-in snapshot.

A target update changes and validates these fields together. For an upgrade, `original-id` remains stable while `published-at` changes. For a replacement, `original-id` changes, so lineage-bound registry IDs must also be replaced.

**Alternative considered:** Update only IDs present in `Published.toml`. Rejected because the manifest omits registry IDs and source provenance, allowing an invalid mixed-lineage bundle.

### 2. Pin Stillness to the source tree corresponding to its publication

Stillness will use:

- `worldPackageId` and `originalWorldPackageId`: `0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1`;
- `objectRegistryId`: `0xf6aed9361acc0d7021672b653ebe9dae45d88e11fecef01cc5434c8f60ae764f`;
- `serverAddressRegistryId`: `0xdb5f40fd5659e4f21d6b07ed3cedcd532a21a6054815a7b3fe3817631ed6dbd2`;
- `sourceVersionTag`: `v0.0.24`;
- `toolchainVersion`: `1.74.0`.

The replacement publication commit and tags `v0.0.24` and `v0.0.25` contain the same complete `contracts/world` tree. The earliest matching release tag, `v0.0.24`, is selected. Newer tags such as `v0.0.30` and `v0.0.31` retain the same publication metadata but contain a different world source tree, so “latest tag” is not valid deployment provenance.

Utopia remains on its current package identity, registries, `v0.0.21` source, and `1.68.0` toolchain after validation.

**Alternative considered:** Pin every target to the newest repository tag. Rejected because repository evolution can diverge from code used to publish an existing on-chain package.

### 3. Make checked-in references authoritative at runtime

The application may continue fetching current upstream publication metadata as an observation, but it will not merge partial remote metadata into `PackageReferenceBundle`. The checked-in bundle remains the only active remote deployment configuration.

When an observation differs from the checked-in `published-at`, `original-id`, or toolchain metadata, the application records a drift state, presents the target as stale, and prevents deployment to that target. Fetch failure does not mutate the bundle; existing explicit package-existence and network checks continue to determine ordinary connectivity readiness.

Stored version-2/version-3 package override data will no longer be applied. Migration removes or ignores those legacy records so an existing browser cannot preserve a partial override after release.

**Alternatives considered:**

- Keep the current partial override. Rejected because it is not atomic.
- Dynamically reconstruct the complete bundle. Rejected for this change because registry discovery requires on-chain inspection and source-tag selection remains a reviewed provenance decision.
- Remove runtime fetching entirely. Rejected because immediate drift visibility is useful between weekly CI runs.

### 4. Share strict publication parsing and validation logic

A small typed module will parse only the required `Published.toml` target sections and reject missing sections, duplicate keys, malformed IDs, or absent identity fields. Application drift observation and repository validation will use the same normalized metadata model, with parser tests covering replacement, upgrade, malformed, and partial manifests.

No new TOML dependency is required for the narrow generated format. The parser remains data-only and does not evaluate upstream content.

**Alternative considered:** Add a general TOML package. Rejected because the required format is narrow and adding a dependency expands the supply-chain surface. If upstream changes the format beyond the tested subset, validation should fail closed and prompt an explicit parser review.

### 5. Provide layered repository integrity validation

A Bun script exposed as `check:world-package-references` will validate each maintained remote target in four layers:

1. **Current manifest:** checked-in `worldPackageId`, `originalWorldPackageId`, and toolchain match the target section on upstream `main`.
2. **Source provenance:** the target's pinned tag contains matching publication metadata.
3. **Cache alignment:** `scripts/deploy-cache-packages.json` maps the target to the same `sourceVersionTag`, its expected snapshot exists, and existing snapshot validation accepts it.
4. **On-chain coherence:** Sui testnet contains the configured package and registry objects; each registry has the expected type under `originalWorldPackageId`. The original package publication transaction's created objects identify the expected Object Registry and Server Address Registry, allowing replacements to produce an actionable ID diff.

The script uses fixed HTTPS hosts, bounded request timeouts, bounded retries for transient failures, structural response validation, and non-zero exit status for drift or unverifiable state. It prints target/field-level expected and actual values without credentials. Network access is abstracted so tests use deterministic fixtures.

**Alternative considered:** Compare only `published-at`. Rejected because it would miss stale original identity, source, cache, and registry configuration.

### 6. Keep scheduled automation read-only and non-mutating

A dedicated weekly workflow will also support `workflow_dispatch`. It will:

- grant only `contents: read`;
- use SHA-pinned checkout and Bun setup actions consistent with existing workflows;
- install with the frozen lockfile;
- run the shared validation command with a timeout;
- use concurrency cancellation;
- write actionable results to the job summary;
- never commit, push, or open an issue automatically.

A failed run is an alert requiring the documented reviewed update procedure. Avoiding write permission prevents mutable upstream data from directly changing trusted repository configuration.

### 7. Document authority and procedure explicitly

A new `docs/WORLD-PACKAGE-REFERENCE-RUNBOOK.md` will define:

- upgrade versus replacement classification;
- `Published.toml` as package-identity authority;
- matching tags as source provenance;
- Sui testnet as registry-object authority;
- the EVE resource page as corroborating, potentially lagging documentation;
- atomic edit, cache generation, validation, real-WASM smoke test, and rollback steps;
- legacy browser observation cleanup and weekly workflow remediation.

`README.md`, `docs/DEPLOYMENT.md`, and `docs/REMOTE-DEPLOYMENT-DEPENDENCY-RESOLUTION.md` will link to the runbook. The dependency-resolution document will be corrected to distinguish observed manifest metadata from active checked-in references.

## Risks / Trade-offs

- **[External GitHub or Sui endpoint outage causes a scheduled failure]** → Use bounded retries and precise “unreachable” diagnostics; do not treat inability to verify as success.
- **[Upstream changes the generated TOML shape]** → Fail closed with parser diagnostics and fixture coverage rather than guessing.
- **[Weekly cadence leaves up to seven days between upstream change and CI detection]** → Retain runtime drift observation and manual workflow dispatch; deployment blocks when observed identity differs.
- **[A stale observation remains in browser storage]** → Version or remove the legacy override record and test migration from stored versions 2 and 3.
- **[On-chain schema/API evolution breaks validation]** → Isolate GraphQL queries and response parsing, test fixtures, and document endpoint failures separately from identity mismatch.
- **[Source tag can be moved upstream]** → Verify publication metadata and cache consistency on every run; report the resolved upstream revision in validation output. A future hardening change may pin a commit SHA in addition to the human-readable tag.
- **[Blocking a stale target temporarily reduces availability]** → Prefer an explicit unavailable target over compiling or signing against mixed package lineages.

## Migration Plan

1. Add strict manifest parsing, drift representation, and deterministic tests without changing the active bundles.
2. Replace the Stillness bundle atomically and stop applying legacy partial overrides.
3. Change the Stillness cache mapping to `v0.0.24`, regenerate the snapshot, and validate cache loading.
4. Add the repository integrity command and verify both targets against upstream and Sui testnet.
5. Add runtime stale-target presentation/blocking and migration tests for existing browser storage.
6. Add the weekly workflow and operator documentation.
7. Run lint, type checking, unit tests, production build, and the real-WASM integration check before release.

Rollback reverts the bundle, cache manifest, generated snapshot, and runtime behavior as one commit. Because upstream drift may then remain, rollback must explicitly disable the affected remote target rather than restoring partial runtime overrides.

## Open Questions

None required before implementation. The source and registry values above were verified during exploration; implementation should repeat the scripted upstream and on-chain checks before committing generated artifacts.
