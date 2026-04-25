# 1. Contract: GitHub Auth and Recovery Interfaces

## 1.1. Purpose

This contract defines the external behavior between the browser, GitHub OAuth, and the Netlify callback used for optional GitHub-authenticated file access.

## 1.2. Authorization Request Contract

**Initiator**: Browser application  
**Target**: GitHub OAuth authorize endpoint  
**Method**: `GET`

### Required query parameters

| Parameter      | Source                      | Notes                                                    |
| -------------- | --------------------------- | -------------------------------------------------------- |
| `client_id`    | Public client configuration | Public GitHub OAuth app identifier.                      |
| `redirect_uri` | Client configuration        | Must resolve to the Netlify callback route for this app. |
| `state`        | Client-generated            | Single-use CSRF nonce tied to the current auth attempt.  |

### Optional query parameters

| Parameter | Notes                                                    |
| --------- | -------------------------------------------------------- |
| `scope`   | Omit or keep empty for the initial `(no scope)` rollout. |

## 1.3. Netlify Callback Contract

**Public route**: `/api/github-callback`  
**Netlify implementation**: `netlify/functions/github-callback.ts`  
**Method**: `GET`

### Request query parameters

| Parameter           | Required       | Description                                                                  |
| ------------------- | -------------- | ---------------------------------------------------------------------------- |
| `code`              | Yes on success | OAuth authorization code from GitHub.                                        |
| `state`             | Yes            | Must match the client-generated nonce for the active auth attempt.           |
| `error`             | No             | GitHub OAuth error code when the user denies or the authorize request fails. |
| `error_description` | No             | Optional GitHub error description for debugging-safe user guidance.          |

### Success behavior

1. Validate `state` against the active auth attempt.
2. Exchange `code` with GitHub using server-side credentials.
3. Validate the resulting token with a lightweight authenticated GitHub API request.
4. Return a minimal popup bridge response that sends the opener window a success message and closes itself.

### Popup bridge success payload

```json
{
  "type": "ff:github-auth:success",
  "scopeHeader": "",
  "verifiedAt": 1760000000000,
  "loginLabel": "optional-public-identity",
  "token": "memory-only-access-token"
}
```

### Failure payload

```json
{
  "type": "ff:github-auth:error",
  "reason": "invalid_state | oauth_denied | exchange_failed | validation_failed",
  "message": "user-safe error message"
}
```

## 1.4. Browser Recovery Contract

### Pending retry context

The browser may persist one session-scoped pending retry record with the following shape:

```json
{
  "requestId": "compile:raw-github:123",
  "workflow": "compile",
  "resource": "sui-framework dependency file",
  "capturedAt": 1760000000000,
  "retryCount": 0,
  "uiReturnHint": "compiler-status"
}
```

### Post-auth retry rules

1. Only retry after a successful validation step.
2. Retry exactly once per pending retry context.
3. If retry still fails with a non-rate-limit error, clear the auth success state and present the specific failure guidance.

## 1.5. Cross-Tab Auth Sync Contract

### Non-secret sync signal

The app may publish a non-secret browser signal to notify other tabs that auth state changed:

```json
{
  "event": "github-auth-state-changed",
  "changedAt": 1760000000000,
  "mode": "authenticated"
}
```

### Rules

1. The signal must never contain the access token.
2. Other tabs treat the signal as a cue to re-read non-secret auth state and refresh UI.
3. Tabs that do not hold an active token must remain in anonymous mode until they explicitly complete their own validated session flow or adopt an approved shared-session design.
