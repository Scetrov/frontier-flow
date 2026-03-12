---
title: Frontier Flow - Security Controls
version: 1.0.0
status: active
created: 2026-02-22
updated: 2026-02-22
author: Scetrov
description: Required security controls, tooling, and processes for the Frontier Flow project.
---

## Table of Contents

1. [Overview](#1-overview)
2. [Dependency Management & Supply Chain](#2-dependency-management--supply-chain)
3. [CI/CD Pipeline Security](#3-cicd-pipeline-security)
4. [Test Coverage Requirements](#4-test-coverage-requirements)
5. [Security Headers](#5-security-headers)
6. [Attestations & Provenance](#6-attestations--provenance)
7. [Application-Level Controls](#7-application-level-controls)
8. [Secret Management](#8-secret-management)
9. [Monitoring & Incident Response](#9-monitoring--incident-response)
10. [Compliance Checklist](#10-compliance-checklist)

---

## 1. Overview

This document defines the **mandatory security controls** for the Frontier Flow project. Because the application generates and deploys Sui Move smart contracts directly from the browser, the security surface spans:

- **Client-side web application** (React, Vite, Tailwind)
- **In-browser WASM compilation** (`@zktx.io/sui-move-builder`)
- **Blockchain transactions** (Sui deployment via `@mysten/dapp-kit`)
- **Third-party OAuth** (GitHub integration via Netlify Functions)
- **Supply chain** (package dependencies, WASM binaries)

Every feature merged into the `main` branch **must** satisfy the controls documented below. Deviations require explicit sign-off in the relevant pull request.

---

## 2. Dependency Management & Supply Chain

### 2.1 Dependabot

Dependabot **must** be enabled on the repository with the following configuration:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    reviewers:
      - "Scetrov"
    labels:
      - "dependencies"
      - "security"
    # Group minor/patch updates to reduce PR noise
    groups:
      production:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"
    # Security updates are always auto-raised regardless of schedule
    allow:
      - dependency-type: "direct"
      - dependency-type: "indirect"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 2.2 Dependency Pinning

| Requirement                              | Detail                                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lock files**                           | `bun.lockb` **must** be committed and used for deterministic installs (`bun install --frozen-lockfile`)                                                                                            |
| **Exact versions for critical packages** | Pin `@zktx.io/sui-move-builder`, `@mysten/sui`, and `@mysten/dapp-kit` to exact versions — no caret (`^`) or tilde (`~`). These packages directly affect on-chain bytecode and wallet transactions |
| **Integrity hashes**                     | Use `bun pm trust` and registry signature verification where available                                                                                                                             |

### 2.3 Supply Chain Hardening

| Control                      | Implementation                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dependency audit**         | Run `bunx npm-audit --audit-level=high` in CI. **Fail the build** on high/critical vulnerabilities                                                                                            |
| **Socket.dev or Snyk**       | Integrate a supply chain analysis tool that detects typosquatting, install scripts, and protestware                                                                                           |
| **WASM binary verification** | Self-host or checksum-verify the `sui-move-builder` WASM binary. Compare SHA-256 of the loaded WASM against a known-good hash before execution (see [RISK-REGISTER R-11](./RISK-REGISTER.md)) |
| **Provenance metadata**      | Prefer packages that publish [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements). Track provenance adoption among critical dependencies                    |

---

## 3. CI/CD Pipeline Security

### 3.1 GitHub Actions Workflow

A CI pipeline **must** run on every pull request targeting `main` and on every push to `main`:

```yaml
# .github/workflows/ci.yml (outline)
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx tsc -b

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx vitest run --coverage

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx npm-audit --audit-level=high

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test, audit]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build
```

### 3.2 Pipeline Security Controls

| Control                    | Requirement                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Minimum permissions**    | Workflows use `permissions: contents: read`. Write permissions are granted only to specific jobs that need them |
| **Pinned action versions** | All `uses:` references pin to full commit SHAs, not tags (e.g., `actions/checkout@<sha>`)                       |
| **No secrets in logs**     | Use `::add-mask::` for any dynamic secret. CI must never print tokens, keys, or OAuth secrets                   |
| **Branch protection**      | `main` branch requires: passing CI, at least 1 approval, signed commits, no force-push                          |
| **Signed commits**         | All commits **must** be GPG-signed per [CONSTITUTION §8](./CONSTITUTION.md)                                     |

### 3.3 Netlify Deployment Security

| Control                   | Detail                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build command**         | `bun install --frozen-lockfile && bun run build` (deterministic installs)                                                                             |
| **Environment variables** | `GITHUB_CLIENT_SECRET` stored in Netlify environment, **never** in repository                                                                         |
| **Deploy previews**       | Limited to trusted contributors. Preview URLs must not expose production secrets                                                                      |
| **Function security**     | Netlify serverless function for OAuth token exchange must validate `Origin` / `Referer`, enforce strict CORS, and never return raw error stack traces |

---

## 4. Test Coverage Requirements

### 4.1 Coverage Thresholds

| Metric         | Minimum | Target |
| -------------- | ------- | ------ |
| **Statements** | 70%     | 85%    |
| **Branches**   | 65%     | 80%    |
| **Functions**  | 75%     | 90%    |
| **Lines**      | 70%     | 85%    |

CI **must** fail if coverage drops below the minimum thresholds.

### 4.2 Test Categories

| Category            | Tool                     | Scope                                                                                       |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| **Unit tests**      | Vitest                   | Code generator, layout engine, socket validation, AST optimizer, utility functions          |
| **Snapshot tests**  | Vitest                   | Generated Move code output for standard graph configurations                                |
| **Component tests** | Vitest + Testing Library | React component rendering, user interactions, modal behaviour                               |
| **E2E tests**       | Playwright               | Full canvas workflows — drag-and-drop, connection validation, code preview, deployment flow |
| **Security tests**  | Custom Vitest suite      | Input sanitisation, XSS prevention, Move code injection checks                              |

### 4.3 Security-Specific Test Cases

The following scenarios **must** have dedicated test coverage:

- Node labels containing Move syntax injection (e.g., `"); abort 0; //`)
- Node labels with HTML/script tags (XSS vectors)
- Socket connections violating the type compatibility matrix
- Malformed graph topologies passed to the code generator
- React components rendering untrusted `data.label` values without `dangerouslySetInnerHTML`

---

## 5. Security Headers

### 5.1 Required HTTP Headers

The following headers **must** be configured on the hosting platform (Netlify `_headers` file or `netlify.toml`):

```toml
# netlify.toml [headers] section or _headers file
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "0"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
```

### 5.2 Content Security Policy (CSP)

A strict CSP **must** be applied. The policy should be tailored for the WASM execution and Sui wallet integration:

```toml
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self'
    https://api.github.com
    https://raw.githubusercontent.com
    https://*.suifrens.com
    https://*.sui.io
    https://faucet.*.sui.io
    https://fullnode.*.sui.io;
  img-src 'self' data: blob:;
  worker-src 'self' blob:;
  object-src 'none';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

[!IMPORTANT]
The `'wasm-unsafe-eval'` directive is required for the in-browser Move compiler. This is the minimum relaxation needed for WASM execution; do **not** use the broader `'unsafe-eval'`.

### 5.3 Subresource Integrity (SRI)

- All externally loaded scripts and stylesheets **must** include `integrity` and `crossorigin` attributes
- The Vite build pipeline should generate SRI hashes for production assets when deployed to CDN

---

## 6. Attestations & Provenance

### 6.1 Build Attestations

| Attestation                    | Implementation                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SLSA Build Provenance**      | Use `actions/attest-build-provenance@v2` to generate SLSA v1.0 provenance for production builds. The attestation links the deployed artefact to the exact source commit, builder identity, and build parameters |
| **Container/artefact signing** | If Docker images or standalone artefacts are published, sign them using `cosign` or Sigstore                                                                                                                    |

### 6.2 Dependency Attestations

| Attestation            | Implementation                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Package provenance** | When publishing any internal packages, use `--provenance` flag with `npm publish` (or equivalent Bun publishing workflow)                             |
| **SBOM generation**    | Generate a Software Bill of Materials (SBOM) in CycloneDX or SPDX format as part of the release process. Use `@cyclonedx/cyclonedx-npm` or equivalent |
| **Dependency review**  | Enable `actions/dependency-review-action@v4` on pull requests to block PRs that introduce known vulnerable dependencies                               |

### 6.3 Release Attestation Workflow

```yaml
# .github/workflows/release.yml (outline)
name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: read
  id-token: write
  attestations: write

jobs:
  build-and-attest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build

      - name: Generate SBOM
        run: bunx @cyclonedx/cyclonedx-npm --output-file dist/sbom.json

      - name: Attest Build Provenance
        uses: actions/attest-build-provenance@v2
        with:
          subject-path: "dist/"
```

---

## 7. Application-Level Controls

### 7.1 Code Generation Safety

| Control                       | Detail                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Input sanitisation**        | All user-supplied values (node labels, field inputs) entering the Emitter phase **must** be validated against a strict allowlist: `/^[a-zA-Z_][a-zA-Z0-9_]*$/` |
| **No dynamic code execution** | Per [CONSTITUTION §5](./CONSTITUTION.md), user input must never be dynamically evaluated or executed. Template interpolation must be explicitly escaped        |
| **AST validation**            | The Constraint Engine (Phase 3) validates graph completeness _before_ code emission. Invalid topologies are rejected with user-friendly error messages         |

### 7.2 OAuth & Token Security

| Control              | Detail                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| **Token storage**    | GitHub OAuth tokens are held **in memory only** — never in `localStorage`, `sessionStorage`, or cookies |
| **Token scope**      | Request the minimum GitHub OAuth scopes needed (e.g., `repo` for persistence, `read:user` for identity) |
| **CORS enforcement** | The Netlify OAuth function validates `Origin` against an allowlist of production domains                |
| **Token expiry**     | Implement token refresh or re-authentication prompts. Never assume tokens are perpetually valid         |
| **PKCE**             | Use Proof Key for Code Exchange (PKCE) in the OAuth flow to prevent authorisation code interception     |

### 7.3 Wallet & Transaction Security

| Control                    | Detail                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User confirmation**      | Every blockchain transaction (publish or upgrade) **must** require explicit wallet approval via the `dapp-kit` signing prompt. The app must never auto-sign |
| **Transaction preview**    | Display the full generated Move source code to the user before compilation and deployment                                                                   |
| **UpgradeCap persistence** | Store `UpgradeCap` references via GitHub persistence in addition to IndexedDB to prevent bricked contracts (see [RISK-REGISTER R-08](./RISK-REGISTER.md))   |
| **Network awareness**      | Clearly display the active network (localnet/devnet/testnet/mainnet). Require an additional confirmation step when deploying to mainnet                     |

### 7.4 XSS & Injection Prevention

| Control                          | Detail                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| **React escaping**               | Rely on React's default JSX escaping for all rendered content                                     |
| **No `dangerouslySetInnerHTML`** | Explicitly prohibited unless targeting a sandboxed `<iframe>`. Audit enforced via ESLint rule     |
| **Sanitise on input**            | Sanitise node labels and user-provided data fields at the point of entry, not just at render time |

---

## 8. Secret Management

| Secret                         | Storage                          | Access                    |
| ------------------------------ | -------------------------------- | ------------------------- |
| **GitHub OAuth Client ID**     | Public (embedded in client code) | Frontend                  |
| **GitHub OAuth Client Secret** | Netlify environment variable     | Serverless function only  |
| **GitHub Access Tokens**       | In-memory only                   | Frontend (per-session)    |
| **Sui Wallet Private Keys**    | User's wallet extension          | Never accessed by the app |

**Rules:**

1. No secrets in source code, configuration files, or build logs
2. `.env` files are listed in `.gitignore` and never committed
3. CI/CD secrets use GitHub Encrypted Secrets or Netlify environment variables
4. All secret access patterns are auditable through code review

---

## 9. Monitoring & Incident Response

### 9.1 Automated Monitoring

| Monitor                        | Tool                                                   | Frequency         |
| ------------------------------ | ------------------------------------------------------ | ----------------- |
| **Dependency vulnerabilities** | Dependabot + `bunx npm-audit`                          | Weekly + every PR |
| **GitHub Actions security**    | `actions/dependency-review-action`                     | Every PR          |
| **CSP violations**             | `report-uri` directive in CSP header                   | Real-time         |
| **Error tracking**             | Error Boundary component + optional Sentry integration | Real-time         |

### 9.2 Incident Response

| Step            | Action                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **1. Detect**   | Automated alert from Dependabot, dependency audit, or CSP violation report                            |
| **2. Triage**   | Assess severity using the [Risk Assessment Framework](./RISK-REGISTER.md#1-risk-assessment-framework) |
| **3. Contain**  | Revert or disable affected feature via feature flag or rollback deployment                            |
| **4. Fix**      | Apply patch, update dependencies, or modify security controls                                         |
| **5. Verify**   | Run full CI pipeline + manual verification                                                            |
| **6. Document** | Update [RISK-REGISTER.md](./RISK-REGISTER.md) with a new or revised risk entry                        |

### 9.3 Vulnerability Disclosure

This project follows a responsible disclosure process:

- Security vulnerabilities should be reported via **GitHub Security Advisories** (private)
- Do **not** open public issues for security vulnerabilities
- Maintainers will acknowledge receipt within **48 hours** and provide an initial assessment within **5 business days**

---

## 10. Compliance Checklist

A quick-reference checklist for PR reviewers and release managers:

| #   | Control                                                              | Status |
| --- | -------------------------------------------------------------------- | ------ |
| 1   | Dependabot enabled and configured                                    | ☐      |
| 2   | `bun.lockb` committed and used in CI                                 | ☐      |
| 3   | Critical dependencies pinned to exact versions                       | ☐      |
| 4   | Dependency audit runs in CI (fail on high/critical)                  | ☐      |
| 5   | WASM binary checksum verified                                        | ☐      |
| 6   | CI runs lint, typecheck, test, audit on every PR                     | ☐      |
| 7   | Branch protection enforced on `main`                                 | ☐      |
| 8   | All commits GPG-signed                                               | ☐      |
| 9   | Test coverage meets minimum thresholds                               | ☐      |
| 10  | Security-specific test cases present                                 | ☐      |
| 11  | Security headers configured (`X-Frame-Options`, `CSP`, `HSTS`, etc.) | ☐      |
| 12  | CSP includes `wasm-unsafe-eval` (not `unsafe-eval`)                  | ☐      |
| 13  | SRI applied to external resources                                    | ☐      |
| 14  | SLSA build provenance generated for releases                         | ☐      |
| 15  | SBOM generated for releases                                          | ☐      |
| 16  | Dependency review action enabled on PRs                              | ☐      |
| 17  | Node label input sanitisation enforced                               | ☐      |
| 18  | No `dangerouslySetInnerHTML` in codebase                             | ☐      |
| 19  | OAuth tokens stored in memory only                                   | ☐      |
| 20  | No secrets in source code or logs                                    | ☐      |
| 21  | Mainnet deployment requires additional confirmation                  | ☐      |
| 22  | Vulnerability disclosure process documented                          | ☐      |

---

[!IMPORTANT]
This document is a living specification. Controls must be revisited whenever new features are introduced, dependencies are updated, or the deployment model changes. All `🔴 High` risks in the [Risk Register](./RISK-REGISTER.md) must have corresponding controls documented here.
