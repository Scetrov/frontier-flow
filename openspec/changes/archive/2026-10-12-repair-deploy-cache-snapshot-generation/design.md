## Context

`createSyntheticFiles` emits a minimal root package whose only purpose is to give the resolver something that depends on the pinned `world` package:

```toml
[package]
name = "starter_contract"

[dependencies]
world = { git = "<repositoryUrl>", rev = "<sourceVersionTag>", subdir = "<subdirectory>" }
```

`main()` additionally passed `rootGit` with that same `(git, rev, subdir)` triple. The resolver therefore saw a root package whose identity equalled its own dependency's identity and reported `Dependency cycle detected: starter_contract -> starter_contract`.

Behind that, the `[addresses]` block declared `world = "0x0"` while `world` was already bound as a dependency name, which Move.lock V4 reports as a duplicate named address.

Both are latent defects in the synthetic package rather than regressions from any bundle edit: they reproduce with the `v0.0.24` entry exactly as committed.

## Goals / Non-Goals

**Goals:** Make snapshot regeneration succeed for the checked-in manifest entries, and keep both defects from returning via tests that fail against the previous behaviour.

**Non-Goals:** Changing any checked-in snapshot, bundle, or manifest entry; changing resolver output format; pinning a different builder version; altering the runbook; or asserting anything about which world package revision should be pinned.

## Decisions

### Treat the synthetic root as local

Remove `rootGit` rather than giving the root a distinct synthetic identity. The root genuinely is a local, in-memory package; it has no upstream location. Inventing a different git identity for it would make the resolution request describe something that does not exist.

Alternative: keep `rootGit` and vary the `subdir`. Rejected — it preserves a false claim about the root's provenance to work around a cycle check that is correctly reporting the real shape of the request.

### Drop the colliding named address

`world` is supplied by the dependency, so the address binding is redundant as well as invalid. `builder_extensions` and `starter_contract` remain, since nothing else provides them.

### Make the module importable

`main()` ran unconditionally at import time, so no test could reach the helpers without starting a WASM resolution against the network. Guarding with `import.meta.main` follows the convention already used by `scripts/check-world-package-references.ts`, which is tested the same way.

## Risks / Trade-offs

Regenerated snapshots may differ in content from the committed ones because the installed builder version has moved on. That is a property of regeneration, not of this change, and this change deliberately regenerates nothing.
