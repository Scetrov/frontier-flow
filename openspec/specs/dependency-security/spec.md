## ADDED Requirements

### Requirement: Remediation of reported vulnerable package versions
The project SHALL resolve package versions outside the affected ranges for vulnerabilities reported by its dependency scanner.

#### Scenario: Vulnerable transitive packages are resolved
- **WHEN** the Bun dependency graph is generated for the project
- **THEN** it resolves `js-yaml` at version 4.3.1 or later within the 4.x line and `nanoid` at version 3.3.17 or later within the 3.x line

### Requirement: Lockfile-integrity dependency resolution
The project SHALL record the resolved remediation package versions and their registry-provided SHA-512 integrity values in `bun.lock`.

#### Scenario: Dependency installation is reproducible
- **WHEN** dependencies are installed from the committed manifest and lockfile
- **THEN** Bun uses the fixed package versions and validates them against their recorded integrity values
