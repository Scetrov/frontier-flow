# 1. Preload Manifest Contract

## 1.1 Purpose

This contract defines the input file consumed by `scripts/preload-deploy-cache.ts`.

## 1.2 Manifest Shape

```json
{
  "snapshots": [
    {
      "sourceVersionTag": "v0.0.18",
      "repositoryUrl": "https://github.com/evefrontier/world-contracts.git",
      "subdirectory": "contracts/world",
      "outputPath": "public/deploy-grade-resolution-snapshots/v0.0.18.json",
      "targets": ["testnet:stillness"]
    }
  ]
}
```

## 1.3 Required Guarantees

- Every maintained remote `sourceVersionTag` from `src/data/packageReferences.ts` MUST have a corresponding manifest entry.
- `outputPath` MUST point to a checked-in JSON artifact under `public/deploy-grade-resolution-snapshots/`.
- The preload script MUST fail if a manifest entry resolves successfully but the generated snapshot omits required packages or has empty file maps.
- The preload script MUST produce deterministic JSON output so snapshot diffs reflect real dependency changes rather than incidental ordering noise.

## 1.4 Validation Expectations

- Required package set for supported remote targets: `MoveStdlib`, `Sui`, `World`.
- Each generated snapshot MUST record the `sourceVersionTag` that produced it.
- Manifest validation MUST fail when duplicate entries point at the same `sourceVersionTag` with conflicting `outputPath` values.

## 1.5 Release Rule

When `src/data/packageReferences.ts` changes a maintained remote `sourceVersionTag`, maintainers MUST regenerate the matching preload snapshot and commit it in the same change set.