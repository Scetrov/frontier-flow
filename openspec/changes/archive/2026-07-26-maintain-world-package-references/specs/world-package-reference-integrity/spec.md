## ADDED Requirements

### Requirement: Remote World package references are atomic
The system MUST treat each maintained remote target's published package ID, original package ID, Object Registry ID, Server Address Registry ID, source version tag, toolchain version, provenance, verification date, deploy-cache mapping, and checked-in resolution snapshot as one atomic reference bundle. The system MUST NOT activate a bundle assembled from fields belonging to different original package lineages or source versions.

#### Scenario: Complete replacement bundle
- **WHEN** a maintained target changes to a package whose `original-id` differs from the checked-in original package ID
- **THEN** the system requires the package identity, lineage-bound registry IDs, source tag, toolchain metadata, cache mapping, and snapshot to be updated and verified together

#### Scenario: Package upgrade within one lineage
- **WHEN** a maintained target's `published-at` changes while its `original-id` remains unchanged
- **THEN** the system classifies the change as an upgrade and verifies all bundle fields before activating the new published package ID

#### Scenario: Mixed-lineage bundle
- **WHEN** package identity metadata belongs to one original package lineage but a configured registry belongs to another lineage
- **THEN** validation fails and deployment to that target remains unavailable

### Requirement: Maintained target references match verified deployments
The checked-in Stillness bundle MUST describe the replacement package with published and original ID `0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1`, Object Registry `0xf6aed9361acc0d7021672b653ebe9dae45d88e11fecef01cc5434c8f60ae764f`, Server Address Registry `0xdb5f40fd5659e4f21d6b07ed3cedcd532a21a6054815a7b3fe3817631ed6dbd2`, source tag `v0.0.24`, and toolchain version `1.74.0`. The checked-in Utopia bundle MUST remain on its currently verified package lineage and source tag `v0.0.21` unless a later reviewed deployment change is verified atomically.

#### Scenario: Stillness references are loaded
- **WHEN** the application resolves the checked-in `testnet:stillness` target without an upstream drift observation
- **THEN** every package, registry, source, and toolchain field comes from the verified replacement bundle

#### Scenario: Utopia is re-verified without upstream change
- **WHEN** Utopia's upstream `published-at` and `original-id` still match the checked-in bundle
- **THEN** validation accepts its existing package lineage, registries, and `v0.0.21` source pin without replacing them with the newest repository tag

### Requirement: Source provenance matches deployed package identity
Each maintained remote target's `sourceVersionTag` MUST identify a repository revision whose target section contains the same `published-at` and `original-id` as the active bundle. The system MUST NOT select a source tag solely because it is the newest available tag.

#### Scenario: Matching historical source tag
- **WHEN** a historical tag contains publication metadata matching the active target and its deploy-cache snapshot is valid
- **THEN** source-provenance validation accepts that tag even when newer tags exist

#### Scenario: Newest tag has different source
- **WHEN** the newest repository tag does not represent the reviewed source provenance for the deployed package
- **THEN** the system retains the reviewed matching tag and does not silently advance the target

#### Scenario: Pinned tag identity mismatch
- **WHEN** a target's pinned tag contains `Published.toml` identity that differs from the checked-in bundle
- **THEN** validation fails with the target, tag, field, expected value, and actual value

### Requirement: Runtime manifest refresh cannot partially override a bundle
Runtime retrieval of upstream `Published.toml` MUST be observational and MUST NOT merge individual upstream fields into an active checked-in remote bundle. Legacy stored partial overrides MUST be ignored or removed. When an observed target identity differs from the checked-in identity, the system MUST expose stale-reference status and prevent deployment to that target until a complete verified bundle is released.

#### Scenario: Upstream identity matches
- **WHEN** runtime refresh observes package identity and toolchain metadata equal to the checked-in target
- **THEN** the target remains available and its active bundle remains entirely checked in

#### Scenario: Upstream identity drifts
- **WHEN** runtime refresh observes a different `published-at`, `original-id`, or toolchain version for a maintained target
- **THEN** the application marks that target stale, communicates that references require maintenance, and prevents deployment to it

#### Scenario: Runtime refresh is unavailable
- **WHEN** the upstream manifest cannot be retrieved or parsed
- **THEN** the application does not mutate the active bundle and preserves ordinary target readiness checks without claiming that freshness was verified

#### Scenario: Legacy browser override exists
- **WHEN** browser storage contains a version-2 or version-3 partial World package override
- **THEN** the application does not apply that override to any active package-reference bundle

### Requirement: Repository validation detects reference drift
The repository MUST provide one documented command that validates every maintained remote target against current upstream publication metadata, its pinned source tag, deploy-cache configuration and snapshot, and Sui testnet package and registry objects. The command MUST fail closed with actionable target-level diagnostics when data drifts, is malformed, is incomplete, or cannot be verified.

#### Scenario: All validation layers agree
- **WHEN** current manifest identity, source-tag identity, cache artifacts, package existence, registry types, and publication-created registry IDs all match the checked-in target
- **THEN** the command exits successfully and reports the verified upstream revision for that target

#### Scenario: Current manifest differs
- **WHEN** upstream `Published.toml` differs from a checked-in published ID, original ID, or toolchain version
- **THEN** the command exits unsuccessfully and identifies the target and each differing field

#### Scenario: Cache mapping is stale
- **WHEN** a target's deploy-cache mapping or checked-in snapshot does not correspond to its configured source tag
- **THEN** the command exits unsuccessfully and identifies the missing or mismatched cache artifact

#### Scenario: Registry object belongs to another lineage
- **WHEN** Sui testnet reports that a configured registry's Move type is not rooted at the target's `originalWorldPackageId`
- **THEN** the command exits unsuccessfully and reports the configured object, actual type, and expected type

#### Scenario: Replacement registry IDs differ
- **WHEN** the original package publication transaction created the expected registry types at IDs different from the checked-in registry IDs
- **THEN** the command exits unsuccessfully and reports the expected on-chain registry IDs

#### Scenario: Authoritative endpoint is unavailable
- **WHEN** a required GitHub or Sui testnet request remains unavailable after bounded retries
- **THEN** the command exits unsuccessfully and distinguishes an unverifiable endpoint from confirmed metadata drift

### Requirement: Publication manifest parsing fails closed
The system MUST parse the required Stillness and Utopia sections of the generated publication manifest into a typed metadata representation. It MUST reject absent sections, duplicate required keys, malformed package IDs, and sections that provide neither a valid `published-at` nor `original-id`.

#### Scenario: Replacement section is valid
- **WHEN** a target section contains equal valid `published-at` and `original-id` values plus a toolchain version
- **THEN** parsing returns a replacement-lineage metadata record

#### Scenario: Upgrade section is valid
- **WHEN** a target section contains distinct valid `published-at` and `original-id` values plus a toolchain version
- **THEN** parsing returns an upgrade-lineage metadata record preserving both identities

#### Scenario: Required key is duplicated
- **WHEN** a target section repeats a required identity key
- **THEN** parsing fails rather than choosing one value

#### Scenario: Target section is incomplete
- **WHEN** a required maintained target section is absent or has malformed identity metadata
- **THEN** parsing fails with a diagnostic identifying the target and invalid field

### Requirement: Scheduled integrity validation is read-only
The repository MUST run World package reference validation at least weekly and on manual dispatch. The workflow MUST use frozen dependencies, SHA-pinned third-party actions, bounded execution, concurrency control, and no repository write permission, and MUST NOT automatically modify package references in response to mutable upstream data.

#### Scenario: Weekly references remain current
- **WHEN** the scheduled workflow finds every target coherent
- **THEN** it completes successfully and records a concise verification summary

#### Scenario: Weekly drift is detected
- **WHEN** the scheduled workflow detects drift or cannot verify an authoritative endpoint
- **THEN** it fails with remediation-oriented diagnostics and leaves repository contents unchanged

#### Scenario: Maintainer requests immediate validation
- **WHEN** a maintainer invokes the workflow manually
- **THEN** it performs the same validation and permission-constrained behavior as the scheduled run

### Requirement: Maintainers have a complete update runbook
The project documentation MUST explain authority precedence, upgrade-versus-replacement classification, all atomic bundle fields, source-tag selection, on-chain registry discovery, deploy-cache regeneration, verification commands, real-WASM smoke testing, runtime drift behavior, rollback, and scheduled-workflow remediation. Contributor and deployment documentation MUST link to this runbook.

#### Scenario: Maintainer handles a replacement
- **WHEN** upstream changes a target's `original-id`
- **THEN** the runbook directs the maintainer to discover and verify new lineage-bound registries, select matching source provenance, regenerate cache artifacts, and update the whole bundle

#### Scenario: Maintainer handles an upgrade
- **WHEN** upstream changes `published-at` without changing `original-id`
- **THEN** the runbook directs the maintainer to preserve lineage identity while re-verifying registries, source provenance, toolchain metadata, and cache artifacts

#### Scenario: Maintainer rolls back an invalid update
- **WHEN** post-update verification fails
- **THEN** the runbook provides an atomic rollback procedure that keeps the affected target unavailable rather than restoring partial runtime overrides
