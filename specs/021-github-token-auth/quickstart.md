# 1. Quickstart: Optional GitHub Auth for Rate-Limit Recovery

## 1.1. Prerequisites

1. Configure a GitHub OAuth app with a callback URL that points at the Netlify-hosted callback route for this environment.
2. Add the public client identifier to the app runtime configuration.
3. Add the GitHub client secret to Netlify environment variables only.
4. Decide whether local end-to-end verification will use Netlify Dev or a deploy preview.

## 1.2. Local Development Path

1. Run the app with `bun dev` for normal client iteration.
2. Keep unit and component tests mocked by default; do not require real GitHub credentials for local test runs.
3. When callback behavior must be verified end to end, run the feature in Netlify Dev if available, or use a Netlify deploy preview with environment variables configured.

## 1.3. Core Verification Flow

1. Start anonymous and trigger a compiler or file-fetch path that can surface a GitHub rate-limit failure.
2. Confirm the UI shows a recovery CTA instead of forcing sign-in up front.
3. Start GitHub sign-in from either the header action or the rate-limit CTA.
4. Complete the OAuth flow and verify the popup returns control to the original workspace context.
5. Confirm the previously blocked workflow retries once and either succeeds or shows a specific non-rate-limit failure.
6. Confirm the persistent header indicator reflects the authenticated state.

## 1.4. Edge Verification Flow

1. Cancel sign-in and confirm the app returns to anonymous mode without losing workspace context.
2. Simulate revoked or invalid credentials and confirm the app drops to re-auth-required or anonymous guidance instead of showing a rate-limit message.
3. Open a second tab, change auth state in the first tab, and confirm the second tab updates its non-secret status indicator correctly.
4. Sign out and confirm the app clears in-memory auth state, removes session-scoped retry data, and falls back to anonymous access.

## 1.5. Test Suite Expectations

1. Add Vitest coverage for the callback handler, auth state transitions, and fetch classification.
2. Add React Testing Library coverage for header actions, CTA behavior, and accessible status text.
3. Add or extend Playwright coverage only if the browser workflow changes materially enough that unit and component tests cannot prove the recovery path.

## 1.6. Verified Notes

1. Focused Vitest coverage now exercises the Netlify callback bridge, auth hook/storage/client helpers, header sign-in state, compiler token injection, and one-shot blocked rebuild recovery.
2. The browser session keeps the GitHub OAuth token in memory only. A non-secret auth status snapshot is shared through `localStorage`, and the pending retry context remains session-scoped in `sessionStorage`.
3. The preferred recovery path is popup sign-in from either the persistent header action or the rate-limit notice. Successful sign-in retries one blocked compile once and then clears the pending retry record.
