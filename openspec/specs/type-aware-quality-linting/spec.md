## ADDED Requirements

### Requirement: Stable lint command
The repository SHALL expose type-aware Oxlint through the existing `bun run lint` command, and the command SHALL return a non-zero exit status for lint errors while retaining warning-level findings as non-blocking.

#### Scenario: Lint succeeds without errors
- **WHEN** a developer or automation runs `bun run lint` and only warning-level or no findings are present
- **THEN** Oxlint completes with a zero exit status

#### Scenario: Lint fails on an error
- **WHEN** a covered file violates an error-level rule
- **THEN** `bun run lint` returns a non-zero exit status and reports the file and rule

### Requirement: Existing integration contract is preserved
CI, pre-commit hooks, aggregate verification scripts, and editor tasks SHALL continue to invoke the repository's `lint` package script rather than depending directly on an ESLint- or Oxlint-specific executable.

#### Scenario: Quality gates invoke lint
- **WHEN** CI, pre-commit, `verify`, `verify:full`, or the VS Code lint task runs
- **THEN** the integration invokes `bun run lint` and receives Oxlint's result

### Requirement: Existing lint file boundaries are preserved
The lint configuration SHALL apply rule-bearing TypeScript analysis to `src/**/*.{ts,tsx}`, `tests/**/*.ts`, `vite.config.ts`, `playwright.config.ts`, and `netlify/functions/**/*.ts`. It SHALL NOT add `scripts/**/*.ts` or unrelated root/public JavaScript files to the covered set as part of this change.

#### Scenario: Application and test files are covered
- **WHEN** a lint violation is introduced in a matching application, test, configuration, or Netlify TypeScript file
- **THEN** `bun run lint` reports the violation

#### Scenario: Existing uncovered scripts remain outside scope
- **WHEN** `bun run lint` traverses the repository
- **THEN** files under `scripts/**/*.ts` are not assigned the migrated rule set

### Requirement: Generated outputs remain ignored
The lint configuration SHALL ignore `dist`, `build`, `coverage`, `playwright-report`, `test-results`, `node_modules`, `node-compile-cache`, and `playwright-transform-cache*`.

#### Scenario: Generated file is present
- **WHEN** a generated or cached file exists under an ignored path
- **THEN** `bun run lint` does not report findings from that file

### Requirement: Type-aware TypeScript protections are enforced
Covered TypeScript files SHALL be linted with Oxlint's type-aware engine. The configured rules SHALL include the current strict protections for unhandled or misused promises, unsafe type operations, unnecessary conditions and assertions, and related type-sensitive behavior. The configuration SHALL explicitly enable `typescript/strict-boolean-expressions` to enforce the repository's documented boolean-safety policy.

#### Scenario: Promise is left unhandled
- **WHEN** a covered TypeScript file creates a promise without handling, awaiting, returning, or deliberately voiding it
- **THEN** lint reports an error from the applicable type-aware promise rule

#### Scenario: Unsafe typed operation is introduced
- **WHEN** a covered TypeScript file performs an unsafe assignment, call, argument, return, or member access
- **THEN** lint reports an error from the corresponding type-aware unsafe-operation rule

#### Scenario: Nullable value is used as an implicit boolean
- **WHEN** a covered TypeScript file uses a nullable string, number, object, or other disallowed value directly as a condition
- **THEN** lint reports `typescript/strict-boolean-expressions`

### Requirement: TypeScript globals are resolved by TypeScript
Core `no-undef` SHALL be disabled for covered TypeScript scopes so TypeScript declarations and configured environment types, including Vitest globals, are not reported as undefined JavaScript identifiers.

#### Scenario: Vitest global is used in a typed test
- **WHEN** a covered test uses a configured Vitest global such as `vi`
- **THEN** lint does not report core `no-undef` for that identifier

### Requirement: React correctness protections are preserved
Covered React source and tests SHALL enforce the Rules of Hooks as errors, exhaustive dependency findings as warnings, and React Compiler correctness analysis as errors.

#### Scenario: Hook order is conditional
- **WHEN** a covered React component or hook calls a hook conditionally
- **THEN** lint reports an error from `react/rules-of-hooks` or React Compiler analysis

#### Scenario: Effect dependency is missing
- **WHEN** a covered React hook omits a required effect dependency
- **THEN** lint reports a warning from `react/exhaustive-deps`

#### Scenario: React Compiler invariant is violated
- **WHEN** covered React code mutates protected values, accesses refs during render, performs prohibited state updates, or otherwise violates a supported React Compiler invariant
- **THEN** lint reports an error from `react/react-compiler`

### Requirement: Vite Fast Refresh boundaries are preserved
Covered React source and tests SHALL enforce `react/only-export-components` with constant exports allowed, matching the existing Vite Fast Refresh preset semantics.

#### Scenario: Primitive constant accompanies component export
- **WHEN** a module exports a React component and a primitive constant
- **THEN** lint does not report the constant export as a Fast Refresh violation

#### Scenario: Unsafe non-component export accompanies component
- **WHEN** a module export would make the module incompatible with the configured Fast Refresh boundary
- **THEN** lint reports `react/only-export-components`

### Requirement: JSX accessibility checks remain active
Covered JSX and TSX files SHALL enforce the migrated native JSX accessibility rule set. The unsupported `includeRoles` option on `jsx-a11y/control-has-associated-label` SHALL NOT be emitted into the Oxlint configuration, and the resulting `alert` and `dialog` author-time limitation SHALL be documented with Axe E2E audits retained as the runtime accessibility backstop.

#### Scenario: Native JSX accessibility violation is introduced
- **WHEN** covered JSX violates a configured native accessibility rule, such as missing alternate text, invalid ARIA properties, or missing keyboard support
- **THEN** lint reports an error from the corresponding `jsx-a11y` rule

#### Scenario: Lint configuration is loaded
- **WHEN** Oxlint parses the accessibility rule configuration
- **THEN** configuration loading succeeds without the unsupported `includeRoles` option

### Requirement: Maintainability warnings retain their thresholds and scope
Production source files under `src/**/*.{ts,tsx}` SHALL receive warning-level limits of complexity 10, nesting depth 4, 100 lines per function excluding blank/comment lines and treating IIFEs specially, and 4 parameters. Files under `src/**/__tests__/**`, `src/test/**`, and `src/__fixtures__/**` SHALL remain excluded from these four limits.

#### Scenario: Production function exceeds a limit
- **WHEN** a production source function exceeds a configured maintainability threshold
- **THEN** lint reports the corresponding finding as a warning

#### Scenario: Test or fixture exceeds a production limit
- **WHEN** a file under an excluded test or fixture path exceeds a maintainability threshold
- **THEN** lint does not report that maintainability rule for the file

### Requirement: Narrow suppressions remain effective
The four existing ESLint suppression directives for `complexity` and `max-lines-per-function` SHALL be converted to Oxlint directives that retain their current file-level or next-line scope. Blanket or unrelated new suppressions SHALL NOT be introduced to make the migration pass.

#### Scenario: Existing justified exception is linted
- **WHEN** lint reaches one of the four currently suppressed functions or files
- **THEN** only the named maintainability warning is suppressed at the existing scope

#### Scenario: Unrelated violation is present near a suppression
- **WHEN** another rule is violated in or near a suppressed region
- **THEN** lint continues to report the unrelated rule

### Requirement: Type checking remains an independent gate
The repository SHALL retain `tsc -b` as the implementation of `bun run typecheck`, including its separate CI and pre-commit execution. Oxlint type-aware linting SHALL NOT replace complete compiler diagnostics in this change.

#### Scenario: Compiler-only error exists
- **WHEN** source code contains a TypeScript compiler error that is not represented by a lint rule
- **THEN** `bun run typecheck` reports the error independently of `bun run lint`

### Requirement: Active policy documents identify the current lint toolchain
The repository SHALL add an ADR superseding ADR-006 and update active governance and contributor documentation to describe Oxlint, type-aware linting, the React Compiler aggregate, the strict boolean policy, and the known accessibility option difference. Historical project-initialization artifacts SHALL remain unchanged.

#### Scenario: Contributor consults active guidance
- **WHEN** a contributor reads the constitution, contributor guidance, current ADRs, or verification documentation
- **THEN** the guidance identifies `bun run lint` as Oxlint-backed and does not instruct the contributor to configure typescript-eslint
