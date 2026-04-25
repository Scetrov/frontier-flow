# 1. Research: Optional GitHub Auth for Rate-Limit Recovery

## 1.1. GitHub Authentication Mechanism

- **Decision**: Use GitHub OAuth 2.0 authorization code flow with a Netlify callback function, and prefer a popup-based completion path so the main app tab stays alive.
- **Rationale**: Rate-limit relief requires a bearer token for GitHub API requests, not OIDC-only identity. A Netlify function keeps the client secret out of the browser and matches the repository's documented deployment model. Popup completion best satisfies the spec requirement to preserve in-progress workspace context.
- **Alternatives considered**: Pure client-side exchange was rejected because the browser cannot safely hold the secret. OIDC-only login was rejected because identity alone does not authorize authenticated GitHub API fetches. Full-page redirect remains a fallback path only if popup completion is blocked.

## 1.2. Minimum GitHub Permissions

- **Decision**: Start with GitHub OAuth `(no scope)` for the initial rate-limit recovery rollout.
- **Rationale**: The current feature only needs authenticated access to public GitHub resources and the elevated authenticated rate limit. GitHub documents that `(no scope)` grants read-only access to public information, which keeps user friction and perceived risk lower than requesting repository scopes. This aligns with `FR-011`.
- **Alternatives considered**: `read:user` was rejected for the initial scope set because the feature does not require private profile data. `public_repo` and `repo` were rejected because this spec does not include repository write workflows.

## 1.3. Token Validation and Recovery

- **Decision**: Validate the exchanged token immediately with an authenticated GitHub API request, then retry exactly one pending blocked GitHub fetch context.
- **Rationale**: The spec requires proving the newly authenticated session is actually usable before calling recovery successful. A post-exchange validation call lets the client confirm token validity and inspect granted scope/rate-limit headers before replaying the blocked request. A single targeted retry avoids hidden loops.
- **Alternatives considered**: Blindly assuming the exchange succeeded was rejected because it can misclassify bad credentials or insufficient permissions as success. Full app reload after sign-in was rejected because it would weaken workspace continuity.

## 1.4. Rate-Limit Classification

- **Decision**: Reuse the existing `403` and `429` rate-limit heuristics in `src/compiler/moveBuilderLite.ts` and `src/compiler/moveCompiler.ts`, then harden classification with response metadata when available.
- **Rationale**: The current compiler path already treats `429`, `403 + rate limit`, and `too many requests` bodies as rate-limit failures. The auth feature should build on that logic, then distinguish rate-limit failures from permission-denied and invalid-session failures using status codes, `x-ratelimit-remaining`, and response messages.
- **Alternatives considered**: Replacing the existing classification logic wholesale was rejected because the repo already has tested behavior in the compiler path. Treating every `403` as rate limiting was rejected because it would produce misleading recovery prompts.

## 1.5. Session Storage and Cross-Tab Sync

- **Decision**: Keep the access token in memory only, store one non-secret pending retry context in `sessionStorage`, and use a non-secret auth-state sync signal across tabs.
- **Rationale**: The constitution and spec both prioritize zero logged secrets and minimal durable storage. In-memory token handling keeps the most sensitive value out of long-lived browser storage. `sessionStorage` is sufficient for the single blocked retry context. Cross-tab sync only needs a timestamped status signal, not the token itself.
- **Alternatives considered**: Storing the token in `localStorage` or IndexedDB was rejected because it broadens the XSS blast radius. Ignoring cross-tab sync was rejected because the spec explicitly includes multi-tab behavior.

## 1.6. Netlify Callback Boundary

- **Decision**: Add `netlify/functions/github-callback.ts` as the OAuth exchange boundary and expose it through an app-facing callback route such as `/api/github-callback` mapped in `netlify.toml`.
- **Rationale**: This keeps the browser-only app small, lets Netlify own secret access, and matches existing deployment docs that already describe a Netlify callback for GitHub auth. The function should validate the OAuth `state` value, reject unexpected origins, avoid stack-trace leakage, and return only the minimal data needed by the opener window.
- **Alternatives considered**: Sending users directly to `/.netlify/functions/...` without an app-level route was rejected because the repo docs already describe a cleaner callback URL. Building a separate backend service was rejected because Netlify already satisfies the hosting model.
