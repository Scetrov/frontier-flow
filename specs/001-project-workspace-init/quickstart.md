# Quickstart: Project Workspace Initialisation

**Feature**: 001-project-workspace-init  
**Date**: 2026-03-12

## Prerequisites

- **Bun** ≥ 1.x installed ([bun.sh](https://bun.sh))
- **Git** with GPG signing configured (Constitution: signed commits)
- **Docker** + **Docker Compose** v2 (optional, for containerised workflow)

## Local Development

### 1. Clone and Install

```bash
git clone <repository-url> frontier-flow
cd frontier-flow
git checkout 001-project-workspace-init
bun install
```

### 2. Start Dev Server

```bash
bun dev
```

Open [http://localhost:5179](http://localhost:5179) — you should see an empty application shell.

### 3. Build for Production

```bash
bun run build
```

Runs `tsc -b` (type-checking) then `vite build`. Output goes to `dist/`.

### 4. Lint

```bash
bun run lint
```

Runs ESLint 10 with `strictTypeChecked` rules across all `.ts` and `.tsx` files.

### 5. Preview Production Build

```bash
bun run preview
```

Serves the `dist/` folder locally for inspection.

## Docker Development

### 1. Start via Docker Compose

```bash
docker compose up
```

Builds the dev container from `Dockerfile.dev`, installs dependencies, and starts Vite. The application is accessible at [http://localhost:5179](http://localhost:5179).

### 2. Hot Module Replacement

Source files are bind-mounted into the container. Edit any file on the host and changes are reflected in the browser automatically via Vite HMR.

### 3. Stop

```bash
docker compose down
```

## Project Structure

```
├── index.html              # SPA entry point
├── package.json            # Bun deps & scripts
├── vite.config.ts          # Vite + React plugin
├── tsconfig.json           # TS project references
├── eslint.config.js        # ESLint 10 flat config
├── postcss.config.js       # PostCSS + Tailwind v4
├── Dockerfile.dev          # Dev container
├── docker-compose.yml      # Compose orchestration
└── src/
    ├── main.tsx            # ReactDOM entry
    ├── App.tsx             # Root component
    ├── index.css           # Tailwind + CSS vars
    ├── components/         # UI components (empty)
    ├── nodes/              # Node types (empty)
    └── utils/              # Utilities (empty)
```

## Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Dependencies install | `bun install` | Exits 0, `bun.lockb` present |
| Dev server starts | `bun dev` | Vite serves on port 5179 |
| Build succeeds | `bun run build` | `dist/` created, 0 TS errors |
| Lint passes | `bun run lint` | 0 violations |
| Docker starts | `docker compose up` | App at localhost:5179 |
