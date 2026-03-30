# Tasks: Project Workspace Initialisation

**Input**: Design documents from `/specs/001-project-workspace-init/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

`__tests__`: Not requested in the feature specification. Test tooling installation is deferred to a subsequent feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the project manifest and Git ignore rules that all other phases depend on

- [x] T001 Create package.json with name, version, type: module, private: true, scripts (dev, build, lint, preview), and engines field in package.json
- [x] T002 [P] Create .gitignore with node_modules/, dist/, and common build/editor artefacts in .gitignore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript configuration files that MUST exist before build, lint, or any source files can compile

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — `tsc -b` and ESLint `projectService` both depend on these files

- [x] T003 Create tsconfig.json project references root with references to tsconfig.app.json and tsconfig.node.json in tsconfig.json
- [x] T004 [P] Create tsconfig.app.json with target ES2022, strict, noImplicitAny, module ESNext, moduleResolution bundler, jsx react-jsx, includes src/ in tsconfig.app.json
- [x] T005 [P] Create tsconfig.node.json with target ES2022, module ESNext, moduleResolution bundler, includes vite.config.ts in tsconfig.node.json

**Checkpoint**: TypeScript project references ready — source files can now be compiled and type-checked

---

## Phase 3: User Story 1 — Developer Bootstraps the Project Locally (Priority: P1) 🎯 MVP

**Goal**: A developer can clone the repo, run `bun install` then `bun dev`, and see a blank application shell at localhost:5179 with zero errors. Build and lint also pass.

**Independent Test**: Clone the repository, run `bun install` then `bun dev`, and confirm the Vite dev server starts and serves a page at `http://localhost:5179` that renders without console errors.

### Implementation for User Story 1

- [x] T006 [P] [US1] Create vite.config.ts with @vitejs/plugin-react plugin, importing defineConfig from vite in vite.config.ts
- [x] T007 [P] [US1] Create postcss.config.js with @tailwindcss/postcss and autoprefixer plugins in postcss.config.js
- [x] T008 [P] [US1] Create tailwind.config.js with content paths for index.html and src/**/*.{ts,tsx} in tailwind.config.js
- [x] T009 [P] [US1] Create eslint.config.js per ADR-006 with strictTypeChecked, react-hooks, react-refresh, jsx-a11y in eslint.config.js
- [x] T010 [P] [US1] Create index.html entry file with charset, viewport meta, title frontierflow, div#root, and script type=module src=/src/main.tsx in index.html
- [x] T011 [P] [US1] Create src/index.css with @import tailwindcss, CSS custom properties (--brand-orange), and font-face declarations in src/index.css
- [x] T012 [P] [US1] Create src/App.tsx root component shell that renders a minimal placeholder div in src/App.tsx
- [x] T013 [P] [US1] Create src/main.tsx that imports React, ReactDOM, App, and index.css, renders App into document.getElementById root in src/main.tsx
- [x] T014 [US1] Install all production dependencies (react, react-dom, @xyflow/react, lucide-react, dagre, react-syntax-highlighter, @types/dagre, @types/react-syntax-highlighter) and dev dependencies (rolldown-vite, typescript, tailwindcss, @tailwindcss/postcss, postcss, autoprefixer, eslint, @eslint/js, globals, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, eslint-plugin-jsx-a11y, @vitejs/plugin-react, @types/react, @types/react-dom) via bun install
- [x] T015 [US1] Verify bun dev starts Vite dev server on port 5179, bun run build produces dist/ with zero TS errors, and bun run lint passes with zero violations

**Checkpoint**: User Story 1 fully functional — local development workflow works end to end (SC-001, SC-002, SC-003)

---

## Phase 4: User Story 2 — Developer Builds and Runs via Docker (Priority: P2)

**Goal**: A developer can run `docker compose up` and access the same application at localhost:5179 without installing Bun locally.

**Independent Test**: Run `docker compose up` from the project root, wait for the container to start, and verify the application is accessible at `http://localhost:5179`.

### Implementation for User Story 2

- [x] T016 [P] [US2] Create Dockerfile.dev based on oven/bun:latest with WORKDIR /app, COPY package.json and bun.lockb, RUN bun install, COPY source, EXPOSE 5179, CMD bun dev --host in Dockerfile.dev
- [x] T017 [US2] Create docker-compose.yml with app service building from Dockerfile.dev, port mapping 5179:5179, bind mount .:/app, anonymous volume for node_modules, and CHOKIDAR_USEPOLLING=true in docker-compose.yml

**Checkpoint**: User Story 2 functional — Docker workflow mirrors local dev (SC-004)

---

## Phase 5: User Story 3 — Developer Navigates a Predictable Directory Structure (Priority: P3)

**Goal**: The src/ directory matches the HLD project structure with clearly named sub-directories for components, nodes, and utilities.

**Independent Test**: List the `src/` directory tree and confirm it matches the documented project structure from the HLD, with the expected sub-directories present.

### Implementation for User Story 3

- [x] T018 [P] [US3] Create src/components/.gitkeep to preserve empty components directory in src/components/.gitkeep
- [x] T019 [P] [US3] Create src/nodes/.gitkeep to preserve empty nodes directory in src/nodes/.gitkeep
- [x] T020 [P] [US3] Create src/utils/.gitkeep to preserve empty utils directory in src/utils/.gitkeep
- [x] T021 [P] [US3] Create public/vite.svg default Vite favicon in public/vite.svg
- [x] T022 [US3] Verify src/ directory tree matches HLD section 3 layout and all config files (vite.config.ts, postcss.config.js, tsconfig.json, tsconfig.app.json, tsconfig.node.json, eslint.config.js) are present at project root (SC-005)

**Checkpoint**: All three user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [x] T023 Verify all installed dependency versions satisfy FR-004 and FR-005 version constraints (SC-006)
- [x] T024 Run quickstart.md validation — execute full clone-to-running sequence from specs/001-project-workspace-init/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (package.json must exist for tsconfig references to work)
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (tsconfig files required for build/lint)
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (Docker needs all project files + bun.lockb)
- **User Story 3 (Phase 5)**: Can start after Phase 2 (directory creation is independent), but verification (T022) depends on Phase 3
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational (Phase 2). No dependencies on other stories.
- **User Story 2 (P2)**: Depends on User Story 1 (needs working project files and bun.lockb for Docker image).
- **User Story 3 (P3)**: Implementation tasks (T018–T021) can start after Phase 2. Verification (T022) depends on Phase 3.

### Within Each User Story

- Config files (T006–T011) are independent — all [P]
- Source files (T012, T013) are independent — both [P]
- Dependency installation (T014) depends on all config + source files being created
- Verification (T015) depends on installation (T014)

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel
- T004 and T005 (tsconfig.app.json and tsconfig.node.json) can run in parallel after T003
- T006–T013 (all US1 config and source files) can all run in parallel
- T016 and T017 (Docker files) — T016 is independent, T017 depends on T016
- T018–T021 (all .gitkeep and vite.svg) can all run in parallel

---

## Parallel Example: User Story 1

```text
# Wave 1 — Launch all config and source files together:
T006: Create vite.config.ts
T007: Create postcss.config.js
T008: Create tailwind.config.js
T009: Create eslint.config.js
T010: Create index.html
T011: Create src/index.css
T012: Create src/App.tsx
T013: Create src/main.tsx

# Wave 2 — Sequential (depends on wave 1):
T014: Install dependencies via bun install

# Wave 3 — Sequential (depends on wave 2):
T015: Verify dev, build, lint all succeed
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (package.json, .gitignore)
2. Complete Phase 2: Foundational (3 tsconfig files)
3. Complete Phase 3: User Story 1 (configs, source files, install, verify)
4. **STOP and VALIDATE**: `bun dev`, `bun run build`, `bun run lint` all pass
5. This is a deployable increment — local dev works

### Incremental Delivery

1. Setup + Foundational → TypeScript project skeleton ready
2. Add User Story 1 → Local dev works → MVP!
3. Add User Story 2 → Docker workflow works
4. Add User Story 3 → Directory scaffold matches HLD
5. Polish → All success criteria verified

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No test tasks included — test tooling installation is deferred to a subsequent feature per spec
- `rolldown-vite@7.2.5` is imported as `vite` in config files (see research.md R-001)
- Tailwind CSS v4 uses `@import "tailwindcss"` not `@tailwind` directives (see research.md R-006)
- ESLint config follows ADR-006 exactly (see research.md R-004)
- Commit after each task or logical group using conventional commit format (`feat: ...`)
