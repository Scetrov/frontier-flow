# 1. Data Model: Optional GitHub Auth for Rate-Limit Recovery

## 1.1. GitHub Access State

| Field              | Type                                                                                               | Description                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `mode`             | `"anonymous" \| "authenticating" \| "authenticated" \| "reauth-required"`                          | Current user-visible GitHub access mode.                                                 |
| `indicatorVariant` | `"neutral" \| "active" \| "warning" \| "error"`                                                    | Persistent header indicator styling state.                                               |
| `grantedScopes`    | `string[]`                                                                                         | Granted OAuth scopes returned by GitHub for this session.                                |
| `verifiedAt`       | `number \| null`                                                                                   | Timestamp of the last successful token validation.                                       |
| `loginLabel`       | `string \| null`                                                                                   | Optional display label for the authenticated account if the product chooses to show one. |
| `lastFailureKind`  | `"rate-limit" \| "bad-credentials" \| "insufficient-permission" \| "network" \| "unknown" \| null` | Most recent GitHub failure classification.                                               |

### 1.1.1. Validation Rules

- `authenticated` requires `verifiedAt` to be present.
- `reauth-required` requires `lastFailureKind` to be non-null.
- `grantedScopes` must default to an empty list for anonymous mode.

## 1.2. GitHub OAuth Session

| Field             | Type                                                            | Description                                                               |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `oauthState`      | `string`                                                        | CSRF protection nonce generated before the authorize redirect.            |
| `accessToken`     | `string`                                                        | Bearer token kept in memory only on the client after callback completion. |
| `tokenType`       | `"bearer"`                                                      | Token type expected for GitHub API requests.                              |
| `scopeHeader`     | `string`                                                        | Raw GitHub scope header returned during validation.                       |
| `status`          | `"pending" \| "active" \| "cancelled" \| "revoked" \| "failed"` | Lifecycle of the current auth session.                                    |
| `validatedUserId` | `number \| null`                                                | Authenticated GitHub user identifier when validation succeeds.            |

### 1.2.1. Validation Rules

- `active` sessions require a non-empty `accessToken` and successful validation metadata.
- `cancelled`, `revoked`, and `failed` sessions must clear `accessToken` from client memory.
- `oauthState` must be single-use and discarded after callback processing completes.

## 1.3. Pending GitHub Retry Context

| Field          | Type                                                      | Description                                                                          |
| -------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `requestId`    | `string`                                                  | Stable identifier for the blocked GitHub-backed request.                             |
| `workflow`     | `"compile" \| "dependency-fetch" \| "deploy-grade-fetch"` | Originating workflow that hit the limit.                                             |
| `resource`     | `string`                                                  | Human-readable description of the blocked GitHub resource.                           |
| `capturedAt`   | `number`                                                  | Timestamp when the blocked request was recorded.                                     |
| `retryCount`   | `number`                                                  | Number of post-auth recovery attempts already made.                                  |
| `uiReturnHint` | `string \| null`                                          | Optional route or panel hint needed to keep the user in the same context after auth. |

### 1.3.1. Validation Rules

- Only one pending retry context is active at a time for this feature slice.
- `retryCount` must not exceed `1`.
- Context lives in `sessionStorage` only and is removed after success, cancellation, or fallback.

## 1.4. GitHub Failure Classification

| Field                | Type                                                                                       | Description                                        |
| -------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `httpStatus`         | `number`                                                                                   | GitHub response status observed by the client.     |
| `kind`               | `"rate-limit" \| "bad-credentials" \| "insufficient-permission" \| "network" \| "unknown"` | Normalized failure category.                       |
| `rateLimitRemaining` | `number \| null`                                                                           | Parsed `x-ratelimit-remaining` value when present. |
| `resetAt`            | `number \| null`                                                                           | Parsed GitHub reset timestamp when present.        |
| `messageKey`         | `string`                                                                                   | UI message key used for user guidance.             |

### 1.4.1. Validation Rules

- `rate-limit` should capture `rateLimitRemaining === 0` when the header exists.
- `bad-credentials` and `insufficient-permission` must not trigger the rate-limit recovery CTA.

## 1.5. State Transitions

1. `anonymous -> authenticating`
   Trigger: user clicks header sign-in or rate-limit CTA.
2. `authenticating -> authenticated`
   Trigger: callback exchange succeeds, validation succeeds, and the pending retry context is still valid.
3. `authenticating -> anonymous`
   Trigger: user cancels or the callback returns an OAuth error before a token is active.
4. `authenticated -> reauth-required`
   Trigger: GitHub returns revoked, expired, or otherwise invalid-session failures.
5. `reauth-required -> authenticating`
   Trigger: user explicitly retries sign-in.
6. `authenticated -> anonymous`
   Trigger: user signs out and the app clears in-memory token state and sync signals.
