# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 0.0.0 (2026-03-19)


### Features

* add contract-aligned node palette and kitchen sink preview ([#1](https://github.com/Scetrov/frontier-flow/issues/1)) ([a1b5299](https://github.com/Scetrov/frontier-flow/commit/a1b5299c701b1874cba138991d2bf225c4a021d7))
* add WASM compile pipeline UI and docs ([#5](https://github.com/Scetrov/frontier-flow/issues/5)) ([416e790](https://github.com/Scetrov/frontier-flow/commit/416e7907d2dc6b6394d3137b757de754df8a1dc5))
* **specs/004:** implement ReactFlow canvas nodes, socket types, node components, and tests ([88c3845](https://github.com/Scetrov/frontier-flow/commit/88c38450b43e4b7fd3fd06cdae49c9326e05b72a))


### Bug Fixes

* base url ([706b7cd](https://github.com/Scetrov/frontier-flow/commit/706b7cd851a09592ccf05c4b3326c15cef6b3218))

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
