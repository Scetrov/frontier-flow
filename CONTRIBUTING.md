---
title: Frontier Flow - Contributing Guide
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-02-22
author: Scetrov
description: Developer onboarding, PR workflow, and conventions for contributing to Frontier Flow.
---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Development Workflow](#2-development-workflow)
3. [Branch & Commit Conventions](#3-branch--commit-conventions)
4. [Pull Request Process](#4-pull-request-process)
5. [Code Review Checklist](#5-code-review-checklist)
6. [Adding a New Node Type](#6-adding-a-new-node-type)
7. [Documentation Standards](#7-documentation-standards)

---

## 1. Getting Started

### 1.1 Prerequisites

| Tool        | Minimum Version | Purpose                   |
| ----------- | --------------- | ------------------------- |
| **Node.js** | 24.x            | Runtime                   |
| **Bun**     | Latest          | Package manager & runner  |
| **Git**     | 2.34+           | Version control           |
| **GPG key** | —               | Commit signing (required) |

### 1.2 Local Setup

```bash
# Clone the repository
git clone https://github.com/Scetrov/frontier-flow.git
cd frontier-flow

# Install dependencies
bun install

# Start the development server
bun dev
# → Open http://localhost:5179
```

### 1.3 Available Scripts

| Script          | Command                                                 | Purpose                                                   |
| --------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `dev`           | `bun dev`                                               | Start Vite dev server                                     |
| `build`         | `bun run build`                                         | Type-check and production build                           |
| `lint`          | `bun run lint`                                          | Run ESLint                                                |
| `preview`       | `bun run preview`                                       | Preview production build                                  |
| `release`       | `bun run release`                                       | Bump version + update changelog from Conventional Commits |
| `release:first` | `bun run release:first`                                 | Create the first tagged release without prior tags        |
| `release:patch` | `bun run release:patch`                                 | Force a patch release                                     |
| `release:minor` | `bun run release:minor`                                 | Force a minor release                                     |
| `release:major` | `bun run release:major`                                 | Force a major release                                     |
| `test`          | `bunx vitest`                                           | Run unit/component tests                                  |
| `test:run`      | `bunx vitest run`                                       | Run tests once (CI mode)                                  |
| `test:e2e`      | `bunx playwright test`                                  | Run E2E tests                                             |
| `typecheck`     | `bunx tsc -b`                                           | TypeScript type checking                                  |
| `audit`         | `bunx npm-audit --audit-level=high`                     | Dependency vulnerability audit                            |
| `verify`        | `bun run lint && bun run typecheck && bun run test:run` | Local pre-commit quality gate                             |
| `verify:full`   | `bun run verify && bun run build`                       | Full local CI-style verification                          |

### 1.4 Project Structure

```text
src/
├── main.tsx              # Entry point
├── App.tsx               # Root component + DnDFlow
├── index.css             # Global styles + Tailwind
├── components/           # Shared UI components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── CodePreviewModal.tsx
│   └── ErrorBoundary.tsx
├── nodes/                # Custom node components
│   ├── index.ts          # Node type registry
│   └── *.tsx             # Individual node types
└── utils/                # Pure utility modules
    ├── codeGenerator.ts  # Move code generation
    ├── layoutEngine.ts   # Dagre auto-layout
    └── socketTypes.ts    # Socket definitions & colours
```

See [HLD.md §3](./HLD.md#3-project-structure) for the full project tree.

---

## 2. Development Workflow

### 2.1 Before You Start

1. Read the [CONSTITUTION.md](./CONSTITUTION.md) — it's the absolute source of truth for all conventions.
2. Review the [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) — all UI must conform to the CCP aesthetic.
3. Check the [RISK-REGISTER.md](./RISK-REGISTER.md) for any risks relevant to the area you're working on.

### 2.2 Local Quality Checks

Before pushing, **always** run:

```bash
bun run lint          # Lint check
bunx tsc -b           # Type check
bunx vitest run       # Unit tests
```

All three must pass before opening a PR.

The repository uses the Python `pre-commit` framework. Install hooks locally with `pre-commit install`; the configured `pre-commit` hook runs `bun run verify` and blocks commits when lint, typecheck, or unit tests fail.

---

## 3. Branch & Commit Conventions

### 3.1 Branch Naming

```text
<type>/<short-description>

Examples:
  feat/add-gate-node
  fix/socket-validation-crash
  docs/update-risk-register
  refactor/code-generator-phase-2
```

### 3.2 Conventional Commits

All commits **must** follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>

Examples:
  feat(nodes): add CanJump gate node
  fix(sockets): prevent self-connection on IsInList
  docs(security): update CSP policy for WASM
  refactor(codegen): extract constraint validation phase
  test(codegen): add snapshot for optimised turret graph
  chore(deps): bump @xyflow/react to 12.11.0
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`, `ci`

Version numbers are derived from this commit history. Run one of the release scripts before a production release to update [package.json](package.json) and [CHANGELOG.md](CHANGELOG.md) consistently:

```bash
bun run release
```

Use the explicit `release:patch`, `release:minor`, or `release:major` variants when you need to override the inferred bump.

### 3.3 Signed Commits

All commits **must** be GPG-signed. Per [CONSTITUTION §8](./CONSTITUTION.md):

```bash
git config commit.gpgsign true
```

---

## 4. Pull Request Process

### 4.1 PR Template

Every PR should include:

- **Summary** — What was changed and why
- **Type** — `feat` / `fix` / `docs` / `refactor` / `chore`
- **Testing** — What tests were added or updated
- **Screenshots** — Required for any UI changes
- **Risk assessment** — Link to relevant risks in [RISK-REGISTER.md](./RISK-REGISTER.md) if applicable

### 4.2 Requirements for Merge

| Requirement         | Detail                                          |
| ------------------- | ----------------------------------------------- |
| CI passing          | All lint, typecheck, test, and audit jobs green |
| Signed commits      | All commits GPG-signed                          |
| Code review         | At least 1 approval required                    |
| No force-push       | Branch protection enforced on `main`            |
| Coverage maintained | Coverage must not drop below minimum thresholds |

---

## 5. Code Review Checklist

Reviewers should verify:

- [ ] **Type safety** — No `any` types; `unknown` with narrowing preferred
- [ ] **CSS variables** — No hardcoded hex colours; uses `--bg-primary`, `--brand-orange`, etc.
- [ ] **Border radius** — Strictly `0px` on all components
- [ ] **Socket types** — New connections respect the compatibility matrix
- [ ] **Input sanitisation** — User-supplied values validated before code generation
- [ ] **Accessibility** — New components include appropriate ARIA roles/labels; keyboard navigation is implemented or preserved (see [ADR-007](./ADR/ADR-007-accessibility-and-keyboard-navigation.md))
- [ ] **No `dangerouslySetInnerHTML`** — Explicitly prohibited
- [ ] **Tests included** — Unit tests for utils; component tests for UI changes
- [ ] **Naming conventions** — PascalCase components, camelCase utils, kebab-case directories
- [ ] **CONSTITUTION compliance** — Changes align with documented principles

---

## 6. Adding a New Node Type

Step-by-step guide for adding a new node type (e.g., a `CanJump` gate node):

### Step 1: Create the Node Component

Create `src/nodes/CanJumpNode.tsx`:

```typescript
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { DoorOpen } from "lucide-react";

export function CanJumpNode({ data }: NodeProps) {
  return (
    <div className="node-container">
      <div className="node-header">
        <DoorOpen className="w-4 h-4" />
        <span>{data.label as string}</span>
      </div>
      <div className="node-body">
        {/* Define input/output handles with typed sockets */}
        <Handle type="source" position={Position.Right} id="can_jump"
                className="socket socket--boolean" />
      </div>
    </div>
  );
}
```

### Step 2: Register the Node Type

Update `src/nodes/index.ts`:

```typescript
import { CanJumpNode } from "./CanJumpNode";

export const nodeTypes = {
  // ...other registered types
  canJump: CanJumpNode,
};
```

### Step 3: Add to Sidebar

Add the new node to the `nodeDefinitions` array in `src/components/Sidebar.tsx`.

### Step 4: Update Code Generator

Add a `NodeCodeGenerator` implementation for the `canJump` type in `src/utils/codeGenerator.ts` (or the relevant pipeline module).

### Step 5: Update Documentation

- Add socket specification to [HLD.md §7.3](./HLD.md#73-individual-node-specifications)
- Add to Sidebar node definitions in [SOLUTION-DESIGN.md §1.2](./SOLUTION-DESIGN.md#12-sidebar-component-internals)
- Update the [GLOSSARY.md](./GLOSSARY.md) if new domain terms are introduced
- Add the icon to [HLD.md Appendix B](./HLD.md#appendix-b-icon-reference)

### Step 6: Write Tests

- Unit test for the code generator strategy
- Component test for rendering and socket placement
- Update snapshot tests for graphs that include the new node

---

## 7. Documentation Standards

### 7.1 Document Inventory

| Document                                               | Purpose                    | Update Frequency             |
| ------------------------------------------------------ | -------------------------- | ---------------------------- |
| [CONSTITUTION.md](./CONSTITUTION.md)                   | Principles & guardrails    | Rarely (foundational)        |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)                 | Visual tokens & components | When UI standards change     |
| [HLD.md](./HLD.md)                                     | High-level architecture    | Per feature addition         |
| [SOLUTION-DESIGN.md](./SOLUTION-DESIGN.md)             | Implementation details     | Per feature addition         |
| [SECURITY.md](./SECURITY.md)                           | Security controls          | Per security-relevant change |
| [RISK-REGISTER.md](./RISK-REGISTER.md)                 | Risk tracking              | Bi-weekly review             |
| [API-CONTRACTS.md](./API-CONTRACTS.md)                 | Data interfaces            | When interfaces change       |
| [TESTING-STRATEGY.md](./TESTING-STRATEGY.md)           | Testing approach           | When test strategy evolves   |
| [DEPLOYMENT.md](./DEPLOYMENT.md)                       | Deploy process             | When infra changes           |
| [GLOSSARY.md](./GLOSSARY.md)                           | Domain terms               | Per new concept              |
| [USER-FLOWS.md](./USER-FLOWS.md)                       | User journeys              | Per feature addition         |
| [OUTSTANDING-QUESTIONS.md](./OUTSTANDING-QUESTIONS.md) | Integration questions      | As questions arise/resolve   |
| `ADR/`                                                 | Decision records           | Per architectural decision   |

### 7.2 When to Update Docs

- **New feature** → Update HLD, SOLUTION-DESIGN, USER-FLOWS, and relevant ADRs
- **New dependency** → Update HLD §2, RISK-REGISTER, SECURITY
- **UI change** → Update DESIGN-SYSTEM if tokens change
- **Security-relevant change** → Update SECURITY and RISK-REGISTER
