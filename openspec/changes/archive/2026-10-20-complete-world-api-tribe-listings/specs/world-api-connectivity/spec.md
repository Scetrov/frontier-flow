## MODIFIED Requirements

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

## ADDED Requirements

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
