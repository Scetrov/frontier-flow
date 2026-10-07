# world-api-connectivity Specification

## Purpose
TBD - created by archiving change restore-world-api-connectivity. Update Purpose after archive.
## Requirements
### Requirement: World API consumers share the verified Stillness endpoint
The application MUST use one shared World API base-URL definition, defaulting to `https://world-api-stillness.live.pub.evefrontier.com`, for the node editor, simulation reference data, and World API client. Release verification MUST establish that this endpoint represents the intended Stillness environment. Production consumers MUST NOT request the obsolete `world-api-stillness.live.tech.evefrontier.com` hostname.

#### Scenario: Tribe editor is opened
- **WHEN** a user adds a List of Tribe node and opens its editor with a cold option cache
- **THEN** the application requests `/v2/tribes` from the shared public Stillness origin and renders valid tribe names and IDs

#### Scenario: Other collection consumers load
- **WHEN** a user opens List of Ship or loads simulation tribe and ship reference data
- **THEN** all collection requests use the shared origin and retain their existing query parameters and option mappings

#### Scenario: Deployment target changes
- **WHEN** the selected deployment target changes without a separately verified World API environment mapping
- **THEN** existing Stillness-backed lookups continue to use the canonical Stillness endpoint rather than synthesizing a hostname

### Requirement: Browser security policy permits the configured World API
The deployed Content Security Policy MUST permit connections to the exact canonical World API HTTPS origin without disabling CSP or broadly allowing unrelated origins.

#### Scenario: Lookup runs under production-equivalent policy
- **WHEN** the built application opens a tribe editor with the CSP derived from `netlify.toml`
- **THEN** the browser can complete the permitted collection request and render its response without a CSP violation

### Requirement: Lookup failures are recoverable and preserve user data
The editor MUST distinguish a failed World API lookup from a valid empty collection, identify the affected service, and offer an explicit retry. Rejected fetches, unsuccessful HTTP responses, and malformed collection envelopes MUST NOT be cached as successful empty results. Failure MUST NOT mutate persisted node selections or be attributed to Sui without evidence.

#### Scenario: Network request fails
- **WHEN** a tribe collection fetch rejects with a browser network error
- **THEN** the editor displays a World API-specific failure and retry action while existing selections remain unchanged

#### Scenario: Retry succeeds
- **WHEN** the user retries after an unsuccessful lookup and the endpoint returns a valid collection
- **THEN** a new network request is issued and available options replace the error state

#### Scenario: HTTP or schema failure occurs
- **WHEN** the endpoint returns a non-success status or an invalid collection envelope
- **THEN** the consumer reports a lookup failure rather than treating the response as an empty collection

#### Scenario: Valid empty result occurs
- **WHEN** the endpoint returns a successful envelope with an empty data array
- **THEN** the editor shows an empty collection state rather than a network error

#### Scenario: Saved selections survive reload
- **WHEN** the user selects a returned tribe, saves the node, and reopens the editor
- **THEN** the selected numeric ID remains persisted and selected

#### Scenario: Editor closes during loading
- **WHEN** a lookup completes after its editor has closed or a newer request supersedes it
- **THEN** the stale result does not update the active editor

### Requirement: Regression tests exercise the reported failing workflow
The repository MUST have deterministic tests exercising the real node-editor fetch path and browser CSP, and MUST document a separate bounded, read-only live smoke check. Test mocks MUST reject unexpected origins rather than returning success for arbitrary fetches.

#### Scenario: Obsolete URL regression is introduced
- **WHEN** an implementation requests the retired World API hostname or omits the replacement origin from CSP
- **THEN** the editor/network or production-policy browser regression fails

#### Scenario: Original issue workflow is tested
- **WHEN** the browser test adds a List of Tribe node, opens it, selects a fetched tribe, saves, and reopens it
- **THEN** it asserts the actual request origin, visible options, and persisted selection without replacing the loader with a mock hook

#### Scenario: Sui is independently unavailable
- **WHEN** Sui requests are unavailable but the World API returns a valid tribe collection
- **THEN** the tribe editor still loads and saves its options

#### Scenario: Live service cannot be verified
- **WHEN** the opt-in live smoke cannot resolve, retrieve, validate, or access the configured collections from the deployed browser origin
- **THEN** it reports unsuccessful verification with the endpoint and failure phase rather than passing on mocked data
