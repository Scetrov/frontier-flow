# world-api-connectivity Specification

## Purpose
TBD - created by archiving change restore-world-api-connectivity. Update Purpose after archive.
## Requirements
### Requirement: World API consumers share the verified Stillness endpoint
The application MUST use one shared World API base-URL definition, defaulting to `https://world-api-stillness.live.pub.evefrontier.com`, for the node editor, simulation reference data, and World API client. Release verification MUST establish that this endpoint represents the intended Stillness environment. Production consumers MUST NOT request the obsolete `world-api-stillness.live.tech.evefrontier.com` hostname. Shared URL construction MUST declare a page size covering the whole collection unless a caller narrows it deliberately.

#### Scenario: Tribe editor is opened
- **WHEN** a user adds a List of Tribe node and opens its editor with a cold option cache
- **THEN** the application requests `/v2/tribes` from the shared public Stillness origin and renders valid tribe names and IDs

#### Scenario: Other collection consumers load
- **WHEN** a user opens List of Ship or loads simulation tribe and ship reference data
- **THEN** all collection requests use the shared origin and retain their existing option mappings and query parameters, including the declared page size

#### Scenario: Deployment target changes
- **WHEN** the selected deployment target changes without a separately verified World API environment mapping
- **THEN** existing Stillness-backed lookups continue to use the canonical Stillness endpoint rather than synthesizing a hostname

#### Scenario: Consumer omits a page size
- **WHEN** a consumer resolves a collection URL without specifying one
- **THEN** shared URL construction supplies the service's maximum accepted page size rather than letting the service choose a partial default

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

### Requirement: World API collections are retrieved completely
Collection retrieval MUST return every record the service holds, because the service answers a request without a page size with a partial collection in ascending id order and reports no field marking it partial. Consumers MUST NOT page with `offset`, which discards records. Records repeating an identifier MUST be collapsed so option values stay unique. A collection the service reports as larger than the requested page size MUST be reported to the console rather than returned silently.

#### Scenario: Collection exceeds the service's default page
- **WHEN** a consumer loads a collection holding more records than the service returns by default
- **THEN** every record is retrieved in one request and reaches the option mappers

#### Scenario: Service repeats an identifier
- **WHEN** a collection contains the same `id` more than once
- **THEN** the records collapse to a single entry holding the last value at the first occurrence's position, and records carrying no usable `id` are preserved

#### Scenario: Service reports more records than the requested page
- **WHEN** a response reports a total exceeding the requested page size
- **THEN** the boundary warns that the collection was truncated and names both the reported total and the requested page size

#### Scenario: Collection fits inside the requested page
- **WHEN** a response reports a total within the requested page size
- **THEN** no truncation warning is emitted

#### Scenario: Caller narrows the page size deliberately
- **WHEN** a caller requests a specific page size, including zero
- **THEN** that page size is used unchanged
