# Implementation Plan: Project Workspace Initialisation

**Branch**: `001-project-workspace-init` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-project-workspace-init/spec.md`

## Summary

Scaffold the Frontier Flow repository from a clean slate into a buildable, lintable, Docker-ready React 19 + TypeScript 5.9 project. The feature creates all configuration files (`package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `postcss.config.js`, `eslint.config.js`, `index.html`), installs production and dev dependencies via Bun, provides a Docker Compose dev environment, and lays out the `src/` directory scaffold (`components/`, `nodes/`, `utils/`) with minimal entry-point files so that `bun dev`, `bun run build`, `bun run lint`, and `docker compose up` all succeed on a fresh clone.

## Technical Context

**Language/Version**: TypeScript ~5.9.3, target ES2022, strict mode, `noImplicitAny`, ES Modules only  
**Primary Dependencies**: `react@^19.2.0`, `react-dom@^19.2.0`, `@xyflow/react@^12.10.0`, `lucide-react@^0.563.0`, `dagre@^0.8.5`, `react-syntax-highlighter@^16.1.0` (+ `@types/dagre@^0.7.53`, `@types/react-syntax-highlighter@^15.5.13`)  
**Dev Dependencies**: `rolldown-vite@7.2.5` (aliased as `vite`), `@vitejs/plugin-react@^5.1.1`, `tailwindcss@^4.1.18`, `@tailwindcss/postcss@^4.1.18`, `postcss@^8.5.6`, `autoprefixer@^10.4.24`, `eslint@^10.0.0`, `@eslint/js`, `globals`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `@types/react@^19`, `@types/react-dom@^19`  
**Storage**: N/A (browser SPA, no server-side storage in this feature)  
**Testing**: Vitest (unit), Playwright (E2E) — not installed by this feature; test tooling is a subsequent feature  
**Target Platform**: Browser SPA (modern evergreen browsers)  
**Project Type**: web-app (single-project frontend)  
**Build Tool**: Vite via Rolldown fork (`rolldown-vite`), Bun as package manager  
**Performance Goals**: N/A for scaffold feature  
**Constraints**: Dev server must start in < 2 minutes from fresh clone (SC-001)  
**Scale/Scope**: Single-page application; this feature produces ~15 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Applies | Status | Notes |
|---|-----------|---------|--------|-------|
| I | Type Safety Above All | Yes | PASS | TypeScript strict mode, `noImplicitAny`, ES2022 target, ES Modules only. No `any` in scaffolded files. |
| II | Visual Feedback is Paramount | No | N/A | No interactive canvas elements in this feature. |
| III | Domain-Driven Design | Partial | PASS | Directory scaffold creates `src/nodes/` and `src/components/` matching domain structure. No domain logic yet. |
| IV | Predictable Code Generation | No | N/A | No code generator in this feature. |
| V | Security by Default | Yes | PASS | No secrets in config files. Dependabot enabled. Lock file committed. |
| VI | Test-First Quality | Partial | PASS | Test tooling installation deferred to a subsequent feature. Scaffolded files must pass lint (SC-003). Build must succeed (SC-002). |
| VII | Accessibility & Inclusion | No | N/A | No UI components with interactive elements in this feature. ESLint jsx-a11y plugin is installed for future enforcement. |

**Workflow Guardrails**:
- Signed commits: enforced by developer workflow (not a scaffold concern).
- Conventional commits: `feat: ...` prefix for this feature branch.
- Branch policy: working on `001-project-workspace-init`, not main.
- Naming conventions: `PascalCase` components, `camelCase` utils, `kebab-case` directories — enforced in scaffold layout.

**Gate result**: **PASS** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-workspace-init/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontierflow/                     # Repository root
├── index.html                    # Entry HTML (FR-012)
├── package.json                  # Dependencies & scripts (FR-001, FR-004–FR-006)
├── bun.lockb                     # Bun lock file (FR-001)
├── vite.config.ts                # Vite + React plugin (FR-007)
├── tailwind.config.js            # Tailwind CSS v4 (FR-008)
├── postcss.config.js             # PostCSS with @tailwindcss/postcss (FR-008)
├── tsconfig.json                 # TypeScript project references (FR-003)
├── tsconfig.app.json             # App TS config (strict, ES2022)
├── tsconfig.node.json            # Node/Vite TS config
├── eslint.config.js              # ESLint 10 flat config (ADR-006)
├── Dockerfile.dev                # Dev container (FR-009)
├── docker-compose.yml            # Compose config (FR-010)
├── public/                       # Static assets
│   └── vite.svg
└── src/
    ├── main.tsx                  # React DOM entry (FR-013)
    ├── App.tsx                   # Root component shell (FR-013)
    ├── index.css                 # Tailwind imports + CSS vars (FR-008)
    ├── components/               # UI components (FR-011)
    │   └── .gitkeep
    ├── nodes/                    # Node type components (FR-011)
    │   └── .gitkeep
    └── utils/                    # Utility modules (FR-011)
        └── .gitkeep
```

**Structure Decision**: Single-project frontend at the repository root. This is a browser SPA with no backend — the project structure follows HLD §3 exactly. Empty scaffold directories use `.gitkeep` files per spec assumptions. The `contracts/` plan artifact directory is omitted because this feature has no external interfaces (it is internal project scaffolding).

## Complexity Tracking

No Constitution Check violations — table not applicable.
