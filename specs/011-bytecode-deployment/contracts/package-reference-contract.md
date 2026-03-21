# Contract: Deployment Target Package References

## Purpose

Define the maintained data contract for environment-specific package references required to validate and prepare bytecode deployment for Stillness and Utopia.

## Bundle Schema

Each published target bundle must provide:

- `targetId`: `testnet:stillness` or `testnet:utopia`
- `environmentLabel`: user-facing environment name
- `worldPackageId`: required world package identifier
- `objectRegistryId`: object registry identifier if deployment readiness checks depend on it
- `serverAddressRegistryId`: server address registry identifier if downstream integration depends on it
- `source`: authoritative publication reference
- `lastVerifiedOn`: ISO calendar date of last verification

## Validation Rules

- Every identifier must be a non-empty `0x`-prefixed hex string.
- `targetId` values must be unique across bundles.
- Bundles must only be shipped for environments explicitly supported by the feature spec.
- If a required field is missing or invalid, deployment to that target is blocked.

## Update Rules

- Updates to Stillness or Utopia package references must be performed in the maintained source data module, not in UI components.
- Verification must use the published EVE Frontier resources page.
- Changes to package-reference semantics must update deployment tests that depend on those values.

## Local Target Rules

- `local` does not require a published bundle in this contract.
- Local deployment validation must still confirm that the local environment is configured and reachable before launch.
