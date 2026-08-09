## Context

The Bun lockfile resolves `js-yaml@4.3.0` through Commitlint's Cosmiconfig dependency and `nanoid@3.3.16` through PostCSS. OSV identifies the former as vulnerable until 4.3.1 and the latter until 3.3.17. Both advisories are denial-of-service conditions. The existing dependency ranges accept the fixed patch releases, while the project uses explicit Bun overrides to pin selected transitive versions.

## Goals / Non-Goals

**Goals:**
- Resolve `js-yaml` to 4.3.1 and `nanoid` to 3.3.17.
- Preserve compatibility by remaining on the supported major lines required by current transitive dependents.
- Verify the lockfile integrity, dependency graph, and project checks.

**Non-Goals:**
- Upgrade direct toolchain dependencies or migrate to newer major versions.
- Change application behavior or add a runtime YAML parser.

## Decisions

- Pin `js-yaml` at 4.3.1 through the existing override mechanism. This is the first fixed release on the installed 4.x line and satisfies Cosmiconfig's `^4.1.0` range. Moving to 5.x would be an unnecessary major-version override.
- Pin `nanoid` at 3.3.17 through the existing override mechanism. This is the first fixed release on the installed 3.x line and satisfies PostCSS's `^3.3.16` range. Moving to the current 6.x release would conflict with that range and add migration risk.
- Regenerate `bun.lock` with Bun rather than manually editing integrity data, so package metadata and SHA-512 integrity values remain registry-derived.

## Risks / Trade-offs

- [A package override could be incompatible with a transitive consumer] → Restrict both changes to patch releases accepted by the existing dependency ranges and run typecheck, tests, and build.
- [A lockfile refresh could introduce unrelated changes] → Review the resulting diff and retain only the two intended resolution updates.
- [A scanner could use different advisory metadata] → Confirm the exact vulnerable versions no longer occur in the lockfile and run the repository audit command.

## Migration Plan

1. Update the two overrides and regenerate the Bun lockfile.
2. Validate the resolved package versions and run the project verification suite.
3. If validation fails, revert the override and lockfile changes together; no deployed-data migration is required.

## Open Questions

None.
