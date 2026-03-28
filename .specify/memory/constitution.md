<!--
  Sync Impact Report
  ===================
  Version change: 1.1.0 → 1.2.0
  Bump rationale: MINOR — added markdown formatting governance
    requirements for repository documentation.
  Modified principles:
    - Formatting Standards → added markdown document rules for
      numbered headings, backticked paths/filenames, and prettier
      formatting.
  Added sections: none
  Removed sections: none
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
      (Constitution Check section uses generic gate reference)
    - .specify/templates/spec-template.md ✅ no changes needed
      (standard sections, no constitution-specific refs)
    - .specify/templates/tasks-template.md ✅ no changes needed
      (user-story organisation, no constitution-specific refs)
  Follow-up TODOs:
    - ADR-009 is status "Proposed"; Principle IX deploy-grade
      clauses should be revisited when ADR-009 is formally
      accepted or rejected.
-->

# Frontier Flow Constitution

## Core Principles

### I. Type Safety Above All

- All code MUST use TypeScript (target ES2022, ES Modules only).
  No CommonJS.
- `any` is forbidden without exception; use `unknown` with
  narrowing instead.
- Complex state machines MUST use discriminated unions.
- Favour immutable data and pure functions.
- Prefer readable, explicit solutions over clever shortcuts.
- Linting MUST use the `strictTypeChecked` preset from
  `typescript-eslint`, enforcing `no-floating-promises`,
  `no-misused-promises`, and `strict-boolean-expressions`.
  Rationale: unhandled promise rejections and implicit boolean
  coercions cause silent runtime failures (ADR-006).

### II. Visual Feedback is Paramount

- Every canvas interaction (drag, connect, delete, auto-arrange)
  MUST produce immediate, clear visual feedback.
- Feedback mechanisms include animations, colour coding, and
  pulse effects.
- Typed sockets MUST be colour-matched to their data type
  (Signal, Entity, Value, Vector, Any) following the Blender
  paradigm.
- Connections MUST render colour-matched animated SVG strokes
  with closed arrow markers.

### III. Domain-Driven Design

- Component structure and node types MUST map directly to game
  domain elements (e.g., `Aggression`, `Proximity`, `GetTribe`,
  `PriorityQueue`).
- The UI MUST speak the language of EVE Frontier.
- Nodes are categorised as Events, Triggers, or Actions.

### IV. Predictable Code Generation

- Generated Sui Move code MUST be deterministic — identical
  graph state MUST produce identical output.
- Generated code MUST be readable and logically sound.
- Code generation MUST be fully decoupled from UI components.
- The generator MUST validate all graph inputs to block
  injection attacks in generated smart contracts.
- Code generation MUST follow a multi-phase pipeline with a
  normalised Intermediate Representation (IR) as the stable
  interface between phases. Each phase (graph→IR, validation,
  sanitisation, optimisation, emission) MUST be independently
  unit-testable (ADR-005).
- Input sanitisation MUST be a discrete, mandatory pipeline
  phase that cannot be bypassed by changes to the emitter.
  User-supplied values MUST be validated against a strict
  alphanumeric allowlist before reaching code emission
  (ADR-005).
- The emitter MUST annotate generated Move source lines with
  `@ff-node:` comments mapping back to originating canvas node
  IDs, enabling compiler error traceability from Move
  diagnostics to canvas nodes (ADR-005).

### V. Security by Default

- Zero tolerance for logged secrets; never hardcode secrets in
  the UI or configuration.
- All untrusted external content (e.g., custom node labels)
  MUST be sanitised before rendering (use React's built-in
  escaping).
- Asynchronous operations MUST use `async/await` with clean
  error handling; no deep nesting.
- Surface user-facing errors via predefined notification
  patterns or Error Boundaries.
- Third-party WASM binaries (e.g., the Move compiler) MUST be
  pinned to an exact version and verified against a known-good
  checksum before execution. Rationale: a compromised WASM
  package could inject malicious bytecode into compiled modules
  (ADR-003, Risk R-11).

### VI. Test-First Quality

- Unit tests are mandatory for utilities, layout algorithms,
  and code generators. Cover both happy-path and error paths.
- Test Driven Development is mandatory for all new features
  and bug fixes.
- UI/interaction tests MUST accompany every UX change.
  Playwright is the E2E tool for canvas and workflow testing.
- Tests MUST NOT rely on timing assertions; use fake timers,
  mock clocks, or injected dependencies.
- Minimum 70% test coverage overall; critical paths (code
  generation, connection logic) MUST reach ≥ 90%.

### VII. Accessibility & Inclusion

- The application MUST target WCAG 2.1 Level AA compliance.
- Core operations (node navigation, connection, deletion,
  search) MUST have efficient keyboard equivalents.
- Use semantic HTML and ARIA attributes (roles, labels, live
  regions) to describe graph states to assistive technologies.
- Focusable elements MUST have a distinct, high-contrast
  `:focus-visible` state with a logical tab order.
- JSX MUST be linted with `eslint-plugin-jsx-a11y` to catch
  accessibility regressions at author time (ADR-006).
- Playwright E2E tests MUST include `axe-core` accessibility
  audits to enforce a11y compliance in CI (ADR-007).

### VIII. Durability & Maintainability

- Code MUST be modular, with single-responsibility functions and
  components.
- State must be durable across sessions within the same browser
  instance; use IndexedDB or localStorage for persistence.

### IX. Artifact Integrity & Lifecycle Separation

- Compilation status and deployment status MUST be modelled as
  separate lifecycle channels on the generated artifact. UI
  surfaces MUST NOT collapse deployment readiness into compile
  success (ADR-008).
- The `GeneratedContractArtifact` MUST be the single source of
  truth for compile readiness and deployment state. UI
  components may derive labels but MUST NOT maintain independent
  lifecycle state (ADR-008).
- Authoring-time compilation (fast in-browser feedback) and
  deploy-grade compilation (bytecode valid against live target
  dependency graphs) MUST be treated as distinct concerns.
  Deploy-grade compilation MUST NOT rely on local shim packages
  as the sole dependency resolution mechanism (ADR-009,
  status: Accepted).
- Build artifact provenance MUST be explicit: upstream
  checked-in artifacts (e.g., `Move.toml`, `Move.lock`),
  derived builder inputs (e.g., `rootGit`), and generated
  resolution outputs (e.g., `resolvedDependencies`) MUST be
  distinguishable in the compilation pipeline (ADR-009,
  status: Accepted).

## Architecture & Design Standards

- **Runtime**: React 19, TypeScript 5.9 (strict), ES Modules.
- **Build**: Vite (Rolldown fork), Bun (`bun dev`, `bun run
build`, `bun run lint`, `bun run test`).
- **Graph Engine**: `@xyflow/react` (React Flow v12).
  React Flow usage SHOULD be abstracted behind wrapper hooks
  to contain the migration surface for future major version
  upgrades (ADR-001).
- **Styling**: Tailwind CSS v4, PostCSS, CSS variables.
  Usage-based tokens (e.g., `--bg-primary`, `--text-primary`).
- **Design Language**: Sci-fi industrial aesthetic (EVE
  Frontier). Sharp, angular shapes — border-radius is `0px`
  globally without exception.
- **Typography**: `Disket Mono` (headings), `Inter` (body),
  `Fira Code` (code).
- **Separation of Concerns**: UI layer MUST remain thin.
  Canvas state via React Flow hooks. Code generation decoupled
  (`utils/codeGenerator.ts`). Layout abstracted
  (`utils/layoutEngine.ts`).
- **Performance**: Lazy-load heavy dependencies (including
  WASM bundles). Debounce high-frequency events to prevent
  render thrashing.
- **State Management**: Local React Hooks +
  `ReactFlowProvider` contexts. No global state library unless
  justified via ADR (ADR-002).
- **Blockchain**: `@mysten/sui`, `@mysten/dapp-kit`,
  `@zktx.io/sui-move-builder` (WASM).
- **Linting**: ESLint 10 flat config with
  `strictTypeChecked`, `eslint-plugin-jsx-a11y`,
  `ecmaVersion: "latest"` (ADR-006).

## Development Workflow & Guardrails

- **Signed Commits**: All commits MUST be GPG-signed. Never
  disable signing.
- **Conventional Commits**: Use `feat:`, `fix:`, `docs:`,
  `chore:`, etc.
- **Pre-PR Checks**: Run linters, type checks (`tsc -b`), and
  formatters before submitting.
- **Branch Policy**: Feature branches only. Never commit
  directly to main/master/production.
- **PR Requirements**: Minimum 1 approval, all CI checks green,
  linked issue/ticket, tests included, security review for
  sensitive changes.
- **Dependabot**: Enabled with weekly scans. Lock files
  committed (`bun.lockb`, frozen installs).
- **Naming Conventions**:
  - `PascalCase` for React components, interfaces, classes,
    enums, type aliases.
  - `camelCase` for variables, utility functions, and utility
    filenames.
  - `kebab-case` for organisational directories.
  - No `I` prefix on interfaces.
- **Temporary Files**: Write outside tracked source directories
  or add to `.gitignore`.
- **Search Boundaries**: Never run search commands over
  `/dist` or `node_modules`.

## Governance

- This constitution is the **absolute source of truth** for
  all development, architectural decisions, and project
  conventions within `frontier-flow`.
- The extended reference is `docs/CONSTITUTION.md`; this file
  is the speckit-consumable distillation.
- All PRs and code reviews MUST verify compliance with these
  principles.
- Amendments require documentation, at least one approval, and
  a migration plan for breaking changes.
- Complexity beyond these principles MUST be justified via an
  ADR in `docs/ADR/`.
- Version follows semantic versioning: MAJOR for incompatible
  governance changes, MINOR for new principles or material
  expansions, PATCH for clarifications and typo fixes.

## Formatting Standards

- Markdown paths and filenames MUST be wrapped in backticks.
- Markdown headings MUST be numbered consistently (for example,
  `# 1.`, `## 1.1.`, `### 1.1.1.`).
- Markdown files MUST be formatted with prettier, including aligned
  table columns where prettier supports them and a trailing newline
  at end of file.

**Version**: 1.2.0 | **Ratified**: 2026-02-22 | **Last Amended**: 2026-03-28
