# Dependency Security

## Purpose

Define vulnerability remediation, integrity-verified dependency resolution, and dependency security regression requirements.

## Requirements

### Requirement: Remediation of reported vulnerable package versions

The project SHALL resolve package versions outside the affected ranges for vulnerabilities reported by its dependency scanner.

#### Scenario: Vulnerable transitive packages are resolved

- **WHEN** the Bun dependency graph is generated for the project
- **THEN** it resolves `js-yaml` at version 4.3.1 or later within the 4.x line and `nanoid` at version 3.3.17 or later within the 3.x line

#### Scenario: Reported fast-uri vulnerabilities are remediated

- **WHEN** the Bun dependency graph is generated for the project
- **THEN** Ajv resolves `fast-uri` at version 3.1.9 or later within the 3.x line, outside the affected ranges for GHSA-58mr-gqgx-xq4g, GHSA-hrr3-gc8f-f4qj, GHSA-qw65-cvwx-89v3, GHSA-333x-w4r6-6crp, GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr, and GHSA-xhq7-xmqj-769h

#### Scenario: Reported undici vulnerabilities are remediated

- **WHEN** the Bun dependency graph is generated for the project
- **THEN** jsdom resolves `undici` at version 8.12.2 or later within the 8.x line, outside the affected ranges for GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, and GHSA-xjj6-f33q-929c

### Requirement: Lockfile-integrity dependency resolution

The project SHALL record the resolved remediation package versions and their registry-provided SHA-512 integrity values in `bun.lock`.

#### Scenario: Dependency installation is reproducible

- **WHEN** dependencies are installed from the committed manifest and lockfile
- **THEN** Bun uses the fixed package versions and validates them against their recorded integrity values

### Requirement: URI dependency security regression coverage

The project SHALL provide executable regression tests for the URI dependency used by Ajv.

#### Scenario: Malformed bracket host is rejected

- **WHEN** fast-uri parses an unterminated bracket host
- **THEN** parsing reports an error

#### Scenario: Encoded uppercase host is canonicalized

- **WHEN** fast-uri parses, normalizes, or compares `//%41.com`
- **THEN** it treats the host as lowercase `a.com`, equivalent to `//a.com`

#### Scenario: Port authority injection is rejected

- **WHEN** fast-uri serializes a port containing authority delimiters
- **THEN** it throws instead of constructing a URL to a different host

#### Scenario: Valid URI components remain supported

- **WHEN** fast-uri handles valid IPv6 hosts and numeric ports
- **THEN** it preserves the expected valid URI behavior

### Requirement: Version updates observe a seven-day cooldown

Dependabot version-update configuration for the Bun and GitHub Actions package ecosystems MUST set a default cooldown of seven days. The configuration MUST NOT represent that cooldown as a control over Dependabot security updates.

#### Scenario: Both ecosystems wait seven days

- **WHEN** Dependabot evaluates a newly published version for either configured ecosystem
- **THEN** its version-update configuration requires seven default cooldown days before proposing that version

#### Scenario: Existing update policy remains intact

- **WHEN** the cooldown is set to seven days
- **THEN** both ecosystems retain their weekly schedule, pull-request limit, and minor/patch grouping

### Requirement: Additional URI and HTTP dependency security regression coverage

The project SHALL execute regression checks for the newly reported URI and HTTP vulnerabilities through Ajv's fast-uri and jsdom's undici dependencies.

#### Scenario: URI references preserve security boundaries

- **WHEN** fast-uri handles suffix references, percent-encoded schemes, malformed authorities, or relative paths with dot segments
- **THEN** it does not activate dangerous schemes, silently accept malformed authorities, or change a relative reference's resolved destination

#### Scenario: EventSource parser bounds retained state

- **WHEN** undici receives excessive data fields or unfinished-line chunks without an event separator
- **THEN** the parser rejects excessive retained state instead of growing without bound

#### Scenario: Mixed-case integrity algorithms remain enforced

- **WHEN** fetch receives a body inconsistent with a valid uppercase or mixed-case integrity token
- **THEN** it rejects the response as an integrity mismatch

#### Scenario: Excessive content encodings do not crash the process

- **WHEN** a server sends more than five content encodings and closes before the advertised body completes
- **THEN** fetch rejects without an unhandled stream error terminating the process
