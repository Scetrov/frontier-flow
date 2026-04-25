# 1. Tasks: Optional GitHub Auth for Rate-Limit Recovery

**Input**: Design documents from `/specs/021-github-token-auth/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/github-auth.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story so each story stays independently implementable and testable.

## 2. Phase 1: Setup

**Purpose**: Add feature-specific project scaffolding for Netlify and local configuration.

- [ ] T001 Update GitHub auth dependencies and scripts in `package.json`
- [ ] T002 Create GitHub OAuth environment placeholders in `.env.example`
- [ ] T003 Add Netlify callback routing and function configuration in `netlify.toml`

---

## 3. Phase 2: Foundational

**Purpose**: Establish shared auth models, storage, client helpers, and app wiring that all user stories depend on.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [ ] T004 [P] Add shared GitHub auth client tests in `src/__tests__/githubAuthClient.test.ts`
- [ ] T005 [P] Add shared GitHub auth storage tests in `src/__tests__/githubAuthStorage.test.ts`
- [ ] T006 [P] Add GitHub auth state-machine tests in `src/__tests__/hooks/useGitHubAuth.test.tsx`
- [ ] T007 Create shared GitHub auth types in `src/types/githubAuth.ts`
- [ ] T008 Implement session storage and cross-tab sync helpers in `src/utils/githubAuthStorage.ts`
- [ ] T009 Implement OAuth popup, callback bridge, and token validation helpers in `src/utils/githubAuthClient.ts`
- [ ] T010 Implement shared GitHub auth state management in `src/hooks/useGitHubAuth.ts`
- [ ] T011 Wire shared GitHub auth state into `src/App.tsx`

**Checkpoint**: Shared auth infrastructure is ready; user stories can now proceed in priority order or in parallel.

---

## 4. Phase 3: User Story 1 - Restore blocked GitHub access (Priority: P1) 🎯 MVP

**Goal**: Recover from GitHub rate-limit failures by authenticating, validating the new session, and retrying the blocked workflow.

**Independent Test**: Simulate a GitHub rate-limit failure, complete GitHub sign-in, and confirm the blocked fetch/compile workflow retries once and resumes without losing workspace context.

### 4.1. Tests for User Story 1

- [ ] T012 [P] [US1] Add Netlify callback contract tests in `netlify/functions/__tests__/github-callback.test.ts`
- [ ] T013 [P] [US1] Add authenticated fetch and rate-limit classification tests in `src/__tests__/compiler/moveBuilderLite.test.ts`
- [ ] T014 [P] [US1] Add blocked-workflow recovery tests in `src/__tests__/App.compilation.test.tsx`

### 4.2. Implementation for User Story 1

- [ ] T015 [US1] Implement GitHub OAuth code exchange and validation callback in `netlify/functions/github-callback.ts`
- [ ] T016 [US1] Add auth-aware GitHub fetch injection and failure parsing in `src/compiler/moveBuilderLite.ts`
- [ ] T017 [US1] Surface retryable GitHub rate-limit incidents in `src/compiler/moveCompiler.ts`
- [ ] T018 [US1] Capture pending retry context and resume blocked workflows in `src/App.tsx`

**Checkpoint**: User Story 1 should now recover blocked GitHub-backed workflows end to end and can serve as the MVP.

---

## 5. Phase 4: User Story 2 - Sign in before problems occur (Priority: P2)

**Goal**: Add a persistent top-level GitHub sign-in/status surface so users can authenticate proactively.

**Independent Test**: Open the app while anonymous, trigger sign-in from the header, and confirm the header shows persistent authenticated status without waiting for a rate-limit incident.

### 5.1. Tests for User Story 2

- [ ] T019 [P] [US2] Add header GitHub auth indicator tests in `src/__tests__/Header.test.tsx`
- [ ] T020 [P] [US2] Add proactive sign-in interaction tests in `src/__tests__/App.test.tsx`

### 5.2. Implementation for User Story 2

- [ ] T021 [US2] Add persistent GitHub auth control and status indicator in `src/components/HeaderActionIcons.tsx`
- [ ] T022 [US2] Expose GitHub auth state text and accessible labels in `src/components/Header.tsx`
- [ ] T023 [US2] Connect proactive sign-in entry points to shared auth state in `src/App.tsx`

**Checkpoint**: User Story 2 should now let users authenticate proactively from the header while User Story 1 continues to work independently.

---

## 6. Phase 5: User Story 3 - Keep GitHub optional (Priority: P3)

**Goal**: Preserve anonymous access, support sign-out and re-auth flows, and keep non-rate-limit failures from pushing the wrong CTA.

**Independent Test**: Use the app anonymously below rate limits, sign out from an authenticated session, and confirm the app falls back cleanly to anonymous mode while distinguishing revoked/invalid-session errors from rate-limit errors.

### 6.1. Tests for User Story 3

- [ ] T024 [P] [US3] Add sign-out and cross-tab auth sync tests in `src/__tests__/hooks/useGitHubAuth.test.tsx`
- [ ] T025 [P] [US3] Add anonymous fallback and non-rate-limit guidance tests in `src/__tests__/App.test.tsx`

### 6.2. Implementation for User Story 3

- [ ] T026 [US3] Implement sign-out, reauth-required, and multi-tab refresh behavior in `src/hooks/useGitHubAuth.ts`
- [ ] T027 [US3] Persist non-secret auth sync signals and pending retry cleanup in `src/utils/githubAuthStorage.ts`
- [ ] T028 [US3] Apply anonymous fallback messaging and non-rate-limit guidance in `src/App.tsx`

**Checkpoint**: User Story 3 should now preserve optional GitHub usage and handle session loss without breaking the anonymous path.

---

## 7. Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, regression hardening, and quickstart validation across all stories.

- [ ] T029 [P] Document GitHub auth deployment and callback setup in `docs/DEPLOYMENT.md`
- [ ] T030 [P] Document secret-handling and browser-storage constraints in `docs/SECURITY.md`
- [ ] T031 [P] Add local GitHub OAuth configuration examples in `.env.example`
- [ ] T032 [P] Add GitHub failure-message regression coverage in `src/__tests__/compiler/moveCompiler.test.ts`
- [ ] T033 Validate quickstart steps and record verified auth flow notes in `specs/021-github-token-auth/quickstart.md`

---

## 8. Dependencies & Execution Order

### 8.1. Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion.
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can proceed in parallel with User Story 1 after shared auth wiring is in place.
- **User Story 3 (Phase 5)**: Depends on Foundational completion; recommended after User Story 1 because it extends the same auth/session paths.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### 8.2. User Story Dependencies

- **US1**: No dependency on other user stories; this is the MVP.
- **US2**: No hard dependency on US1 behavior, but shares the same auth state and callback plumbing.
- **US3**: Builds on shared auth state and should reuse the sign-in/sign-out paths established earlier without making GitHub mandatory.

### 8.3. Within Each User Story

- Write tests first and confirm they fail before implementation.
- Implement server/client contracts before wiring UI recovery paths.
- Complete each story and validate it independently before moving on.

---

## 9. Parallel Opportunities

- `T004`, `T005`, and `T006` can run in parallel once setup is done.
- `T008` and `T009` can run in parallel after `T007` creates the shared types.
- `T012`, `T013`, and `T014` can run in parallel for US1 test coverage.
- `T019` and `T020` can run in parallel for US2 UI coverage.
- `T024` and `T025` can run in parallel for US3 fallback coverage.
- `T029`, `T030`, `T031`, and `T032` can run in parallel during polish.

### 9.1. Parallel Example: User Story 1

```bash
# Launch US1 test work together
T012 netlify/functions/__tests__/github-callback.test.ts
T013 src/__tests__/compiler/moveBuilderLite.test.ts
T014 src/__tests__/App.compilation.test.tsx
```

### 9.2. Parallel Example: User Story 2

```bash
# Launch US2 test work together
T019 src/__tests__/Header.test.tsx
T020 src/__tests__/App.test.tsx
```

### 9.3. Parallel Example: User Story 3

```bash
# Launch US3 test work together
T024 src/__tests__/hooks/useGitHubAuth.test.tsx
T025 src/__tests__/App.test.tsx
```

---

## 10. Implementation Strategy

### 10.1. MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate the blocked-workflow recovery flow before moving forward.

### 10.2. Incremental Delivery

1. Ship US1 to unblock rate-limit recovery.
2. Add US2 to make sign-in proactive and visible.
3. Add US3 to harden sign-out, fallback, and multi-tab behavior.
4. Finish with polish, documentation, and regression coverage.

### 10.3. Parallel Team Strategy

1. One developer handles Netlify callback and compiler fetch plumbing for US1.
2. One developer handles shared auth hook/storage foundations once types are in place.
3. One developer handles header UI once shared auth state is available.

---

## 11. Notes

- `[P]` tasks touch separate files and can be executed concurrently.
- `[US1]`, `[US2]`, and `[US3]` labels map tasks directly to spec stories.
- Each story remains independently testable after the foundational phase.
- Prefer `bun run test:run`, `bun run lint`, and `bun run typecheck` at story checkpoints.
