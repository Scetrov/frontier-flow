# World Package Reference Maintenance Runbook

> **Status:** Active
> **Last updated:** 2026-07-26

This runbook explains how to maintain Frontier Flow's checked-in World package references for remote deployment targets (Stillness and Utopia). It covers authority precedence, change classification, atomic update steps, on-chain verification, and rollback.

## Table of Contents

1. [Authority Precedence](#1-authority-precedence)
2. [Change Classification](#2-change-classification)
3. [Atomic Bundle Fields](#3-atomic-bundle-fields)
4. [Source Tag Selection](#4-source-tag-selection)
5. [On-Chain Registry Discovery](#5-on-chain-registry-discovery)
6. [Deploy-Cache Regeneration](#6-deploy-cache-regeneration)
7. [Validation](#7-validation)
8. [Real-WASM Testing](#8-real-wasm-testing)
9. [Rollback](#9-rollback)
10. [Browser-State Migration](#10-browser-state-migration)
11. [Scheduled Failure Remediation](#11-scheduled-failure-remediation)

---

## 1. Authority Precedence

When determining the correct configuration for a maintained remote target, consult these data sources in the following order:

| Priority | Source | Authority for |
|----------|--------|---------------|
| 1 | Published `Published.toml` | Package identity (`published-at`, `original-id`) |
| 2 | Sui testnet GraphQL | Registry objects, registry types, registry lineage |
| 3 | Matching repository tags in `world-contracts` | Source provenance (source tag) |
| 4 | EVE Resource documentation | Corroborating information (may lag) |

**Key principle:** The checked-in `PackageReferenceBundle` in `src/data/packageReferences.ts` is the single source of truth for the active configuration. Remote `Published.toml` data is observational only and must not be partially merged into the active bundle.

---

## 2. Change Classification

Every upstream change falls into one of two categories:

### Upgrade (same lineage)

- `published-at` changes
- `original-id` remains **the same**
- The existing Object Registry and Server Address Registry objects remain valid
- Example: A new version of the world package is published under the same original package

### Replacement (new lineage)

- `published-at` **and** `original-id` both change (or `published-at` equals `original-id` for a replacement)
- The existing registry objects are **no longer valid** — they belong to the old lineage
- New registry objects must be discovered from the replacement publication
- Example: The world package was completely replaced with a new lineage

**How to determine:** Compare the checked-in `originalWorldPackageId` with the observed `original-id` from upstream. If they differ, it is a **replacement**. If they match but `published-at` changed, it is an **upgrade**.

---

## 3. Atomic Bundle Fields

A maintained remote target is an **atomic reference bundle**. All of these fields must be updated and verified together:

| Field | Source |
|-------|--------|
| `worldPackageId` | `published-at` from `Published.toml` |
| `originalWorldPackageId` | `original-id` from `Published.toml` |
| `objectRegistryId` | Discovered from the original package publication on Sui testnet |
| `serverAddressRegistryId` | Discovered from the original package publication on Sui testnet |
| `sourceVersionTag` | Earliest matching release tag containing the same publication metadata |
| `toolchainVersion` | `toolchain-version` from `Published.toml` |
| `source` | EVE Resource URL (documentation reference) |
| `lastVerifiedOn` | Most recent verification date |
| Deploy-cache mapping | `scripts/deploy-cache-packages.json` target → tag mapping |
| Resolution snapshot | `public/deploy-grade-resolution-snapshots/<tag>.json` |

**Critical:** Partially updating any subset of these fields creates an inconsistent bundle that may compile or sign against incompatible package lineages.

---

## 4. Source Tag Selection

The `sourceVersionTag` must identify a repository revision whose `contracts/world/Published.toml` contains the same `published-at` and `original-id` as the active bundle.

**Rules:**
1. Find the earliest release tag (e.g. `v0.0.24`) where `Published.toml` matches the on-chain identity.
2. Do not select the newest tag if newer tags contain a different source tree (even if their `Published.toml` still matches).
3. The source tag represents the exact code used for compilation and dependency resolution.

**Verification:**
```bash
curl -s "https://raw.githubusercontent.com/evefrontier/world-contracts/<tag>/contracts/world/Published.toml"
```
Compare the `published-at` and `original-id` values with the checked-in bundle.

---

## 5. On-Chain Registry Discovery

For **replacements**, you must discover new registry objects. For **upgrades**, the existing registries remain valid (but should be verified).

### Steps

1. **Query the package object** to confirm it exists:
   ```graphql
   query { object(address: "<worldPackageId>") { address asMoveObject { contents { type { repr } } } } }
   ```

2. **Find the original package publication transaction** on Sui testnet. From the publication transaction, inspect the created objects to identify:
   - The Object Registry (type: `<originalWorldPackageId>::registry::ObjectRegistry` or similar)
   - The Server Address Registry (type: `<originalWorldPackageId>::registry::ServerAddressRegistry` or similar)

3. **Verify registry type lineage** — each registry's Move type must be rooted at `originalWorldPackageId`, not at a different lineage.

4. **Record the registry object IDs** in the bundle.

**GraphQL endpoint:** `https://graphql.testnet.sui.io/graphql`

---

## 6. Deploy-Cache Regeneration

After updating the bundle fields:

1. **Update `scripts/deploy-cache-packages.json`** — change the `sourceVersionTag` and `outputPath` for the affected target.

2. **Generate the new snapshot:**
   ```bash
   bun run scripts/preload-deploy-cache.ts
   ```
   This fetches from GitHub, resolves dependencies using the WASM builder, and writes the snapshot.

3. **Remove the obsolete snapshot** file if no other target references it.

4. **Verify** the new snapshot's `sourceVersionTag` field matches the tag in the manifest.

---

## 7. Validation

Run the integrity command to verify all layers:

```bash
bun run check:world-package-references
```

This checks four layers for each target:

1. **Current manifest:** Upstream `Published.toml` on `main` matches the checked-in bundle
2. **Source provenance:** The pinned tag's `Published.toml` matches the checked-in bundle
3. **Cache alignment:** Deploy-cache manifest maps to the correct snapshot with correct structure
4. **On-chain coherence:** Sui testnet contains the package and registry objects with correct lineage

**Pass** = clean exit (0). **Fail** = non-zero exit with field-level diagnostics.

---

## 8. Real-WASM Testing

After making changes, run the real-WASM integration check:

```bash
bun run test:real-wasm
```

This compiles and deploys against the actual Sui testnet using the updated bundle. Record any external-service limitations separately from code failures. If external services (GitHub or Sui testnet) are unavailable, note the limitation but the code change itself may still be valid.

---

## 9. Rollback

If post-update verification fails:

1. **Revert** as a single atomic commit:
   - Restore the previous `PackageReferenceBundle` in `src/data/packageReferences.ts`
   - Restore the previous `scripts/deploy-cache-packages.json`
   - Restore the previous snapshot file
   - Re-add the obsolete snapshot file

2. **Keep the target blocked** — do not restore partial runtime overrides. If the old bundle also fails validation, the target remains unavailable until a new complete bundle is verified.

3. **Run validation** after rollback to confirm the restored state passes.

---

## 10. Browser-State Migration

Legacy version-2 and version-3 browser stored overrides are no longer applied to active bundles. Existing browser users may have these overrides in `localStorage`.

**Migration behavior:**
- The stored overrides are simply ignored. The checked-in bundle is always authoritative for remote targets.
- No explicit cleanup of stored data is required — the data is harmless but will not affect bundle resolution.
- The `WORLD_PACKAGE_OVERRIDE_STORAGE_KEY` may remain in browser storage; it is not read or applied.

---

## 11. Scheduled Failure Remediation

The GitHub Actions workflow `.github/workflows/world-package-integrity.yml` runs weekly and on manual dispatch. When it fails:

1. **Check the job summary** on GitHub Actions for target-level diagnostics.
2. **Determine the cause:**
   - If `current-manifest` or `source-tag` layer fails → upstream has changed. Follow §2–§8 to update the bundle.
   - If `deploy-cache` layer fails → cache metadata is out of sync. Follow §6 to regenerate.
   - If `on-chain` layer fails → registry objects have moved or package is unavailable. Check Sui testnet directly.
   - If all layers report "unreachable" → external services (GitHub or Sui testnet) are temporarily unavailable. Retry later.
3. **Run locally** to confirm: `bun run check:world-package-references`
4. **Open a pull request** with the atomic update.
5. **Never auto-commit** in response to a scheduled failure — review and update manually.
