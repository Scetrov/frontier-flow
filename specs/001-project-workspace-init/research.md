# Research: Project Workspace Initialisation

**Feature**: 001-project-workspace-init  
**Date**: 2026-03-12  
**Status**: Complete

## R-001: Rolldown-Vite Aliasing Mechanism

**Question**: How does `rolldown-vite@7.2.5` work as a drop-in replacement for Vite, and how should it be referenced in config files?

**Decision**: Install `rolldown-vite@7.2.5` as a dev dependency. In `vite.config.ts`, import from `"vite"` — not from `"rolldown-vite"`. The `rolldown-vite` package self-registers as the `vite` binary via the `bin` field in its `package.json`, so `vite` CLI commands (`vite`, `vite build`, `vite preview`) resolve to the Rolldown fork automatically. No npm/Bun alias configuration is required; the package hoists its binary name as `vite`.

**Rationale**: The SOLUTION-DESIGN §6.2 shows `import { defineConfig } from "vite"` in the config file, confirming the import path is `"vite"`, not the package name. The `rolldown-vite` package re-exports the Vite API surface from its own entry point mapped to `vite`.

**Alternatives Considered**:
- Using `bun add vite` (standard Vite) — rejected because the spec explicitly requires the Rolldown fork at a pinned version.
- Using `npm:` or `bun:` aliasing in `package.json` — unnecessary; `rolldown-vite` handles this natively.

## R-002: Tailwind CSS v4 PostCSS Configuration

**Question**: How should Tailwind CSS v4 be configured with PostCSS, and is a `tailwind.config.js` file necessary?

**Decision**: Use `@tailwindcss/postcss` as a PostCSS plugin in `postcss.config.js`. Tailwind CSS v4 auto-detects content files from the project (no explicit `content` array needed in the PostCSS config). A `tailwind.config.js` file is still generated for forward compatibility, with a minimal config exporting `content`, `theme.extend`, and `plugins` — matching SOLUTION-DESIGN §6.3 exactly.

**Rationale**: SOLUTION-DESIGN §6.4 shows `postcss.config.js` with `"@tailwindcss/postcss": {}`. The spec (FR-008) mandates this approach. Tailwind v4's new engine scans the project automatically but still respects an explicit config file if present.

**Alternatives Considered**:
- Tailwind standalone CLI — rejected; the project uses Vite + PostCSS pipeline.
- Omitting `tailwind.config.js` entirely — rejected; SOLUTION-DESIGN §6.3 and HLD Appendix A both list it as required.

## R-003: TypeScript Configuration (Project References)

**Question**: What tsconfig structure should be used for a Vite + React + TypeScript 5.9 project?

**Decision**: Use three tsconfig files following the standard Vite scaffold pattern:

1. **`tsconfig.json`** — project references root. Contains `"references"` to `tsconfig.app.json` and `tsconfig.node.json`. Includes shared `compilerOptions` like `"strict": true`.
2. **`tsconfig.app.json`** — application source config. Targets `ES2022`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, `"noImplicitAny": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`, `"isolatedModules": true`, `"skipLibCheck": true`. Includes `src/`.
3. **`tsconfig.node.json`** — Node/Vite config. Targets `ES2022` with `"module": "ESNext"`, `"moduleResolution": "bundler"`. Includes `vite.config.ts`.

**Rationale**: This is the standard Vite `create-vite` template for `react-ts`. The HLD §3 confirms three tsconfig files. FR-003 requires `target: ES2022`, strict mode, and `noImplicitAny`.

**Alternatives Considered**:
- Single `tsconfig.json` — rejected; Vite expects separate configs for app source and Node-side config files.
- Using `"module": "Node16"` — rejected; Vite's bundler resolution is the recommended moduleResolution for Vite projects.

## R-004: ESLint 10 Flat Config with strictTypeChecked

**Question**: What are the exact ESLint packages required and how should `eslint.config.js` be configured?

**Decision**: Follow ADR-006 exactly. Install these dev dependencies:
- `eslint@^10.0.0`
- `@eslint/js` (latest)
- `globals` (latest)
- `typescript-eslint` (latest)
- `eslint-plugin-react-hooks` (latest)
- `eslint-plugin-react-refresh` (latest)
- `eslint-plugin-jsx-a11y` (latest)

The `eslint.config.js` content is prescribed by ADR-006 and uses `defineConfig` / `globalIgnores` from `eslint/config`, `strictTypeChecked` from `typescript-eslint`, and `projectService: true` for type-aware linting.

**Rationale**: ADR-006 is an accepted architectural decision. The exact config is provided in the ADR.

**Alternatives Considered**:
- Using `recommended` instead of `strictTypeChecked` — rejected per ADR-006 decision.
- Adding Prettier — not in scope for this feature; no Prettier config in the spec.

## R-005: Docker Development Environment

**Question**: What should the `Dockerfile.dev` and `docker-compose.yml` look like?

**Decision**:
- **`Dockerfile.dev`**: Base image `oven/bun:latest`, `WORKDIR /app`, copy `package.json` and `bun.lockb`, run `bun install`, copy remaining source, expose port 5179, `CMD ["bun", "dev", "--host"]`. The `--host` flag is needed so Vite binds to `0.0.0.0` inside the container, making it accessible from the host.
- **`docker-compose.yml`**: Single service `app`, builds from `Dockerfile.dev`, maps `5179:5179`, bind-mounts `.:/app` (with `node_modules` as an anonymous volume to avoid overwriting container deps), and sets `CHOKIDAR_USEPOLLING=true` for reliable HMR via file watching inside the container.

**Rationale**: FR-009 and FR-010 specify these requirements. The spec mentions `oven/bun:latest`, port 5179, and bind-mount for HMR. The `--host` flag is required for container networking.

**Alternatives Considered**:
- Multi-stage build — unnecessary for a dev image.
- Using `node:alpine` + Bun install — rejected; `oven/bun:latest` is the official Bun image.

## R-006: index.css and Tailwind v4 Directives

**Question**: How should `src/index.css` be structured for Tailwind CSS v4?

**Decision**: Tailwind CSS v4 uses `@import "tailwindcss"` as the primary directive (replacing the v3 `@tailwind base/components/utilities` directives). The `index.css` file will contain:
1. `@import "tailwindcss";` — imports all Tailwind layers.
2. CSS custom properties in `:root` for the design system (e.g., `--brand-orange: #ff4700`).
3. Font imports for Disket Mono, Inter, and Fira Code (per SOLUTION-DESIGN §6.6).

**Rationale**: Tailwind v4 replaced the `@tailwind` directives with a single `@import` statement. SOLUTION-DESIGN §6.6 confirms CSS custom properties and font imports belong in this file.

**Alternatives Considered**:
- Using v3-style `@tailwind` directives — incompatible with Tailwind CSS v4.
- Importing fonts via `<link>` tags in `index.html` — both approaches are valid; CSS `@import` keeps font declarations co-located with the stylesheet.
