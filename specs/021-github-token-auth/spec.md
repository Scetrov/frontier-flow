# Feature Specification: Optional GitHub Auth for Rate-Limit Recovery

**Feature Branch**: `021-github-token-auth`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "I want to build a feature that allows the use of an authenticated GitHub token for GitHub file access to reduce the chance of rate limits. This will likely mean: 1. A Login with GitHub button in the top right 2. A call to action to login with GitHub if rate limits are encountered 3. A Netlify function to handle the GitHub OAuth flow if there is no pure client-side way to do this. GitHub should be optional, but if it's needed we should push it as a fix to the specific GitHub rate-limit problems."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Restore blocked GitHub access (Priority: P1)

As a user who hits GitHub rate limits while compiling or fetching project files, I want a clear way to sign in with GitHub and retry so I can continue working without waiting for the anonymous rate limit window to reset.

**Why this priority**: Rate-limit failures block core workflows. Recovering from that failure restores the product's primary value.

**Independent Test**: Can be fully tested by simulating a rate-limit failure, signing in with GitHub, retrying the blocked action, and confirming the user can resume the same workflow without restarting their session.

**Acceptance Scenarios**:

1. **Given** a user encounters a GitHub rate-limit error during a file-fetching workflow, **When** the product presents a sign-in prompt and the user completes sign-in, **Then** the user is offered a clear retry path, the authenticated session is confirmed usable for that workflow, and the previously blocked workflow can continue.
2. **Given** a user encounters a GitHub rate-limit error and dismisses the sign-in prompt, **When** they choose not to authenticate, **Then** the product explains that anonymous access remains limited and preserves the current workspace without forcing sign-in.

---

### User Story 2 - Sign in before problems occur (Priority: P2)

As a user who expects heavy GitHub-backed usage, I want an always-available sign-in entry point in the main interface so I can authenticate before rate limits interrupt my work.

**Why this priority**: Proactive sign-in reduces interruptions, but users can still recover through the rate-limit flow if this is not present.

**Independent Test**: Can be fully tested by opening the application, initiating sign-in from the persistent entry point, and confirming the authenticated state is visible before any rate-limit warning occurs.

**Acceptance Scenarios**:

1. **Given** a user has not authenticated, **When** they view the main workspace header, **Then** they can find a visible GitHub sign-in action without entering a settings flow.
2. **Given** a user has authenticated successfully, **When** they return to the main workspace, **Then** the interface shows that GitHub access is active and does not keep prompting them to sign in again during the same session.

---

### User Story 3 - Keep GitHub optional (Priority: P3)

As a user who does not want to connect GitHub unless necessary, I want anonymous access to remain available so I can use the product normally until authenticated GitHub access becomes helpful or necessary.

**Why this priority**: Optional adoption avoids turning a rate-limit mitigation into a mandatory account-linking requirement.

**Independent Test**: Can be fully tested by using GitHub-backed features anonymously below rate limits and confirming the product does not block access or require sign-in prematurely.

**Acceptance Scenarios**:

1. **Given** a user has not authenticated and has not hit a rate limit, **When** they use GitHub-backed file access within normal limits, **Then** the workflow proceeds without a mandatory sign-in gate.
2. **Given** a user signs out or their authenticated session ends, **When** they continue using the product, **Then** the product falls back to anonymous GitHub access and only requests sign-in again when needed or user-initiated.

### Edge Cases

- The user starts sign-in but cancels before completion.
- The user finishes sign-in, but the authenticated session cannot be used for a retry because the new account still cannot complete the blocked workflow.
- The product receives repeated rate-limit responses while the user is already authenticated.
- The product cannot verify the authenticated session and must safely fall back to anonymous access.
- A user opens multiple tabs and signs in or out in one tab while another tab is actively using GitHub-backed workflows.
- The user revokes the product's GitHub access from GitHub while the product is still open.
- The user's device clock is inaccurate, causing retry timing expectations to differ from actual GitHub rate-limit reset timing.
- A GitHub access failure is caused by permissions or invalid credentials rather than rate limiting, and the product must not show the wrong recovery message.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to initiate optional GitHub authentication from a persistent, top-level action in the main workspace.
- **FR-002**: System MUST continue to support anonymous GitHub-backed file access for users who have not authenticated, unless a workflow is specifically blocked by GitHub rate limits.
- **FR-003**: System MUST detect when a GitHub-backed workflow fails because of rate limiting and present a call to action that explains authenticated access can resolve or reduce that failure.
- **FR-004**: System MUST let users complete authentication and return to the previously blocked GitHub-backed workflow context without losing their in-progress workspace state, even when the authentication flow interrupts the current browser view.
- **FR-005**: System MUST clearly communicate whether the user is currently using anonymous GitHub access, active authenticated GitHub access, or an authenticated session that needs re-authentication.
- **FR-006**: System MUST handle cancelled, failed, or expired authentication attempts with user-facing guidance and without breaking the current workflow.
- **FR-007**: System MUST allow users to continue working without GitHub authentication when authenticated access is not required for the current task.
- **FR-008**: System MUST scope this feature to GitHub file access and GitHub rate-limit recovery, rather than using GitHub authentication as a general prerequisite for unrelated product features.
- **FR-009**: System MUST protect authenticated access so that sensitive credentials are never exposed in user-visible logs, error messages, or durable browser storage beyond what is strictly necessary for the active session.
- **FR-010**: System MUST provide a way to end the authenticated GitHub session and return to anonymous access.
- **FR-011**: System MUST request only the minimum GitHub permissions needed to support GitHub file access and rate-limit recovery so that authentication friction and perceived risk stay low.
- **FR-012**: System MUST confirm that a newly authenticated GitHub session is usable for the blocked workflow before presenting the sign-in flow as a successful recovery.
- **FR-013**: System MUST distinguish rate-limit failures from other GitHub access failures, including permission-denied and invalid-session cases, so users receive the correct recovery guidance.

### Key Entities _(include if feature involves data)_

- **GitHub Access State**: Represents whether the current session is using anonymous access, active authenticated access, or an authenticated session that has become unusable and needs renewed user action.
- **Rate-Limit Incident**: Represents a GitHub-backed workflow failure specifically caused by GitHub rate limiting, including the blocked user action, when it occurred, what recovery prompt is available, and how it differs from other GitHub access failures.
- **GitHub OAuth Session**: Represents the temporary authenticated relationship between the current user session and GitHub file access, including whether it is active, expired, cancelled, revoked, or failed.

### Assumptions

- GitHub-backed file access already exists and is the only scope affected by this feature.
- Anonymous access remains the default starting state for new users.
- Authenticated GitHub access is intended to reduce rate-limit interruptions through a GitHub OAuth access token, not eliminate every possible upstream failure.
- Users do not need expanded repository-management capabilities to receive value from this feature.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of users who encounter a GitHub rate-limit failure and choose to sign in can resume the blocked workflow within 2 minutes.
- **SC-002**: At least 95% of authenticated users can identify their current GitHub access state from a persistent indicator in the main workspace without opening secondary menus or documentation.
- **SC-003**: At least 90% of anonymous users can complete GitHub-backed workflows below the rate-limit threshold without being prompted to authenticate.
- **SC-004**: Support requests or defect reports related specifically to GitHub rate-limit interruptions decrease by at least 50% after release.
