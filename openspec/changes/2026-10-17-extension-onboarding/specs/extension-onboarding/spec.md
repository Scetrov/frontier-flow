## ADDED Requirements

### Requirement: A published extension may be shared as an onboarding link
The application MUST provide a route that accepts a turret extension's package id, module name, and network as link parameters, and MUST resolve and verify that package through the same checks applied when a package id is entered by hand. The application MUST offer a way to produce such a link both for a saved shared extension and for a contract it has recorded as deployed to a supported network, and MUST NOT offer one for a deployment targeting a local validator. A link that omits any required parameter, or names a malformed package id, a malformed module, or an unsupported network, MUST be refused with the reason, and MUST NOT cause a network request.

#### Scenario: Turret owner opens a shared link
- **WHEN** a turret owner opens an onboarding link naming a published turret extension on a supported network
- **THEN** the package is resolved and verified, and the contract it names is presented for review

#### Scenario: Link is malformed
- **WHEN** an onboarding link omits a required parameter or carries a malformed one
- **THEN** the application reports which part of the link is unusable and issues no network request

#### Scenario: Author shares a saved extension
- **WHEN** the author of a saved shared extension asks for its onboarding link
- **THEN** the application produces a link naming that package, module, and network, which resolves to the same contract when opened

#### Scenario: Author shares a contract they just published
- **WHEN** a contract has been published to a supported network and its deployment is recorded
- **THEN** the application offers the onboarding link for it from the deployment status, naming that package, module, and network

#### Scenario: Nothing published, or published locally
- **WHEN** no deployment is recorded, or the recorded deployment targets a local validator
- **THEN** no onboarding link is offered, since no other player could reach that package

### Requirement: A link proposes a contract and never consents on the reader's behalf
The application MUST NOT save, select, or authorize anything as a consequence of opening an onboarding link. It MUST present the contract's name, module, full package id, and network, together with the statement that verification establishes identity and the `TurretAuth` declaration rather than the safety of the extension's behaviour, before any confirmation is offered. Saving the contract MUST require an explicit action by the reader, and authorizing turrets against it MUST remain a separate explicit action taken afterwards.

#### Scenario: Link is opened but not confirmed
- **WHEN** a turret owner opens an onboarding link and does not confirm it
- **THEN** no shared extension is saved, no view state is changed, and no turret is altered

#### Scenario: Reader confirms the contract
- **WHEN** the reader confirms a verified contract
- **THEN** it is saved as a shared extension and the authorize view is opened, where the reader still selects which turrets to authorize

#### Scenario: Reader is told what verification does not cover
- **WHEN** a verified contract is presented for review
- **THEN** the application states that only trusted logic should be authorized, and that the check confirms the package's identity and `TurretAuth` declaration rather than that its behaviour is safe

### Requirement: A link's claims are checked against the package
The application MUST compare the module named in the link with the module the resolved package declares, and MUST refuse the link when they differ, naming both. The application MUST NOT substitute the resolved module for the link's module, and MUST NOT authorize against a module the package does not declare.

#### Scenario: Link names a module the package does not declare
- **WHEN** resolution finds a different module than the link names
- **THEN** the application refuses the link, names the module the link carried and the module the package declares, and saves nothing

#### Scenario: Package cannot be verified
- **WHEN** the named package fails resolution, whether through identity mismatch, a missing `TurretAuth` witness, or an unreachable network
- **THEN** the application reports the reason resolution gave and saves nothing
