## MODIFIED Requirements

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

## ADDED Requirements

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
