## MODIFIED Requirements

### Requirement: Remediation of reported vulnerable package versions
The project SHALL resolve package versions outside the affected ranges for vulnerabilities reported by its dependency scanner.

#### Scenario: Vulnerable transitive packages are resolved
- **WHEN** the Bun dependency graph is generated for the project
- **THEN** it resolves `js-yaml` at version 4.3.1 or later within the 4.x line and `nanoid` at version 3.3.17 or later within the 3.x line

#### Scenario: Reported fast-uri vulnerabilities are remediated
- **WHEN** the Bun dependency graph is generated for the project
- **THEN** Ajv resolves `fast-uri` at version 3.1.8 or later within the 3.x line, outside the affected ranges for GHSA-58mr-gqgx-xq4g, GHSA-hrr3-gc8f-f4qj, and GHSA-qw65-cvwx-89v3

## ADDED Requirements

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
