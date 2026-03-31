---
title: Frontier Flow - Deployment Guide
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-03-26
author: Scetrov
description: Deployment configuration, release process, and environment management for the Frontier Flow project.
---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Netlify Configuration](#2-netlify-configuration)
3. [Environment Variables](#3-environment-variables)
4. [Build Process](#4-build-process)
5. [Preview Deployments](#5-preview-deployments)
6. [Release Process](#6-release-process)
7. [Rollback Procedure](#7-rollback-procedure)
8. [Custom Domain & DNS](#8-custom-domain--dns)
9. [In-App Wallet Behaviour](#9-in-app-wallet-behaviour)

---

## 1. Architecture Overview

Frontier Flow is a **static single-page application** with one serverless function:

```mermaid
flowchart TB
    subgraph Netlify["Netlify CDN"]
        direction TB
        StaticAssets["Static Assets (dist/)"]
        AssetContent["- index.html, JS, CSS, WASM"]
        Serverless["Netlify Functions"]
        OAuthPath["- /api/github-callback"]
        OAuthDesc["  OAuth token exchange"]
        StaticAssets --AssetContent
        Serverless --OAuthPath
        OAuthPath --OAuthDesc
    end

    StaticAssets --GitHubAPI["GitHub API<br/>dependency fetch<br/>+ repo persistence"]
    Serverless --GitHubAPI

    StaticAssets --SuiRPC["Sui RPC Nodes<br/>devnet/testnet/mainnet"]
    Serverless --SuiRPC
```

---

## 2. Netlify Configuration

### 2.1 `netlify.toml`

```toml
[build]
  command = "bun run build"
  publish = "dist"

[build.environment]
  BUN_VERSION = "1.3.6"

# SPA routing: all paths serve index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers (see SECURITY.md §5)
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "0"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.github.com https://raw.githubusercontent.com https://*.suifrens.com https://*.sui.io https://faucet.*.sui.io https://fullnode.*.sui.io; img-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"

# Cache immutable hashed assets aggressively
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

The standard deployment build does not depend on a checked-in `vendor/` directory. If a maintainer needs the pinned upstream `world-contracts` checkout for local investigation, use `bun run build:with-world-contracts` locally; hosted builds should continue using `bun run build`.

### 2.2 Serverless Function

The GitHub OAuth callback is located at `netlify/functions/github-callback.ts`:

```text
netlify/
└── functions/
    └── github-callback.ts   # Exchanges OAuth code for access token
```

This function:

1. Receives the authorisation `code` from GitHub's OAuth redirect
2. Exchanges the code for an access token using `GITHUB_CLIENT_SECRET`
3. Returns the token to the client
4. Validates `Origin`/`Referer` against an allowlist
5. Never logs or exposes the client secret

---

## 3. Environment Variables

### 3.1 Netlify Environment

| Variable               | Where to Set         | Purpose                                     | Sensitive |
| ---------------------- | -------------------- | ------------------------------------------- | --------- |
| `GITHUB_CLIENT_SECRET` | Netlify Environment  | OAuth token exchange in serverless function | **Yes**   |
| `GITHUB_CLIENT_ID`     | Source code (public) | OAuth initiation (client-side)              | No        |
| `NODE_VERSION`         | `netlify.toml`       | Node.js runtime for build                   | No        |

### 3.2 Local Development

For local development, copy the `.env.example` template:

```bash
cp .env.example .env
```

Available environment variables:

| Variable                | Default | Purpose                                           |
| ----------------------- | ------- | ------------------------------------------------- |
| `VITE_BASE_PATH`        | `/`     | Base URL path (overridden by GitHub Pages deploy) |
| `VITE_GITHUB_CLIENT_ID` | —       | GitHub OAuth app client ID (future)               |

The `VITE_BASE_PATH` variable is used in `vite.config.ts` to set the `base` option. It is only overridden in the `deploy-pages.yml` GitHub Actions workflow for GitHub Pages subpath deployments.

No environment variables are required for basic local development — `bun run dev` works without a `.env` file.

> [!CAUTION]
> Never commit `.env` files or secrets to the repository. See [SECURITY.md §8](./SECURITY.md#8-secret-management).

---

## 4. Build Process

### 4.1 Build Pipeline

```mermaid
flowchart LR
    A["bun install<br/>--frozen-lockfile"] --B["tsc -b<br/>(type check)"]
    B --C["vite build<br/>(bundle + minify)"]
    C --D["dist/<br/>index.html + assets/"]
```

### 4.2 Build Commands

| Step            | Command                         | Output                  |
| --------------- | ------------------------------- | ----------------------- |
| Install         | `bun install --frozen-lockfile` | `node_modules/`         |
| Type check      | `bunx tsc -b`                   | Compile errors (if any) |
| Build           | `bun run build`                 | `dist/` directory       |
| Preview locally | `bun run preview`               | Local server at `:4173` |

### 4.3 Build Output

```text
dist/
├── index.html              # Entry point with hashed asset references
├── assets/
│   ├── index-[hash].js     # Application bundle
│   ├── index-[hash].css    # Compiled styles
│   └── vendor-[hash].js    # Vendor chunk (React, React Flow, etc.)
└── vite.svg                # Static assets
```

---

## 5. Preview Deployments

### 5.1 Automatic PR Previews

Every pull request targeting `main` automatically generates a Netlify deploy preview:

- **URL format:** `https://deploy-preview-{PR#}--{site-name}.netlify.app`
- Preview deploys use the same build configuration as production
- Preview environments **must not** use production secrets (see [SECURITY.md §3.3](./SECURITY.md#33-netlify-deployment-security))

### 5.2 Preview Review Process

1. PR author pushes changes
2. Netlify bot posts the preview URL as a PR comment
3. Reviewer opens the preview and verifies UI changes
4. CI passes in parallel

---

## 6. Release Process

### 6.1 Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** — Breaking changes to the node type system, IR format, or persistence schema
- **MINOR** — New node types, features, or enhancements
- **PATCH** — Bug fixes, documentation updates, dependency patches

### 6.2 Release Steps

```bash
# 1. Ensure main is up to date
git checkout main && git pull

# 2. Update version in package.json
bun version minor  # or major/patch

# 3. Update CHANGELOG.md with release notes

# 4. Commit and tag
git add -A
git commit -S -m "chore(release): v0.2.0"
git tag -s v0.2.0 -m "Release v0.2.0"

# 5. Push with tags
git push origin main --tags
```

### 6.3 Release Automation

The project uses [`release-please`](https://github.com/googleapis/release-please) for automated versioning and changelog generation.

For the maintainer-facing operational checklist, version-bump rules, and step-by-step major/minor/patch procedures, use the dedicated [RELEASE-RUNBOOK.md](./RELEASE-RUNBOOK.md).

The [`release-please.yml`](../.github/workflows/release-please.yml) workflow runs on every push to `main` and can also be started manually with `workflow_dispatch`.

This automatically:

1. Opens or updates a release PR that bumps `package.json` and updates `CHANGELOG.md` from Conventional Commit messages
2. Creates the version commit, `v*` git tag, and GitHub Release when that release PR is merged
3. Keeps the release metadata aligned with the repository history tracked in `.release-please-manifest.json`

The resulting release commit and tag continue through the existing automation:

- **`ci.yml`** — Runs lint, typecheck, unit tests, and audit on all pushes
- **`deploy-pages.yml`** — Builds and deploys to GitHub Pages on push to `main`
- **Netlify** — Auto-deploys from `main` via webhook

There is no local `bun run release` step anymore. Maintainers should ensure merged commits follow Conventional Commits so the release PR gets the correct version bump and changelog sections.

Future release pipeline additions (see [SECURITY.md §6.3](./SECURITY.md#63-release-attestation-workflow)):

1. Generate SBOM (CycloneDX)
2. Generate SLSA build provenance attestation
3. Publish release artifacts to GitHub Releases

---

## 9. In-App Wallet Behaviour

Frontier Flow has two distinct deployment signing modes inside the application. The active mode depends on the selected deployment target and, for localnet, the saved Localnet settings.

### 9.1 Localnet Deployment

The Localnet settings modal exposes a `Use ephemeral keypair` checkbox.

- Checked by default: Frontier Flow creates a temporary `Ed25519` keypair in the browser, funds it from the localnet faucet, signs the publish transaction locally, and submits directly to the configured local RPC endpoint.
- Because the application signs the transaction itself in this mode, no browser-wallet approval prompt appears.
- This mode still requires the configured local validator, GraphQL endpoint, and world package metadata to be valid.

- Unchecked: Frontier Flow keeps the same deploy-grade localnet compilation flow, but the publish transaction is handed to the connected wallet through the Sui Wallet Standard API.
- In this mode, localnet deployment behaves like a published-target deployment from the user’s perspective: a wallet must be connected, the progress flow includes a signing stage, and the wallet must approve the transaction before submission continues.
- The transaction is still executed against the configured localnet RPC endpoint.

### 9.2 Published Targets

- `testnet:stillness` and `testnet:utopia` always require a connected wallet.
- Frontier Flow compiles against the maintained published world references for the selected target, asks the wallet to sign, then executes the signed transaction through the configured Sui client.
- If the wallet approval is rejected, the deployment attempt is recorded as cancelled at the signing stage.

### 9.3 Summary Table

| Target mode                                    | Connected wallet required | Wallet popup expected | Signer source                                            |
| ---------------------------------------------- | ------------------------- | --------------------- | -------------------------------------------------------- |
| Localnet with `Use ephemeral keypair` enabled  | No                        | No                    | Temporary faucet-funded keypair created by Frontier Flow |
| Localnet with `Use ephemeral keypair` disabled | Yes                       | Yes                   | Connected browser wallet                                 |
| `testnet:stillness`                            | Yes                       | Yes                   | Connected browser wallet                                 |
| `testnet:utopia`                               | Yes                       | Yes                   | Connected browser wallet                                 |

## 7. Rollback Procedure

### 7.1 Netlify Rollback

Netlify maintains a history of all deploys. To rollback:

1. Go to **Netlify Dashboard → Deploys**
2. Find the last known-good deploy
3. Click **"Publish deploy"** to re-activate it

This is instant and does not require a new build.

### 7.2 Git Revert

For code-level rollback:

```bash
git revert <commit-sha>
git push origin main
# Netlify auto-deploys the reverted state
```

---

## 8. Custom Domain & DNS

### 8.1 DNS Configuration

| Record Type | Host  | Value                     |
| ----------- | ----- | ------------------------- |
| CNAME       | `www` | `{site-name}.netlify.app` |
| A           | `@`   | Netlify load balancer IP  |

### 8.2 HTTPS

Netlify provides automatic Let's Encrypt SSL certificates for custom domains. HSTS is enforced via the security headers in `netlify.toml`.
