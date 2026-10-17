## ADDED Requirements

### Requirement: The authorize view is reachable without a deployment of one's own
The application MUST allow a turret owner to open the authorize view when they hold no deployment of their own, so that a shared extension can be added and used. Navigation to the authorize view MUST NOT be gated on the presence of a local deployment record. The simulate view MUST remain gated on having a contract to run against — either the player's own deployment or a saved shared extension — and any message explaining that gate MUST name both routes rather than only deployment.

#### Scenario: Player with no deployment opens authorize
- **WHEN** a turret owner who has never deployed a contract requests the authorize view
- **THEN** the view opens, and no redirect to the visual or deploy view occurs

#### Scenario: Simulate is gated while authorize is not
- **WHEN** a turret owner holds neither a deployment nor a saved shared extension
- **THEN** the authorize view remains available, the simulate view is unavailable, and the explanation names both deploying a contract and adding a shared logic package

#### Scenario: Simulate becomes available through a shared extension
- **WHEN** a turret owner with no deployment of their own saves a shared extension
- **THEN** the simulate view becomes available without any deployment being created

#### Scenario: Restored session preserves authorize
- **WHEN** the application restarts with a persisted authorize view and no deployment of the player's own
- **THEN** the authorize view is restored rather than replaced by the visual view

#### Scenario: Restored session discards an unusable simulate view
- **WHEN** the application restarts with a persisted simulate view, no deployment, and no saved shared extension
- **THEN** the visual view is presented instead, and the simulate view is not mounted first
