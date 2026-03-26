---
title: Frontier Flow - User Flows & Acceptance Scenarios
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-03-21
author: Scetrov
description: Step-by-step user journeys and acceptance criteria for core Frontier Flow features.
---

## Table of Contents

1. [First-Time User Experience](#1-first-time-user-experience)
2. [Building a Turret Graph](#2-building-a-turret-graph)
3. [Code Preview & Inspection](#3-code-preview--inspection)
4. [Testing a Graph](#4-testing-a-graph)
5. [Wallet Connection & Deployment](#5-wallet-connection--deployment)
6. [Deployment Review & Recovery](#6-deployment-review--recovery)
7. [GitHub Integration](#7-github-integration)
8. [Error Recovery](#8-error-recovery)

---

## 1. First-Time User Experience

### Scenario: User opens Frontier Flow for the first time

**Preconditions:** No prior session data; no wallet connected.

| Step | User Action                   | System Response                                    | Acceptance Criteria                                                                                                                          |
| ---- | ----------------------------- | ------------------------------------------------   | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Navigate to Frontier Flow URL | Page loads with dark theme canvas                  | Page loads in < 3 seconds; no console errors                                                                                                 |
| 2    | —                             | Default starter contract is displayed              | Aggression, Get Tribe, Is Aggressor, Is Same Tribe, NOT, OR, Get Priority Weight, and Add to Queue are visible in a connected flow           |
| 3    | —                             | Sidebar visible on right with grouped node types   | Event Trigger, Data Accessor, Logic Gate, and Action categories are visible                                                                  |
| 4    | —                             | Header shows "Frontier Flow" logo, version badge   | Version matches `package.json`                                                                                                               |
| 5    | Hover over a node             | Node border subtle glow effect                     | Visual feedback confirms interactivity                                                                                                       |
| 6    | —                             | Connect Wallet button visible (disconnected state) | No wallet info displayed; Deploy button disabled or hidden                                                                                   |

---

## 2. Building a Turret Graph

### Scenario: User builds a friend-or-foe turret logic from scratch

**Preconditions:** Empty canvas (or user has cleared the default graph).

| Step | User Action                                               | System Response                         | Acceptance Criteria                                                         |
| ---- | --------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| 1    | Drag "Proximity" from sidebar onto canvas                 | Proximity node appears at drop position | Node renders with "Proximity" label and `target` / `priority` outputs       |
| 2    | Drag "Get Tribe" from sidebar                             | Get Tribe node appears                  | Node shows `target` input plus `tribe` and `owner tribe` outputs            |
| 3    | Connect Proximity `target` → Get Tribe `target`           | Animated edge appears                   | Connection is accepted and uses the target socket styling                   |
| 4    | Drag "Is Same Tribe" from sidebar                         | Is Same Tribe node appears              | Node shows `tribe` and `owner tribe` inputs with a boolean `matches` output |
| 5    | Connect Get Tribe outputs into Is Same Tribe              | Two edges appear                        | `tribe` and `owner tribe` both connect successfully                         |
| 6    | Drag "NOT" from sidebar                                   | NOT node appears                        | Node shows one boolean input and one boolean output                         |
| 7    | Connect Is Same Tribe `matches` → NOT `input`             | Edge appears                            | Boolean-to-boolean connection is accepted                                   |
| 8    | Drag "Add to Queue" from sidebar                          | Add to Queue node appears               | Node shows `priority_in`, `target`, `predicate`, and `weight` inputs        |
| 9    | Connect Proximity `priority` → Add to Queue `priority_in` | Edge appears                            | Priority passthrough connection is accepted                                 |
| 10   | Connect Proximity `target` → Add to Queue `target`        | Edge appears                            | Target passthrough connection is accepted                                   |
| 11   | Connect NOT `result` → Add to Queue `predicate`           | Edge appears                            | Boolean predicate connection is accepted                                    |
| 12   | Click "Auto Arrange" in header                            | All nodes reposition into clean layout  | No overlapping nodes; left-to-right flow; < 500ms                           |

---

## 3. Code Preview & Inspection

### Scenario: User previews generated Move code

**Preconditions:** Graph with at least one complete path from trigger to action.

| Step | User Action                    | System Response                                        | Acceptance Criteria                                          |
| ---- | ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------ |
| 1    | Click "Preview Code" in header | Code generation pipeline runs                          | No visible delay for standard graphs                         |
| 2    | —                              | CodePreviewModal opens with full-screen overlay        | Backdrop blur visible; modal max-width 900px                 |
| 3    | —                              | Generated Move code displayed with syntax highlighting | `vscDarkPlus` theme; line numbers visible; valid Move syntax |
| 4    | —                              | Code contains `module frontier_flow::` header          | Module name derived from graph                               |
| 5    | —                              | Code contains `@ff-node:` annotations as comments      | Each logical section traces to a node ID                     |
| 6    | Click Copy button              | Code copied to clipboard                               | Button changes to checkmark; reverts after ~2 seconds        |
| 7    | Click Close (X) or overlay     | Modal closes                                           | Canvas visible again; no state lost                          |

---

## 4. Testing a Graph

### Scenario: User defines and runs tests against the graph

**Preconditions:** Complete graph built. Test panel feature available.

| Step | User Action                                 | System Response                                  | Acceptance Criteria                               |
| ---- | ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| 1    | Open Test Panel                             | Test definition UI appears                       | Fields for input mocks and expected outputs       |
| 2    | Define test: Proximity target = Tribe100    | Test case row created                            | Input field shows "Tribe100"                      |
| 3    | Define expected: AddToQueue receives entity | Expected output row created                      | Output assertion configured                       |
| 4    | Click "Run Local"                           | TypeScript AST walker evaluates graph            | Result appears within 1 second                    |
| 5    | —                                           | Pass/fail indicator shown                        | Green check for passing test                      |
| 6    | Click "Run Move Test"                       | `#[test]` module generated and compiled via WASM | Compilation status toast shown                    |
| 7    | —                                           | Move test result displayed                       | Pass/fail with execution gas cost                 |
| 8    | Modify graph (change a connection)          | Test states reset                                | All test results cleared; "stale" indicator shown |

---

## 5. Wallet Connection & Deployment

### Scenario: User selects a deployment target and launches deployment

**Preconditions:** A valid graph has been built; the header deploy control is visible; a Sui wallet is available for published targets and for localnet deployments when ephemeral signing is disabled.

| Step | User Action | System Response | Acceptance Criteria |
| ---- | ----------- | --------------- | ------------------- |
| 1 | Click "Connect Wallet" | dapp-kit connection modal appears | Lists available wallet options for published-target deployment |
| 2 | Select wallet and approve | Wallet connects | Header wallet state reflects the connected account |
| 3 | Click "Select deployment target" | Target list opens next to Build | Exactly `local`, `testnet:stillness`, and `testnet:utopia` are shown |
| 4 | Choose `testnet:stillness` or `testnet:utopia` | Selected target is reflected in the deploy button label | Primary action updates to `Deploy <target>` |
| 5 | Click the deploy button | Deployment validation starts immediately | Deploy action stays single-flight; duplicate launches are prevented |
| 6 | — | Deployment progress modal opens | Modal shows a progress bar and the active stage |
| 7 | Approve the wallet request when required | Deployment advances through signing and submission | Stage labels progress in order from validation to confirmation |
| 8 | Dismiss the modal while deployment is still running | Deployment continues | Closing the modal does not cancel the active attempt |
| 9 | Open the footer deployment popup after completion | Latest deployment result is shown | Popup includes target, severity, stage, and resulting package ID |
| 10 | Switch to the Move view | Deployment metadata is mirrored there | Move panel shows the same target-aware summary as the footer review surface |

### Scenario: User changes Localnet signing mode

**Preconditions:** The deployment target menu is visible and the Localnet option is available.

| Step | User Action | System Response | Acceptance Criteria |
| ---- | ----------- | --------------- | ------------------- |
| 1 | Open the Localnet settings modal from the target selector cog | Localnet settings modal appears | RPC URL, GraphQL URL, world package fields, and the `Use ephemeral keypair` checkbox are visible |
| 2 | Leave `Use ephemeral keypair` enabled | Localnet deploys stay wallet-free | Localnet deployment does not block on wallet connection and no signing prompt appears |
| 3 | Disable `Use ephemeral keypair` and save | Localnet target becomes wallet-backed | Localnet deployment now requires a connected wallet before deployment can start |
| 4 | Start a Localnet deployment with the checkbox disabled | Wallet approval is requested | Deployment progress includes a signing stage before submission |
| 5 | Re-enable `Use ephemeral keypair` and save | Localnet target returns to app-managed signing | Localnet deployment no longer requires a wallet connection |

---

## 6. Deployment Review & Recovery

### Scenario: User reviews blockers, cancellation, and session history from the status popup

**Preconditions:** The user has attempted at least one deployment during the current session.

| Step | User Action | System Response | Acceptance Criteria |
| ---- | ----------- | --------------- | ------------------- |
| 1 | Attempt deployment without a valid prerequisite | Deployment is blocked before submission | Footer indicator changes to `Deployment Blocked` |
| 2 | Open the footer deployment popup | Blocker detail is expanded | Popup includes the affected target and remediation text |
| 3 | Retry on a published target and reject wallet approval | Attempt ends as cancelled | Footer review identifies the `signing` stage and warning severity |
| 4 | Retry again with valid prerequisites | Deployment completes successfully | Footer indicator updates to `Deployed` |
| 5 | Re-open the footer deployment popup | Latest success is shown first | Popup includes the current package ID and summary |
| 6 | Inspect the bottom of the popup | Earlier attempts remain reviewable | Prior blocked or cancelled attempts are listed as earlier session history |
| 7 | Open the Move view after the retry sequence | Same review context is available outside the footer | Move panel mirrors the current deployment summary and earlier session entries |

---

## 7. GitHub Integration

### Scenario: User saves graph to GitHub for persistence

**Preconditions:** Graph built. User has a GitHub account.

| Step | User Action                   | System Response                              | Acceptance Criteria                            |
| ---- | ----------------------------- | -------------------------------------------- | ---------------------------------------------- |
| 1    | Click GitHub icon in header   | GitHub sync menu appears                     | "Login with GitHub" option visible             |
| 2    | Click "Login with GitHub"     | OAuth flow initiates                         | Redirect to GitHub authorisation page          |
| 3    | Authorise the app on GitHub   | Redirect back to Frontier Flow               | Token stored in memory; username shown in menu |
| 4    | —                             | GitHub API rate limit increased              | No rate limit warnings during compilation      |
| 5    | Click "Save to GitHub"        | Repository picker shown                      | Lists user's repos (or creates new)            |
| 6    | Select repo and confirm       | Graph JSON + Move code saved                 | Toast: "Saved to repo!"                        |
| 7    | —                             | `frontier-flow-graph.json` committed to repo | File visible in GitHub repo                    |
| 8    | Clear browser data and reload | Graph state lost locally                     | Canvas shows default graph                     |
| 9    | Login with GitHub again       | —                                            | Token restored                                 |
| 10   | Click "Load from GitHub"      | Repo picker shown                            | Previously saved graph listed                  |
| 11   | Select saved graph            | Graph restored from JSON                     | All nodes, edges, and viewport restored        |

---

## 8. Error Recovery

### Scenario: Compilation fails with an error

**Preconditions:** Graph with an intentional issue (e.g., missing required connection).

| Step | User Action                                        | System Response                                             | Acceptance Criteria                                                                    |
| ---- | -------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1    | Build an incomplete graph (missing required input) | —                                                           | Graph renders normally                                                                 |
| 2    | Click "Deploy" or "Preview Code"                   | Constraint Engine validates graph                           | —                                                                                      |
| 3    | —                                                  | Validation fails                                            | Toast: user-friendly error message (e.g., "IsInList node is missing a required input") |
| 4    | —                                                  | Offending node highlighted on canvas                        | `.node-error-highlight` CSS class applied; red glow                                    |
| 5    | Fix the connection                                 | Error highlight clears                                      | Node returns to normal styling                                                         |
| 6    | Deploy again → WASM compiler error                 | Compiler error intercepted                                  | —                                                                                      |
| 7    | —                                                  | Error mapped to originating node via `@ff-node:` source map | Specific node highlighted; readable error message shown                                |
| 8    | —                                                  | Error toast with mapped explanation                         | Non-technical user understands what went wrong                                         |

---

## 9. Keyboard Shortcuts & Accessibility Equivalents

To ensure efficiency for power users and accessibility for all, the following keyboard interactions are supported:

| Action                  | Shortcut            | Equivalent Mouse Action        |
| ----------------------- | ------------------- | ------------------------------ |
| **Navigate UI Panels**  | `Tab` / `Shift+Tab` | Clicking panel headers         |
| **Navigate Nodes**      | `Arrow Keys`        | Clicking different nodes       |
| **Select / Edit Node**  | `Enter`             | Double-clicking a node         |
| **Delete Focused Item** | `Delete` / `Bksp`   | Clicking the Trash icon        |
| **Code Preview**        | `Ctrl/Cmd + P`      | Clicking "Preview Code"        |
| **Save to GitHub**      | `Ctrl/Cmd + S`      | Clicking "Save to GitHub"      |
| **Auto Arrange**        | `Ctrl/Cmd + L`      | Clicking "Auto Arrange"        |
| **Search Sidebar**      | `Ctrl/Cmd + F`      | Clicking sidebar search/filter |
| **Close Modals**        | `Esc`               | Clicking X or backdrop         |
| **Help Overlay**        | `Ctrl/Cmd + /`      | —                              |

---

## Appendix: Journey Map

```mermaid
flowchart LR
    A["Open App"] --B["Explore Default Graph"]
    B --C["Build Custom Graph"]
    C --D["Preview Code"]
    D --E{"Looks Correct?"}
    E -->|No| C
    E -->|Yes| F["Run Tests"]
    F --G{"Tests Pass?"}
    G -->|No| C
    G -->|Yes| H["Connect Wallet"]
    H --I["Deploy / Upgrade"]
    I --J["Save to GitHub"]
    J --K["Iterate"]
    K --C
```
