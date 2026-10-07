# semgrep-finding-disposition Specification

## Purpose
TBD - created by archiving change remediate-main-semgrep-findings. Update Purpose after archive.
## Requirements
### Requirement: Production World manifest lookup is literal
The deploy-grade compiler MUST resolve a dependency manifest path by case-insensitive literal comparison. It MUST NOT construct a regular expression from a dependency directory name. One literal comparison MUST account for every duplicate production report of the former dynamic-expression call site.

#### Scenario: Case-insensitive manifest match
- **WHEN** a World snapshot directory and its `Move.toml` path differ only by case
- **THEN** manifest lookup selects that path

#### Scenario: Regex metacharacters do not change lookup
- **WHEN** a dependency directory name contains regular-expression metacharacters but its normalized package identity is World
- **THEN** lookup does not match a different directory and does not throw from regular-expression construction

### Requirement: Reviewed duplicates and false positives are suppressed narrowly
The repository MUST add evidence-backed inline suppressions only for the reviewed test-only dynamic expression, the dedicated HTML-encoding helper, and the scanned read-only authorization traversal while that traversal remains present. Each suppression MUST identify its reported Semgrep rule. The repository MUST NOT disable those rules globally, ignore their containing paths, or add a sanitization library.

#### Scenario: Test-only expression is suppressed
- **WHEN** the compilation-status test constructs a regular expression from its test-authored button label
- **THEN** that test match is suppressed inline as a non-production duplicate, while the test behavior remains unchanged

#### Scenario: HTML encoder remains an encoder
- **WHEN** build-output text is prepared for insertion into markup
- **THEN** the existing helper still encodes ampersand before the other HTML metacharacters, and its duplicate scanner matches are suppressed without replacing the helper

#### Scenario: Traversal suppression follows the scanned code
- **WHEN** the scanned read-only authorization traversal is still present
- **THEN** its prototype-pollution match is suppressed at that traversal with evidence that it performs no property write or merge

#### Scenario: Removed traversal is not recreated
- **WHEN** the scanned traversal is no longer present at implementation time
- **THEN** the finding is recorded as resolved by removal and no suppression is added to unrelated authorization code

### Requirement: Unresolved OAuth finding remains visible
This change MUST NOT modify GitHub OAuth callback, state-cookie, token-exchange, or popup-bridge behavior. The repository MUST NOT suppress or ignore the reviewed generic Logic Flaw finding.

#### Scenario: No authentication patch or suppression is introduced
- **WHEN** the reviewed remediation is applied
- **THEN** the OAuth callback implementation remains unchanged and contains no suppression or ignore entry for the Logic Flaw finding
