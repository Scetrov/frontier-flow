## ADDED Requirements

### Requirement: Logic published by another account reports whether it has been exercised
Before a turret owner authorizes a turret extension published by another account, the application MUST state whether that contract has produced a simulation result in the current session, and MUST point at the existing simulation action as the way to produce one. A simulation result belonging to a different contract MUST NOT be reported as covering the selected one.

The application MUST NOT prevent authorization on the grounds that a contract has not been simulated, and MUST NOT present a verdict about whether a contract's behaviour is acceptable. Simulation output remains the player's to read.

This requirement adds no simulation capability: it reports on the existing turret simulation, which calls an extension's target-priority entry point directly and therefore does not require the extension to be authorized first.

#### Scenario: Shared logic has not been exercised
- **WHEN** a turret owner has selected a contract saved from another account and no simulation result exists for it in this session
- **THEN** the application says so before the authorize action, and directs the owner to simulate a turret against a candidate

#### Scenario: Shared logic has been exercised
- **WHEN** a simulation for the selected shared contract has produced a result in this session
- **THEN** the application says the contract has been simulated, and invites a further run against a different candidate

#### Scenario: A result for a different contract
- **WHEN** the most recent simulation result belongs to a contract other than the one selected
- **THEN** the selected contract is still reported as not exercised

#### Scenario: Authorization is never blocked
- **WHEN** a turret owner authorizes a shared contract that has not been simulated
- **THEN** the authorization proceeds, having been reported rather than prevented

#### Scenario: The wallet's own deployment
- **WHEN** the selected contract is the wallet's own deployment rather than one saved from another account
- **THEN** no shared-logic simulation advisory is shown
