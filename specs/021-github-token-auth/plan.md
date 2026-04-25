# 1. Implementation Plan: Optional GitHub Auth for Rate-Limit Recovery

**Branch**: `021-github-token-auth` | **Date**: 2026-04-25 | **Spec**: `/specs/021-github-token-auth/spec.md`
**Input**: Feature specification from `/specs/021-github-token-auth/spec.md`

## 2. Summary

Implement optional GitHub OAuth authentication for GitHub-backed file and dependency fetches in the Netlify-deployed TypeScript app. The solution keeps anonymous access as the default path, adds a persistent header sign-in/status surface, presents a rate-limit recovery call to action when existing compiler fetches hit GitHub limits, and uses a small Netlify function to exchange the OAuth authorization code without exposing secrets in the browser.

## 3. Technical Context

**Language/Version**: TypeScript `~6.0.2` (strict, ES Modules), React `19.2.0`  
**Primary Dependencies**: React, `@tanstack/react-query`, `@zktx.io/sui-move-builder`, Rolldown Vite, `@netlify/functions` (planned)  
**Storage**: In-memory auth state, `sessionStorage` for pending retry context, existing browser `localStorage` keys for workspace/UI persistence, Netlify environment variables for secrets  
**Testing**: Vitest, React Testing Library, Playwright  
**Target Platform**: Browser SPA deployed on Netlify plus Netlify Functions Node runtime  
**Project Type**: Web application with serverless OAuth callback  
**Performance Goals**: Resume a blocked GitHub fetch workflow within 2 minutes after successful sign-in; avoid full-page workspace loss during the preferred auth path; limit recovery to one targeted post-auth retry per blocked request  
**Constraints**: GitHub auth remains optional; request minimum GitHub permissions; never log or durably persist secrets in the browser; preserve in-progress workspace context across auth; distinguish rate-limit failures from permission and credential failures; keep header controls keyboard accessible and screen-reader clear  
**Scale/Scope**: One Netlify callback function, one client auth state slice, one pending-retry context, targeted updates to header/status UI and GitHub fetch plumbing, plus unit/UI/integration coverage

## 4. Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Type Safety Above All**: PASS. Plan stays inside strict TypeScript with typed auth state, typed callback payloads, and no `any`.
- **Visual Feedback is Paramount**: PASS. Header indicator and rate-limit CTA provide immediate visible auth/recovery state.
- **Security by Default**: PASS. OAuth code exchange is isolated to Netlify, uses state validation, origin checks, and avoids secret logging or durable token persistence.
- **Test-First Quality**: PASS. Plan includes unit tests for callback and fetch classification, plus UI tests for header and recovery flows.
- **Accessibility & Inclusion**: PASS. Header sign-in/status control and recovery CTA remain keyboard reachable with explicit labels and status text.
- **Durability & Maintainability**: PASS. Existing workspace persistence remains source of truth; pending retry context is session-scoped and minimal.
- **Artifact Integrity & Lifecycle Separation**: PASS. Auth state only augments GitHub fetch and recovery behavior; it does not merge compile/deploy lifecycle channels.
- **Phase 0 Research Gate**: PASS.
- **Post-Phase 1 Design Re-check**: PASS.

## 5. Project Structure

### 5.1. Documentation

```text
specs/021-github-token-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── github-auth.md
└── tasks.md
```

### 5.2. Source Code

```text
netlify/
└── functions/
    ├── github-callback.ts
    └── __tests__/
        └── github-callback.test.ts

src/
├── App.tsx
├── compiler/
│   ├── moveBuilderLite.ts
│   └── moveCompiler.ts
├── components/
│   ├── Header.tsx
│   └── HeaderActionIcons.tsx
├── hooks/
│   └── useGitHubAuth.ts
├── types/
│   └── githubAuth.ts
├── utils/
│   ├── githubAuthClient.ts
│   └── githubAuthStorage.ts
└── __tests__/
    ├── App.compilation.test.tsx
    ├── Header.test.tsx
    ├── compiler/
    │   └── moveBuilderLite.test.ts
    └── hooks/
        └── useGitHubAuth.test.tsx
```

**Structure Decision**: Keep a single Vite/React application for UI and compiler fetch logic under `src/`, and add one Netlify function under `netlify/functions/` for the OAuth code exchange boundary. This matches the current repository shape, keeps secrets out of client code, and limits cross-cutting changes to the header, GitHub fetch path, and auth state plumbing.

## 6. Complexity Tracking

No constitution violations currently require justification.
