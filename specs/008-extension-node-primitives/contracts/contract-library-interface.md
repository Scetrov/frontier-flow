# Contract: Load Panel Contract Library Interface

## Purpose

Define the persisted and runtime-facing contract library behavior used by the Load panel after seeded example contracts are introduced.

## Library Shape

### Required Fields

- `contracts`: ordered list of loadable contract entries
- `name`: stable human-readable label for each entry
- `nodes`: serialized flow nodes for the entry
- `edges`: serialized flow edges for the entry
- `updatedAt`: last update timestamp
- `isSeeded`: whether the entry was bundled by the application

### Optional Fields

- `id`: stable seeded identifier or generated user entry identifier
- `description`: optional explanatory text for seeded examples
- `version`: library schema version for future compatibility

## Seed Rules

- A clean library must be populated with the curated seeded examples on first load.
- Seeded entries must remain distinguishable from user-created entries.
- Seeding must not overwrite or remove existing user-created contracts.
- Re-loading the library must not duplicate seeded entries that already exist.

## Load Rules

- Selecting a contract entry must produce a complete graph payload consumable by the existing canvas restore path.
- Loading over unsaved canvas work must require explicit confirmation.
- Loading a seeded example must use the same restore path as loading a user-saved contract.

## Consumer Expectations

- The Load panel can render one mixed list of seeded and user-created entries.
- Contract storage utilities can persist and restore the same library shape through `localStorage`.
- Future seeded examples can be added without changing the user-created contract shape.

## Failure Modes

### Empty Seed Catalogue

Occurs when:

- the bundled example source is unavailable
- no valid example graphs can be produced

Expected behavior:

- the Load panel remains usable
- user-created contracts still render
- the UI explains that no example contracts are currently available

### Invalid Seeded Entry

Occurs when:

- a bundled example references unsupported node types or invalid handles

Expected behavior:

- the invalid seeded entry is excluded from the visible seeded list
- the rest of the library remains usable
- the failure is diagnosable in development/test coverage
