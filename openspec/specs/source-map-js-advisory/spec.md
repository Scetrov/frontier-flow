# source-map-js-advisory Specification

## Purpose
Keep the Bun source-map-js dependency graph outside GHSA-68fv-2mgg-jv7q, verify it with bounded regression coverage, and block vulnerable or unverified local commits using a pinned OSV-Scanner hook without adding a CI scanner job.

## Requirements
### Requirement: source-map-js resolves outside GHSA-68fv-2mgg-jv7q
The committed Bun dependency graph MUST resolve every `source-map-js` occurrence to version 1.2.2 or a later compatible release outside the affected range of GHSA-68fv-2mgg-jv7q / CVE-2026-93749. The selected release MUST be the latest applicable compatible release verified at implementation time, and `bun.lock` MUST record its registry integrity. `@tailwindcss/node`, `css-tree`, `magicast`, and `postcss` MUST NOT retain a resolution below 1.2.2.

#### Scenario: Lockfile is regenerated
- **WHEN** dependencies are resolved from the committed manifest and lockfile
- **THEN** every `source-map-js` resolution is version 1.2.2 or later and matches its recorded integrity

#### Scenario: Vulnerable resolution returns
- **WHEN** a lockfile or override resolves `source-map-js` at version 1.2.1 or another version in the advisory range
- **THEN** the advisory regression fails

### Requirement: Regression coverage cannot recreate the denial of service
The repository MUST test the resolved installed package with a minimal valid indexed source map and small malformed section offsets. Tests MUST reject negative, fractional, and non-numeric offsets promptly. Tests MUST NOT supply a section line offset large enough to trigger the event-loop or memory exhaustion behavior, and a test timeout MUST NOT be treated as protection for such an input.

#### Scenario: Small malformed offset is rejected
- **WHEN** the resolved patched package parses an indexed source map whose section offset is negative, fractional, or not a number
- **THEN** parsing fails promptly with an error

#### Scenario: Valid indexed map remains readable
- **WHEN** the resolved package parses a minimal indexed source map with small non-negative integer offsets
- **THEN** parsing succeeds and exposes the expected source mapping data

#### Scenario: Unsafe fixture is proposed
- **WHEN** a regression uses a multi-million-line or larger section offset
- **THEN** that test is rejected as invalid coverage rather than accepted as proof of remediation

### Requirement: OSV-Scanner gates commits locally
The repository MUST run OSV-Scanner from a `pre-commit` hook pinned to a full upstream commit SHA. The hook MUST scan the committed `bun.lock`, fail when GHSA-68fv-2mgg-jv7q is detected, and fail when the scanner cannot execute or retrieve advisory data. The Bun manifest MUST be verified separately through the advisory regression and a frozen-lockfile install; unsupported npm manifest extraction MUST NOT be reported as a successful vulnerability scan. Existing pre-commit hooks MUST remain enabled. This change MUST NOT add OSV-Scanner to a CI workflow.

#### Scenario: Vulnerable lockfile is committed
- **WHEN** a developer runs the pre-commit OSV-Scanner hook against a Bun lockfile containing GHSA-68fv-2mgg-jv7q
- **THEN** the hook fails and identifies that advisory

#### Scenario: Scanner cannot obtain advisory data
- **WHEN** the pinned scanner cannot run or reach its advisory source
- **THEN** the hook fails closed rather than reporting a clean scan

#### Scenario: Existing local gates remain active
- **WHEN** the OSV-Scanner hook is added
- **THEN** signed-commit, build, lint, typecheck, dependency audit, and unit-test hooks remain configured and are not bypassed

#### Scenario: CI configuration is inspected
- **WHEN** this change is complete
- **THEN** no GitHub Actions workflow contains an OSV-Scanner job or action, while the existing CI `npm-audit` gate remains intact

#### Scenario: Unsupported Deno lockfile is encountered
- **WHEN** the current OSV-Scanner release cannot scan `deno.lock`
- **THEN** the project documents that limitation and does not report the Deno lockfile as successfully vulnerability-scanned
