---
title: Frontier Flow - Testing Strategy
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-03-25
author: Scetrov
description: Test pyramid, tooling, mocking strategy, fixtures, and coverage gates for the Frontier Flow project.
---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [1. Testing Philosophy](#1-testing-philosophy)
- [2. Test Pyramid](#2-test-pyramid)
- [3. Tooling](#3-tooling)
- [4. Unit Testing](#4-unit-testing)
  - [4.1 Code Generator Pipeline](#41-code-generator-pipeline)
  - [4.2 Layout Engine](#42-layout-engine)
  - [4.3 Socket Validation](#43-socket-validation)
- [5. Component Testing](#5-component-testing)
  - [5.1 Header Component](#51-header-component)
  - [5.2 Sidebar Component](#52-sidebar-component)
  - [5.3 CodePreviewModal](#53-codepreviewmodal)
  - [5.4 Custom Nodes](#54-custom-nodes)
- [6. End-to-End Testing](#6-end-to-end-testing)
  - [6.1 Stub API Strategy](#61-stub-api-strategy)
  - [6.2 Core User Journeys](#62-core-user-journeys)
  - [6.3 Error Scenarios](#63-error-scenarios)
- [7. Security Testing](#7-security-testing)
- [8. Snapshot \& Regression Testing](#8-snapshot--regression-testing)
  - [8.1 Code Generation Snapshots](#81-code-generation-snapshots)
  - [8.2 Snapshot Update Policy](#82-snapshot-update-policy)
- [9. Mocking Strategy](#9-mocking-strategy)
- [10. Test Fixtures \& Data](#10-test-fixtures--data)
  - [10.1 Graph Fixtures](#101-graph-fixtures)
  - [10.2 Mock API Responses](#102-mock-api-responses)
- [11. Coverage Gates](#11-coverage-gates)
  - [Critical Path Coverage (Must be ≥ 90%)](#critical-path-coverage-must-be--90)
- [12. CI Integration](#12-ci-integration)

---

## 1. Testing Philosophy

Per [CONSTITUTION §6](./CONSTITUTION.md), unit tests are **mandatory** for all utilities, layout algorithms, and code generators. Our testing strategy follows these principles:

- **Test behaviour, not implementation** — Assert on outputs and side effects, not internal state.
- **Avoid brittle assertions** — No timing-based assertions. Use fake timers, mock clocks, or injected dependencies.
- **Security tests are first-class** — Injection, XSS, and sanitisation tests are as important as functional tests.
- **Fast feedback loops** — Unit tests run in <5 seconds. E2E tests are isolated to a dedicated CI job.

---

## 2. Test Pyramid

```text
        ┌───────────┐
        │   E2E     │  ~10% of total tests
        │ Playwright│  Full user journeys on canvas
        ├───────────┤
        │ Component │  ~20% of total tests
        │ Vitest +  │  React components with Testing Library
        │  RTL      │
        ├───────────┤
        │   Unit    │  ~70% of total tests
        │  Vitest   │  Utilities, code gen, layout, sockets
        └───────────┘
```

| Layer     | Target Ratio | Focus                                               |
| --------- | ------------ | --------------------------------------------------- |
| Unit      | ~70%         | Pure functions, algorithmic logic, data transforms  |
| Component | ~20%         | React rendering, user interactions, modal behaviour |
| E2E       | ~10%         | Full canvas workflows, deployment flow, persistence |

---

## 3. Tooling

| Tool                          | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| **Vitest**                    | Unit & component test runner (Vite-native)   |
| **@testing-library/react**    | Component rendering & interaction assertions |
| **Playwright**                | Browser-based E2E testing                    |
| **@vitest/coverage-v8**       | Code coverage reporting                      |
| **msw** (Mock Service Worker) | API mocking for GitHub & Sui endpoints       |

---

## 4. Unit Testing

### 4.1 Code Generator Pipeline

The most critical unit test surface. Each phase is tested independently:

| Phase                          | File                  | Test File                  | Key Assertions                                                            |
| ------------------------------ | --------------------- | -------------------------- | ------------------------------------------------------------------------- |
| Phase 1: Graph → IR            | `codeGenerator.ts`    | `codeGenerator.test.ts`    | Correct IR node/connection construction from React Flow state             |
| Phase 2: Constraint Validation | `constraintEngine.ts` | `constraintEngine.test.ts` | Rejects disconnected subgraphs, missing required inputs, cyclic graphs    |
| Phase 3: Input Sanitisation    | `sanitiser.ts`        | `sanitiser.test.ts`        | Blocks injection patterns, enforces `/^[a-zA-Z_][a-zA-Z0-9_]*$/`          |
| Phase 3.5: AST Optimisation    | `optimiser.ts`        | `optimiser.test.ts`        | Dead branch elimination, vector folding, constant propagation correctness |
| Phase 4: Emission              | `emitter.ts`          | `emitter.test.ts`          | Correct Move syntax, source map annotations, import deduplication         |

Graph-to-Move specific regression coverage additionally verifies that:

- Unsupported node types, missing inputs, disconnected entry paths, and unresolved ordering all fail before emission.
- Sanitization blocks irrecoverable module or node identifiers while still allowing safe normalization for valid inputs.
- `moveCompiler.ts` submits a generated package artifact, decodes bytecode modules, and preserves dependency metadata on success.
- `errorParser.ts` keeps unmapped compiler lines and raw fallback failures visible as structured diagnostics.
- Multiline compiler diagnostics that emit a severity header followed by a `sources/...:line:column` line resolve to a single mapped warning or error instead of duplicate diagnostics.
- Footer and preview tests treat compile status and deployment status as separate UI channels with independent assertions.

> **Deploy-grade testing (ADR-009):** The tests above cover **authoring-time** compilation with the browser WASM compiler and local `world` shim. ADR-009 introduces a separate **deploy-grade** compilation path with real dependency resolution. The current deploy-grade suite now covers bundled snapshot validation, deterministic dependency ordering, transitive package materialization from bundled `resolvedDependencies`, cache-hit executor reuse, authoring-path isolation, and cache-aware fallback diagnostics when bundled snapshots are missing or invalid.

### 4.2 Layout Engine

| Test Case              | Assertion                          |
| ---------------------- | ---------------------------------- |
| Empty graph            | Returns empty node positions       |
| Single node            | Centred position                   |
| Linear chain (A→B→C)   | Left-to-right ordering preserved   |
| Branching graph        | No node overlap; edges don't cross |
| Large graph (50 nodes) | Completes within 100ms             |

### 4.3 Socket Validation

| Test Case                               | Assertion                          |
| --------------------------------------- | ---------------------------------- |
| Compatible types (`rider` → `rider`)    | `isValidConnection` returns `true` |
| Incompatible types (`boolean` → `list`) | Returns `false`                    |
| Any wildcard (`any` → any type)         | Returns `true`                     |
| Self-connection                         | Returns `false`                    |
| Duplicate connection                    | Returns `false`                    |

---

## 5. Component Testing

### 5.1 Header Component

- Renders logo, app name, and version badge
- Manual Build button triggers the compile callback when available
- Build button is disabled while compilation is active
- Visual and Move view toggles preserve the current primary workspace

### 5.2 Sidebar Component

- Renders all 9 node types as draggable items
- Drag start sets correct `dataTransfer` values
- Scrollable content area with fixed header/footer

### 5.3 CodePreviewModal

- Does not render when `isOpen` is `false`
- Renders syntax-highlighted Move code when `isOpen` is `true`
- Copy button copies code to clipboard and shows feedback
- Close button / overlay click triggers `onClose`

### 5.4 Custom Nodes

Each of the 9 node types is tested for:

- Correct socket handles rendered (count, position, type)
- Label displayed from `data.label`
- Delete button visibility and functionality
- Correct icon rendered

---

## 6. End-to-End Testing

### 6.1 Stub API Strategy

E2E tests **must not** hit real external services. All external dependencies are stubbed:

| Dependency        | Stub Method                                                   |
| ----------------- | ------------------------------------------------------------- |
| GitHub API        | MSW request handler returning fixture data                    |
| Sui JSON-RPC      | MSW handler returning mock balances/transactions              |
| WASM Compiler     | Pre-compiled bytecode fixture; mock `sui-move-builder` module |
| Wallet Connection | Mock `@mysten/dapp-kit` provider with a test account          |

### 6.2 Core User Journeys

| Journey                | Steps                                             | Assertion                              |
| ---------------------- | ------------------------------------------------- | -------------------------------------- |
| **Build & Preview**    | Drag 3 nodes → connect edges → click Preview      | Code modal shows valid Move source     |
| **Auto Layout**        | Add 5 unpositioned nodes → click Auto Arrange     | Nodes are repositioned without overlap |
| **Deploy to Localnet** | Build graph → connect wallet → deploy             | Transaction confirmation toast appears |
| **GitHub Save/Load**   | Login → save graph → reload → load graph          | Graph state restored identically       |
| **Test Execution**     | Define test case → run local eval → run Move test | Both results match expected output     |
| **Upgrade Flow**       | Deploy → edit graph → deploy again                | Upgrade toast (not publish) appears    |

Graph-to-Move adds one mandatory browser journey on top of the generic canvas flows:

- Start from the editor shell with the mock compiler enabled.
- Change the canvas so auto-compile runs.
- Confirm the footer transitions through `Idle -> Compiling -> Compiled`.
- Trigger a manual build and verify the build button disables while the compile is in progress.
- Switch to the Move view and confirm the preview shows the generated artifact filename plus emitted Move source from the compiled package.

### 6.3 Error Scenarios

| Scenario                   | Expected Behaviour                        |
| -------------------------- | ----------------------------------------- |
| WASM compilation failure   | Error toast with mapped node highlighting |
| Invalid socket connection  | Connection rejected; no edge created      |
| Mainnet deploy attempt     | Extra confirmation modal shown            |
| GitHub rate limit exceeded | Login prompt displayed                    |

---

## 7. Security Testing

Dedicated Vitest suite (`security.test.ts`):

| Test Case                   | Input                       | Expected                     |
| --------------------------- | --------------------------- | ---------------------------- |
| Move injection via label    | `"); abort 0; //`           | Sanitised to safe identifier |
| HTML injection via label    | `<script>alert(1)</script>` | Rendered as escaped text     |
| SQL-like injection          | `'; DROP TABLE --`          | Sanitised; no code emitted   |
| Unicode homograph           | `аdmin` (Cyrillic a)        | Rejected by allowlist        |
| Oversized label (10K chars) | `"A".repeat(10000)`         | Truncated or rejected        |
| Empty label                 | `""`                        | Default fallback label used  |

### 7.1 Running Security Tests

Security tests are co-located with the unit test suite and run as part of the standard `bun run test:run` command. They can be targeted individually:

```bash
bun run vitest run --reporter=verbose security
```

### 7.2 CI Integration

- **Static analysis (CodeQL):** The `.github/workflows/codeql.yml` workflow runs weekly and on push to `main`, scanning TypeScript and GitHub Actions for known vulnerability patterns (CWE matching).
- **Dependency auditing:** `bun run audit` (via `bunx npm-audit --audit-level=high`) runs on every PR in the CI pipeline (`.github/workflows/ci.yml`), blocking merges with high-severity advisories.
- **Lint-time prevention:** `eslint-plugin-jsx-a11y` catches unsafe DOM patterns; TypeScript strict mode prevents `any`-typed bypass of sanitisation boundaries.
- **Accessibility enforcement:** `@axe-core/playwright` audits the default editor shell, generated Move view, and deployment status review flows. Accessibility regressions now fail the browser test job.

### 7.3 OWASP Top 10 Mapping

| OWASP Category                              | Relevance to Frontier Flow                     | Test Coverage                                      |
| ------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| A03:2021 — Injection                        | Move code injection via user-editable labels   | Sanitiser unit tests (table above); snapshot tests  |
| A07:2021 — Cross-Site Scripting (XSS)       | Node labels rendered in React / canvas         | HTML injection test case; CSP headers in `netlify.toml` |
| A05:2021 — Security Misconfiguration        | CSP, CORS, and security headers                | E2E branding spec validates headers; Netlify config |
| A06:2021 — Vulnerable Components            | WASM compiler supply chain (`@zktx.io`)        | `bun run audit`; Dependabot; nightly WASM test      |
| A08:2021 — Software & Data Integrity        | Generated Move code determinism                | Snapshot regression tests; determinism test suite    |
| A04:2021 — Insecure Design                  | Client-side secret handling (OAuth)             | No secrets in client bundle; serverless OAuth proxy  |

Categories not directly applicable to this client-side SPA (e.g., A01 Broken Access Control, A02 Cryptographic Failures, A09 Logging Failures, A10 SSRF) are excluded from the test matrix but addressed in [SECURITY.md](./SECURITY.md).

---

## 8. Snapshot & Regression Testing

### 8.1 Code Generation Snapshots

Golden file snapshots for standard graph configurations:

| Configuration                     | File                                  |
| --------------------------------- | ------------------------------------- |
| Default 5-node turret graph       | `__snapshots__/default-turret.move`   |
| Single proximity node (minimal)   | `__snapshots__/single-proximity.move` |
| Fully connected graph (all types) | `__snapshots__/full-graph.move`       |
| Optimised vs. unoptimised output  | `__snapshots__/optimised-turret.move` |

### 8.2 Snapshot Update Policy

Snapshot updates **must** be explicitly reviewed in PRs. An automated CI comment highlights snapshot diffs for reviewer attention.

---

## 9. Mocking Strategy

| Dependency                  | Mock Approach                                | Rationale                                                   |
| --------------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `@zktx.io/sui-move-builder` | Module mock returning pre-compiled bytecode  | WASM binary is too large and slow for unit tests            |
| `@mysten/dapp-kit` hooks    | Custom mock provider with configurable state | Wallet connection state is external                         |
| `@mysten/sui` SDK           | MSW intercepting JSON-RPC calls              | Allows testing transaction construction without a live node |
| `idb-keyval`                | In-memory Map-based mock                     | IndexedDB is unavailable in Vitest (jsdom)                  |
| `navigator.clipboard`       | `vi.fn()` mock                               | Clipboard API unavailable in test environment               |
| `dagre`                     | Real implementation (fast enough)            | Layout algorithm is fast and deterministic                  |

---

## 10. Test Fixtures & Data

### 10.1 Graph Fixtures

Located in `src/__fixtures__/`:

| Fixture                   | Description                                     |
| ------------------------- | ----------------------------------------------- |
| `default-graph.json`      | The standard 5-node turret proximity graph      |
| `empty-graph.json`        | No nodes or edges                               |
| `disconnected-graph.json` | Two separate subgraphs (should fail validation) |
| `large-graph.json`        | 50+ nodes for performance testing               |
| `cyclic-graph.json`       | Graph with cycle (should fail validation)       |

### 10.2 Mock API Responses

Located in `src/__fixtures__/api/`:

| Fixture                | Description                       |
| ---------------------- | --------------------------------- |
| `github-user.json`     | Mock GitHub user profile response |
| `github-contents.json` | Mock repo contents listing        |
| `sui-balance.json`     | Mock `sui_getBalance` response    |
| `sui-tx-result.json`   | Mock transaction execution result |

---

## 11. Coverage Gates

Per [SECURITY.md §4.1](./SECURITY.md#41-coverage-thresholds):

| Metric         | Minimum | Target | CI Behaviour |
| -------------- | ------- | ------ | ------------ |
| **Statements** | 70%     | 85%    | Fail build   |
| **Branches**   | 70%     | 80%    | Fail build   |
| **Functions**  | 70%     | 90%    | Fail build   |
| **Lines**      | 70%     | 85%    | Fail build   |

The repository currently enforces these minimum thresholds directly in `vite.config.ts` through Vitest's `coverage.thresholds`. CI runs `bun run test:coverage`, which both measures coverage and fails the unit-test job if any minimum is missed.

### Critical Path Coverage (Must be ≥ 90%)

These modules remain constitutionally important and should be tracked toward the elevated target, even though the repository-level CI gate currently enforces only the minimum global thresholds:

- `src/compiler/pipeline.ts`
- `src/compiler/emitter.ts`
- `src/compiler/moveCompiler.ts`
- `src/utils/socketTypes.ts`

---

## 12. CI Integration

Tests run in the CI pipeline defined in [SECURITY.md §3.1](./SECURITY.md#31-github-actions-workflow):

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile
    - run: bun run test:coverage
    - name: Upload coverage
      uses: actions/upload-artifact@v4
      with:
        name: coverage-report
        path: coverage/
```

E2E tests run in a separate job with Playwright:

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install --frozen-lockfile
    - run: bunx playwright install --with-deps chromium
    - run: bun run test:e2e
```

The E2E job now also acts as the automated accessibility gate because the audited specs call `expectNoAccessibilityViolations()` before passing.
