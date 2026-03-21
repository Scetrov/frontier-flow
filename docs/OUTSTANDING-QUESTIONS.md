---
title: Frontier Flow — Outstanding Questions
version: 1.0.0
status: active
created: 2026-02-27
updated: 2026-03-21
author: Scetrov
description: Unresolved integration questions arising from the turrets.diff PR analysis that affect how FrontierFlow hooks into the on-chain contract.
---

## Table of Contents

1. [Extension Dispatch & Registration](#1-extension-dispatch--registration)
2. [Missing Types & Accessors](#2-missing-types--accessors)
3. [BCS Encoding & TS Integration](#3-bcs-encoding--ts-integration)
4. [Energy & Lifecycle Management](#4-energy--lifecycle-management)
5. [Code Generation Architecture](#5-code-generation-architecture)
6. [Testing & Validation](#6-testing--validation)

---

## 1. Extension Dispatch & Registration

### Q-01 — How does the game server discover which extension module to call?

**Context:** `world::turret::get_target_priority_list()` aborts with `EExtensionConfigured` when an extension is registered. The game server must then call the extension's implementation directly. However, there is no on-chain registry or lookup mechanism visible in the diff that maps a turret to its extension module's package ID and function name.

**Impact on FrontierFlow:** After a user deploys their extension contract, FrontierFlow needs to guide them through registering it with their turret. If the game server uses an off-chain registry, FrontierFlow may need to integrate with that system.

**Question:** Is extension routing handled by an off-chain game server configuration, an on-chain registry, or does the `turret.extension` `TypeName` field (set by `authorize_extension<Auth>`) serve as the discovery mechanism?

---

### Q-02 — Can a turret's extension be changed after initial authorisation?

**Context:** `authorize_extension<Auth>()` calls `turret.extension.swap_or_fill(type_name::with_defining_ids<Auth>())`. The `swap_or_fill` semantics suggest the extension _can_ be replaced. However, it's unclear if re-authorising with a different witness type has side effects (e.g., do existing priority lists reset? Does the game server re-index?).

**Impact on FrontierFlow:** The "Deploy" → "Upgrade" flow assumes iterative development. If re-authorisation is supported, FrontierFlow can offer a seamless re-deploy cycle. If not, the UI needs to warn users that extension changes require a new turret.

**Question:** Is `authorize_extension` idempotent for the same `Auth` type? Can it be called with a _different_ `Auth` type to swap extensions? What are the side effects?

---

### Q-03 — ~~What is the `SmartTurret` type referenced by the extension example?~~ **RESOLVED**

**Context:** The actual `world::turret` implementation uses `Turret` (not `SmartTurret`) as the main struct. The finalized function signature is:

```move
public fun get_target_priority_list(
    turret: &Turret,
    owner_character: &Character,
    target_candidate_list: vector<u8>,
    receipt: OnlineReceipt,
): vector<u8>
```

**Resolution:** The `SmartTurret` type referenced in older documentation was a placeholder. The actual implementation uses `Turret` from `world::turret` and `Character` from `world::character`. FrontierFlow's Emitter should generate code using these correct types.

---

### Q-04 — ~~Does the struct-based extension entry point need to follow an exact function signature?~~ **RESOLVED**

**Context:** The finalized `world::turret` implementation defines the extension entry point as:

```move
public fun get_target_priority_list(
    turret: &Turret,
    owner_character: &Character,
    target_candidate_list: vector<u8>,
    receipt: OnlineReceipt,
): vector<u8>
```

This function accepts BCS-serialized `vector<TargetCandidate>` and returns BCS-serialized `vector<ReturnTargetPriorityList>`. The world contract provides utility functions: `unpack_candidate_list()`, `unpack_priority_list()`, and `unpack_return_priority_list()` for deserialization.

**Resolution:** FrontierFlow's Emitter must generate extension contracts that match this exact signature. The game server calls the extension by resolving the package ID from the `turret.extension` TypeName field set by `authorize_extension<Auth>()`.

---

## 2. Missing Types & Accessors

### Q-05 — ~~Are public accessors planned for `hp_ratio`, `shield_ratio`, and `armor_ratio`?~~ **RESOLVED**

**Context:** The `world::turret` implementation provides public accessor functions for all `TargetCandidate` fields:

- `candidate_item_id(&TargetCandidate): u64`
- `candidate_type_id(&TargetCandidate): u64`
- `candidate_group_id(&TargetCandidate): u64`
- `candidate_character_id(&TargetCandidate): u32`
- `candidate_character_tribe(&TargetCandidate): u32`
- `candidate_hp_ratio(&TargetCandidate): u64`
- `candidate_shield_ratio(&TargetCandidate): u64`
- `candidate_armor_ratio(&TargetCandidate): u64`
- `candidate_is_aggressor(&TargetCandidate): bool`
- `candidate_priority_weight(&TargetCandidate): u64`
- `candidate_behaviour_change(&TargetCandidate): BehaviourChangeReason`

**Resolution:** All accessor functions exist. FrontierFlow's `hpRatio`, `shieldRatio`, and `armorRatio` node types can generate code calling these accessors. The Emitter should use the `turret::candidate_*` accessor pattern.

---

### Q-06 — ~~What is the `owner_tribe()` function's source?~~ **RESOLVED**

**Context:** The finalized extension signature receives `owner_character: &Character` directly as a parameter. The tribe is obtained via `character::tribe(owner_character)` from the `world::character` module.

```move
public fun get_target_priority_list(
    turret: &Turret,
    owner_character: &Character,  // <-- Owner character reference provided
    target_candidate_list: vector<u8>,
    receipt: OnlineReceipt,
): vector<u8>
```

**Resolution:** Extensions access the owner's tribe via `character::tribe(owner_character)`. The default targeting logic in the world contract uses this same pattern. FrontierFlow's Emitter should generate comparisons like: `turret::candidate_character_tribe(&candidate) == character::tribe(owner_character)`.

---

### Q-07 — Is `target_type_id` used to distinguish ships from NPCs?

**Context:** `TargetCandidate` has fields: `type_id: u64` (target type — ship or NPC), `group_id: u64` (target group; used for ship specialization), and `character_id: u32` (pilot character ID; 0 for NPCs). The comment in the implementation states: "Pilot character id; use 0 for NPCs" and "Character tribe; use 0 for NPCs (same as character_id)".

**Impact on FrontierFlow:** FrontierFlow could offer "Filter by Target Type" or "Is NPC?" nodes. The implementation confirms that `character_id == 0` indicates an NPC, and `character_tribe == 0` for NPCs as well.

**Question:** What are the specific `type_id` values for ships vs NPCs? Is there a canonical list of type IDs, or should extensions simply check `character_id == 0` to identify NPCs? What is the meaning of `group_id` and can it be used for targeting logic?

---

## 3. BCS Encoding & TS Integration

### Q-08 — ~~Should FrontierFlow generate the struct-based or BCS-based entry point?~~ **RESOLVED**

**Context:** The finalized implementation uses the BCS-based approach exclusively. Extensions receive `target_candidate_list: vector<u8>` (BCS-serialized `vector<TargetCandidate>`) and return `vector<u8>` (BCS-serialized `vector<ReturnTargetPriorityList>`). The world contract provides utility functions for deserialization:

- `unpack_candidate_list(vector<u8>): vector<TargetCandidate>`
- `unpack_priority_list(vector<u8>): vector<TargetCandidate>` (alias)
- `unpack_return_priority_list(vector<u8>): vector<ReturnTargetPriorityList>`

**Resolution:** FrontierFlow must generate BCS-based extensions. The Emitter should call `turret::unpack_candidate_list()` to deserialize candidates, process them, build `ReturnTargetPriorityList` entries using `turret::new_return_target_priority_list()`, and serialize the result with `bcs::to_bytes()`.

---

### Q-09 — ~~What is the BCS field ordering contract for target candidates?~~ **RESOLVED**

**Context:** The `peel_target_candidate_from_bcs` function in `world::turret` deserializes `TargetCandidate` fields in order:

1. `item_id: u64`
2. `type_id: u64`
3. `group_id: u64`
4. `character_id: u32`
5. `character_tribe: u32`
6. `hp_ratio: u64`
7. `shield_ratio: u64`
8. `armor_ratio: u64`
9. `is_aggressor: bool`
10. `priority_weight: u64`
11. `behaviour_change: u8` (converted to `BehaviourChangeReason` enum)

**Resolution:** This BCS layout is now the stable contract. Extensions should use `turret::unpack_candidate_list()` rather than manually deserializing. FrontierFlow's integrated testing engine can construct test fixtures following this layout if needed for direct BCS testing.

---

## 4. Energy & Lifecycle Management

### Q-10 — Does FrontierFlow need to generate anchor/online transactions, or is that handled by the game client?

**Context:** The turret lifecycle is: `anchor()` (admin) → `share_turret()` (admin) → `online()` (owner via OwnerCap) → operational → `offline()` → `unanchor()`. This is complex and involves admin-only functions, energy reservation, and NetworkNode management.

**Impact on FrontierFlow:** FrontierFlow currently focuses on generating the _logic_ (extension contract). If users also need to deploy + anchor + register their turret in one flow, FrontierFlow may need to generate PTBs that compose these operations.

**Question:** Is the anchor/online lifecycle managed by the EVE Frontier game client UI, or would FrontierFlow users need to perform these steps themselves after deploying their extension contract?

---

### Q-11 — How is the `EnergyConfig` object obtained?

**Context:** `online()` and `offline()` require `&EnergyConfig`, a shared object. The extension contract itself doesn't need it, but if FrontierFlow generates deployment/testing transactions, it needs the object ID.

**Question:** Is `EnergyConfig` a well-known shared object with a fixed ID? Or is it created per-world/per-server? How should FrontierFlow discover it for transaction construction?

---

## 5. Code Generation Architecture

### Q-12A — How are Stillness and Utopia deployment package references managed? **RESOLVED**

**Context:** The bytecode deployment workflow now validates published-target prerequisites before any simulated submission path begins. That validation depends on stable, target-specific identifiers for Stillness and Utopia.

**Resolution:** Frontier Flow keeps those package references in a maintained source module (`src/data/packageReferences.ts`) rather than fetching them at runtime. The values are verified against the EVE Frontier resources page, then validated structurally before deployment begins. If the maintained data is missing or malformed, deployment to the published target is blocked with user-actionable remediation.

**Operational consequence:** Updating Stillness or Utopia package IDs is a source change plus test update, not a runtime fetch concern.

### Q-12 — Should FrontierFlow generate a `world` dependency import or use published package addresses?

**Context:** The extension's `Move.toml` needs a dependency on the `world` package. For local development, `world = { local = "../world" }` works. For on-chain deployment, the dependency must reference a published package address (e.g., `world = { address = "0x..." }`).

**Impact on FrontierFlow:** The WASM in-browser compiler needs to resolve the `world` package. This could require:

- Fetching `world` sources from a known repository (similar to how Sui Framework is fetched from GitHub).
- Using a pre-compiled `world` package bytecode cache.
- Referencing a known published address on each network.

**Question:** What is the GitHub repository (or package registry) for the `world` contract? Is it published to a well-known address on devnet/testnet/mainnet? How should `Move.toml` reference it for WASM compilation?

---

### Q-13 — What is the correct `module` path for generated extensions?

**Context:** The example uses `builder_extensions::turret` as the module path. FrontierFlow-generated contracts could use:

- `builder_extensions::turret_logic` (unique per deployment)
- A user-chosen module name
- A deterministic name derived from the graph

**Impact on FrontierFlow:** The module path affects `Move.toml`'s `[addresses]` section and whether multiple extensions can coexist in one package.

**Question:** Does the game server expect a specific package/module naming convention for extensions? Can a single `builder_extensions` package contain multiple turret extension modules?

---

### Q-14 — How should the `OnlineReceipt` be consumed in extension contracts?

**Context:** The world contract's `get_target_priority_list` destructures the receipt (`let OnlineReceipt { .. } = receipt;`). The extension example in the struct-based variant never explicitly consumes it. The `destroy_online_receipt<Auth>` function exists but requires the extension's witness.

**Impact on FrontierFlow:** The generated code must properly consume the `OnlineReceipt` to avoid "unused value" compiler errors. The Emitter needs to know the correct consumption pattern.

**Question:** Should extension contracts call `turret::destroy_online_receipt(receipt, TurretAuth {})` at the end, destructure it inline, or is there a convention for receipt handling?

---

## 6. Testing & Validation

### Q-15 — Can FrontierFlow's WASM compiler compile against the `world` package for test execution?

**Context:** FrontierFlow's integrated testing engine generates `#[test]` modules. These tests need to instantiate `TurretTarget` values, create mock turrets, and call `verify_online()`. This requires the full `world` package to be available to the compiler.

**Impact on FrontierFlow:** If the `world` package is large or has transitive dependencies (e.g., on Sui framework internals, `energy`, `network_node`, `character`), the WASM compiler may struggle with memory/time constraints.

**Question:** What is the compilation footprint of the `world` package? Can `#[test_only]` helpers (like the ones in `turret_tests.move`) be used by external packages?

---

### Q-16 — Are there reference test scenarios for extension contracts?

**Context:** The `turret_tests.move` file includes a `priority_list_with_extension_contract` test that demonstrates how an extension interacts with the world contract. FrontierFlow's test engine could use similar patterns.

**Question:** Are there additional reference test scenarios or a test harness for extension developers? Is there a recommended pattern for testing extension logic in isolation (without the full world lifecycle setup)?

---

_This document will be updated as questions are answered or new questions arise from implementation._
