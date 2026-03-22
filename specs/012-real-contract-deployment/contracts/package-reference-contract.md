# Contract: Published Target Reference Data

## Purpose

Define the maintained source-data contract for Stillness and Utopia deployment preparation in a Sui publishing workflow.

## Bundle Schema

Each published-target bundle must provide:

- `targetId`: `testnet:stillness` or `testnet:utopia`
- `environmentLabel`: user-facing target label
- `worldPackageId`: published world package identifier
- `objectRegistryId`: object registry identifier used by follow-on flows when required
- `serverAddressRegistryId`: server address registry identifier used by follow-on flows when required
- `source`: authoritative verification source
- `lastVerifiedOn`: ISO date of last verification

## Validation Rules

- Every identifier must be a non-empty `0x`-prefixed hex string.
- Each `targetId` must appear at most once.
- Bundles must exist only for targets explicitly supported by the feature spec.
- Missing or malformed bundle data must block deployment before submission.

## Update Rules

- Bundle updates must be made in maintained source data, not in UI components or runtime fetches.
- Verification must use the authoritative published source for Stillness and Utopia package identifiers.
- Any change to bundle shape or semantics must update deployment validation and affected tests.

## Local Target Rules

- `local` must not rely on a published bundle in this contract.
- Local deployment preparation must resolve world-package dependencies through local development wiring rather than published target references.
- Local target readiness must still be validated before submission begins.
