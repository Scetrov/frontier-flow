# Data Model: Project Workspace Initialisation

**Feature**: 001-project-workspace-init  
**Date**: 2026-03-12

## Overview

This feature is infrastructure scaffolding — it creates configuration files and directory structure, not domain entities. The "entities" below describe the configuration artefacts and their relationships rather than runtime data models.

## Entities

### 1. Project Configuration

The set of files that define how the project compiles, lints, and bundles.

| File | Format | Purpose | Relationships |
|------|--------|---------|---------------|
| `package.json` | JSON | Dependencies, scripts, metadata | References `rolldown-vite` (aliased as `vite` binary) |
| `bun.lockb` | Binary | Dependency lock | Generated from `package.json` via `bun install` |
| `vite.config.ts` | TypeScript | Build config | Imports from `vite`, uses `@vitejs/plugin-react` |
| `tsconfig.json` | JSON | TS project references root | References `tsconfig.app.json`, `tsconfig.node.json` |
| `tsconfig.app.json` | JSON | App source TS config | Includes `src/**/*.ts`, `src/**/*.tsx` |
| `tsconfig.node.json` | JSON | Node/Vite TS config | Includes `vite.config.ts` |
| `postcss.config.js` | JavaScript (ESM) | PostCSS pipeline | Uses `@tailwindcss/postcss`, `autoprefixer` |
| `tailwind.config.js` | JavaScript (ESM) | Tailwind CSS config | Content paths: `index.html`, `src/**/*.{ts,tsx}` |
| `eslint.config.js` | JavaScript (ESM) | ESLint 10 flat config | Uses `typescript-eslint`, `react-hooks`, `jsx-a11y` |
| `index.html` | HTML | SPA entry point | References `src/main.tsx` via `<script type="module">` |

### 2. Docker Environment

The containerised development setup.

| File | Format | Purpose | Relationships |
|------|--------|---------|---------------|
| `Dockerfile.dev` | Dockerfile | Dev container image | Build from `oven/bun:latest`, copies `package.json` + `bun.lockb` |
| `docker-compose.yml` | YAML | Compose orchestration | Builds `Dockerfile.dev`, bind-mounts source for HMR |

### 3. Source Scaffold

The initial `src/` directory tree with placeholder files.

| Path | Type | Purpose |
|------|------|---------|
| `src/main.tsx` | TypeScript (React) | ReactDOM entry point, renders `<App />` into `#root` |
| `src/App.tsx` | TypeScript (React) | Root component shell, renders placeholder content |
| `src/index.css` | CSS | Tailwind imports, CSS custom properties, font imports |
| `src/components/.gitkeep` | Marker | Preserves empty directory in Git |
| `src/nodes/.gitkeep` | Marker | Preserves empty directory in Git |
| `src/utils/.gitkeep` | Marker | Preserves empty directory in Git |
| `public/vite.svg` | SVG | Default Vite favicon |

## Validation Rules

- `package.json` MUST contain `"type": "module"` (ESM only, per Constitution Principle I).
- `package.json` MUST contain `"private": true` (not published to npm).
- All TypeScript config MUST set `"strict": true` and `"noImplicitAny": true` (FR-003).
- `eslint.config.js` MUST match ADR-006 accepted config exactly.
- `src/main.tsx` and `src/App.tsx` MUST compile without TS errors and render without runtime errors.

## State Transitions

Not applicable — this feature creates static configuration files with no runtime state machines.
