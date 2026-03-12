# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Contract Alignment:** Updated all documentation to align with the finalized `world::turret` implementation (commit 78854fe).
  - Code generation output examples now target `builder_extensions::turret_logic` module structure with real `world::turret` imports (`TargetCandidate`, `ReturnTargetPriorityList`, `OnlineReceipt`, `Turret`, `Character`).
  - Node-to-Code mapping table updated to reference actual contract accessors (`turret::candidate_is_aggressor`, `turret::candidate_character_tribe`, `turret::new_return_target_priority_list`).
  - Function signature updated: accepts BCS-serialized `vector<TargetCandidate>`, returns BCS-serialized `vector<ReturnTargetPriorityList>`.
  - Move.toml template updated to declare `world` dependency and `builder_extensions` address.
  - `NodeType` union expanded with `hpRatio`, `shieldRatio`, `armorRatio` types matching `TargetCandidate` fields.
- **Glossary:** Added new domain terms: `TargetCandidate`, `ReturnTargetPriorityList`, `BehaviourChangeReason`, `NetworkNode`, `OwnerCap`, `OnlineReceipt`, `Extension (Typed Witness)`, `BCS`. Updated `Priority Queue` → `Priority List` terminology. Expanded `Turret` and `Smart Assembly` definitions with accurate default targeting rules (+10000 for STARTED_ATTACK, +1000 for ENTERED).
- **Risk Register:** Revised R-01 (API Stability) status to "In Progress" with detailed contract analysis. Refined R-22 from "Extension Dispatch Logic Failure" to "Extension Dispatch Is Caller-Routed" reflecting the intentional design. Updated heat map, summary dashboard counts, and top critical risks.
- **Outstanding Questions:** Created `OUTSTANDING-QUESTIONS.md` cataloguing unresolved integration questions between FrontierFlow and the on-chain contract.

### Planned

- Sui wallet integration (`@mysten/dapp-kit`)
- In-browser WASM Move compilation (`@zktx.io/sui-move-builder`)
- Contract deployment and upgrade flow
- Localnet faucet integration
- GitHub OAuth for increased API rate limits
- Dependency caching via IndexedDB
- Graph persistence to GitHub repositories
- Integrated testing engine (local TS eval + Move `#[test]`)
- Compiler error → node mapping pipeline
- AST pruning and gas optimisation pass
