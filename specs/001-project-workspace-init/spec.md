# Feature Specification: Project Workspace Initialisation

**Feature Branch**: `001-project-workspace-init`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "Initialize the Frontier Flow project workspace with Bun, Vite, React 19, TypeScript 5.9, Tailwind CSS v4, Docker dev environment, and scaffolded directory structure"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer Bootstraps the Project Locally (Priority: P1)

A developer clones the repository for the first time and needs to get a working development environment running on their machine. They run a single package-install command followed by a dev-server command and see an empty application shell load in the browser with no errors.

**Why this priority**: Without a functioning local dev environment no other work can begin. This is the foundational prerequisite for everything else in the project.

**Independent Test**: Clone the repository, run `bun install` then `bun dev`, and confirm the Vite dev server starts and serves a page at `http://localhost:5179` that renders without console errors.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository, **When** the developer runs `bun install`, **Then** all dependencies resolve successfully and a `bun.lockb` lock file is present.
2. **Given** dependencies are installed, **When** the developer runs `bun dev`, **Then** the Vite development server starts on port 5179 and serves the application entry point.
3. **Given** the dev server is running, **When** the developer opens `http://localhost:5179` in a browser, **Then** a blank React application shell renders with no TypeScript or runtime errors in the console.
4. **Given** the project is initialised, **When** the developer runs `bun run build`, **Then** TypeScript type-checking passes (`tsc -b`) and Vite produces a production build in the `dist/` directory.
5. **Given** the project is initialised, **When** the developer runs `bun run lint`, **Then** ESLint runs against the codebase with zero violations on the scaffolded files.

---

### User Story 2 — Developer Builds and Runs via Docker (Priority: P2)

A developer who prefers containerised environments (or needs environment parity) uses Docker Compose to spin up the development server without installing Bun or Node.js on their host machine.

**Why this priority**: Docker-based development is a secondary workflow. It depends on the project files being properly scaffolded first (US1) but enables consistent environments across the team.

**Independent Test**: Run `docker compose up` from the project root, wait for the container to start, and verify the application is accessible at `http://localhost:5179`.

**Acceptance Scenarios**:

1. **Given** Docker and Docker Compose are installed on the host, **When** the developer runs `docker compose up`, **Then** the container builds, installs dependencies, and starts the Vite dev server.
2. **Given** the Docker dev container is running, **When** the developer edits a source file on the host, **Then** the change is reflected live in the browser via Vite HMR (hot module replacement) because the source directory is bind-mounted.
3. **Given** the Docker dev container is running, **When** the developer opens `http://localhost:5179`, **Then** the application renders identically to the local Bun-based workflow.

---

### User Story 3 — Developer Navigates a Predictable Directory Structure (Priority: P3)

A new contributor opens the project and finds directories and configuration files organised exactly as the HLD specifies, making it immediately clear where components, nodes, and utilities belong.

**Why this priority**: A well-structured scaffold reduces onboarding friction and prevents ad-hoc directory creation that diverges from the architecture.

**Independent Test**: List the `src/` directory tree and confirm it matches the documented project structure from the HLD, with the expected sub-directories present.

**Acceptance Scenarios**:

1. **Given** the project is initialised, **When** a developer inspects the directory tree, **Then** `src/components/`, `src/nodes/`, and `src/utils/` directories exist.
2. **Given** the project is initialised, **When** a developer inspects configuration files, **Then** `vite.config.ts`, `postcss.config.js`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, and `eslint.config.js` are all present at the project root.
3. **Given** the project is initialised, **When** a developer inspects `src/index.css`, **Then** Tailwind CSS v4 directives are present and the file compiles without errors.

---

### Edge Cases

- What happens when the developer has a different version of Bun installed? The project should specify a minimum Bun version in `package.json` engines field.
- What happens when port 5179 is already occupied on the host? Vite should fall back to the next available port and display the actual URL in the terminal output.
- What happens when Docker is not installed and the developer runs `docker compose up`? A clear native error message is shown; the project does not depend on Docker for the primary workflow.
- What happens when the developer runs `bun run build` before `bun install`? The build script should fail with a clear dependency-not-found error rather than a cryptic crash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST use Bun as its package manager with a committed `bun.lockb` lock file.
- **FR-002**: The project MUST be initialised as a React + TypeScript application using Vite as the build tool, with the Rolldown fork (`rolldown-vite`) aliased as `vite`.
- **FR-003**: TypeScript MUST target ES2022 with strict mode enabled. The `any` type MUST be disallowed via compiler options (i.e., `noImplicitAny: true` at minimum; project-specific lint rules may further enforce this).
- **FR-004**: The project MUST install the following core production dependencies at the specified version ranges: `react@^19.2.0`, `react-dom@^19.2.0`, `@xyflow/react@^12.10.0`, `lucide-react@^0.563.0`, `dagre@^0.8.5`, `@types/dagre@^0.7.53`, `react-syntax-highlighter@^16.1.0`, `@types/react-syntax-highlighter@^15.5.13`.
- **FR-005**: The project MUST install the following development dependencies at the specified version ranges: `rolldown-vite@7.2.5`, `typescript@~5.9.3`, `tailwindcss@^4.1.18`, `@tailwindcss/postcss@^4.1.18`, `postcss@^8.5.6`, `autoprefixer@^10.4.24`, `eslint@^10.0.0`, `@vitejs/plugin-react@^5.1.1`.
- **FR-006**: `package.json` MUST define the following scripts: `"dev": "vite"`, `"build": "tsc -b && vite build"`, `"lint": "eslint ."`, `"preview": "vite preview"`.
- **FR-007**: A `vite.config.ts` file MUST exist at the project root, configured with the `@vitejs/plugin-react` plugin.
- **FR-008**: Tailwind CSS v4 MUST be configured via `postcss.config.js` (using `@tailwindcss/postcss`) and a base `src/index.css` file that imports Tailwind.
- **FR-009**: A `Dockerfile.dev` MUST be provided, based on the `oven/bun:latest` image, exposing port 5179 and running `bun dev` as its default command.
- **FR-010**: A `docker-compose.yml` MUST be provided that builds from `Dockerfile.dev`, mounts the local project directory into the container, and maps host port 5179 to container port 5179.
- **FR-011**: The source directory MUST contain empty scaffold directories: `src/components/`, `src/nodes/`, and `src/utils/` to match the project's architectural layout.
- **FR-012**: An `index.html` entry file MUST be present at the project root, referencing the application's main TypeScript entry point (`src/main.tsx`).
- **FR-013**: A minimal `src/main.tsx` and `src/App.tsx` MUST be provided so that the development server renders a blank application shell without errors.

### Key Entities

- **Project Configuration**: The set of build and tooling configuration files (`vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `postcss.config.js`, `eslint.config.js`) that define how the project compiles, lints, and bundles.
- **Docker Environment**: The containerised development setup (`Dockerfile.dev`, `docker-compose.yml`) that mirrors the local Bun-based workflow inside a container.
- **Source Scaffold**: The initial `src/` directory tree (`components/`, `nodes/`, `utils/`) with placeholder files that establish the architectural layout for future feature development.

## Assumptions

- The project root is the workspace root (`/home/scetrov/source/frontier-flow`); there is no nested `frontierflow/` sub-directory — all scaffolded files live at the repository root.
- Tailwind CSS v4 uses the PostCSS plugin approach (`@tailwindcss/postcss`) rather than a standalone `tailwind.config.js` content-path configuration, since v4 auto-detects content files. A `tailwind.config.js` is still generated for forward compatibility but may remain minimal.
- ESLint uses flat config format (`eslint.config.js`) consistent with ESLint 10 and the project's ADR-006.
- The `@types/dagre` and `@types/react-syntax-highlighter` packages are listed as regular (non-dev) dependencies because they provide types consumed by production source code.
- Docker Compose uses Compose V2 syntax (no `version:` key required).
- Empty scaffold directories contain `.gitkeep` files so Git tracks them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can go from a fresh clone to a running dev server in under 2 minutes (install + start time combined).
- **SC-002**: `bun run build` completes successfully with zero TypeScript errors on the scaffolded codebase.
- **SC-003**: `bun run lint` passes with zero violations on all scaffolded files.
- **SC-004**: `docker compose up` starts the containerised dev server and the application is accessible at `http://localhost:5179` within 60 seconds of the command being issued.
- **SC-005**: The `src/` directory tree matches the layout documented in the HLD section 3 (Project Structure) for the directories and files covered by this feature.
- **SC-006**: All installed dependency versions satisfy the exact version constraints specified in the feature requirements (FR-004, FR-005).
