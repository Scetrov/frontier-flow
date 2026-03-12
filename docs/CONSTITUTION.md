---
title: Frontier Flow - Project Constitution
version: 1.0.0
status: active
created: 2026-02-22
updated: 2026-02-27
author: Scetrov
description: Absolute source of truth for all development, architectural decisions, and project conventions within frontier-flow.
---

This document serves as the absolute source of truth for all development, architectural decisions, and project conventions within the `frontier-flow` repository. It synthesizes overarching project goals with specific technical guardrails to ensure longevity, security, and maintainability.

## 1. Product Vision & Mission

**Frontier Flow** is a visual low-code programming interface tailored for game automation logic, specifically designed for EVE Frontier Mechanics. Our mission is to provide an intuitive drag-and-drop node graph that seamlessly transforms complex game automation rules into secure and efficient **Sui Move** smart contract code.

We aim to bridge the gap between non-technical game designers/players and blockchain smart contract development by abstracting away the intricacies of the Move language through a premium, interactive node-based canvas.

---

## 2. Core Intent & Philosophy

- **Respect the Architecture:** Follow established patterns and directory layouts as they are created. Extend existing abstractions before inventing new ones.
- **Explicit over Clever:** Prefer readable, explicit solutions over clever shortcuts. Code should be clean, focused, and prioritise maintainability.
- **Clean State:** Favor immutable data and pure functions when practical. Avoid dynamic code execution from user input to maintain code generation security.

---

## 3. Core Engineering Principles

1. **Type Safety Above All:** The entire application is built with TypeScript (Target ES2022). Avoid `any` completely; prefer `unknown` along with narrowing. Rely on discriminated unions for complex state machines.
2. **Visual Feedback is Paramount:** The user interacts with a canvas. Every action (dragging, connecting, deleting, auto-arranging) must have immediate, clear, and satisfying visual feedback (e.g., animations, colour coding, pulse effects).
3. **Domain-Driven Design:** The component structure and node types directly map to game domain elements (`Aggression`, `Proximity`, `GetTribe`, `PriorityQueue`). The UI speaks the language of the game.
4. **Predictable Code Generation:** The generated Sui Move code must be deterministic, readable, and logically sound based entirely on the node graph state.
5. **Separation of Concerns:** Keep the UI layer thin.
   - **Canvas State:** Managed cleanly using React Flow hooks.
   - **Code Generation:** Decoupled entirely from UI components (`utils/codeGenerator.ts`).
   - **Layouting:** Abstracted into a standalone layout engine (`utils/layoutEngine.ts`).
6. **Performance:** Lazy-load heavy dependencies. Debounce high-frequency events to prevent render thrashing during complex node interactions.

---

## 4. UI & Design System Standards

Our application strictly adheres to the core aesthetic and theming principles outlined in the [Design System](./DESIGN-SYSTEM.md). This establishes a high-contrast, technical, "sci-fi industrial" aesthetic inspired by **EVE Frontier**.

### 4.1 Aesthetic & Theming

- **Theming:** Use usage-based CSS variables (e.g., `--bg-primary`, `--text-primary`) rather than hardcoded hex values, as defined in `DESIGN-SYSTEM.md`. For specific colour tokens (like stone variants and reds), refer to the Design System document.
- **Colour Palette & Brand Colours:**
  - Please reference the [Design System](./DESIGN-SYSTEM.md#colour-palette) for the authoritative values for light/dark mode, theme switching, and global brand accents (`--brand-orange`, `--cream-white`).
- **Borders & Shapes:** Favor sharp, angular, technical shapes to align with the sci-fi industrial aesthetic. Border radius is strictly disabled (`0px`) globally on all components (cards, inputs, buttons, nodes, and interactive sockets) without exception.

### 4.2 Typography

- **Display/Headings:** `Disket Mono` natively loaded for titles, logos, and critical UI accents.
- **Body:** `Inter` for highly readable secondary text and standard UI elements.
- **Code:** `Fira Code` for syntax highlighting the generated Move code.

### 4.3 The Node Environment & Sockets

- Nodes represent either `Events`, `Triggers`, or `Actions`.
- Nodes are styled with an opaque backdrop and a distinct top header with an icon (`lucide-react`) and standard delete mechanism.
- The canvas uses a dark background `var(--canvas-bg)` with dot gaps.
- **Typed Sockets (The Blender Paradigm):** Our connection logic relies on typed sockets that enforce connection rules through colour coordination. All domain-specific types inherit from four core Move types — `Signal` (`--socket-signal`), `Entity` (`--socket-entity`), `Value` (`--socket-value`), `Vector` (`--socket-vector`) — plus a universal `Any` (`--socket-any`) wildcard. Sockets can only connect if their types are compatible. Connections feature colour-matched animated SVG strokes and closed arrow markers.

### 4.4 Accessibility & Keyboard Navigation

- **Inclusion by Design:** The application targets **WCAG 2.1 Level AA** compliance. All interactive components must be accessible via keyboard and screen readers.
- **Keyboard-First Workflows:** Core operations (node navigation, connection, deletion, searching) must have efficient keyboard equivalents.
- **Structural Semantics:** Use semantic HTML and ARIA attributes (roles, labels, live regions) to describe complex node graph states to assistive technologies.
- **Focus Management:** Maintain a clear, logical focus order across UI panels. Focusable elements must have a distinct, high-contrast `:focus-visible` state.

---

## 5. Security & Configuration Practices

- **Zero Tolerance for Logged Secrets:** Never hardcode secrets in the UI or configuration.
- **Code Generation Safety:** The Sui Move generator must meticulously validate all graph inputs to block injection attacks in the generated smart contracts.
- **Cross-Site Scripting (XSS):** Ensure all untrusted external content (e.g., custom node labels) is sanitized before rendering in the UI. Make use of React's built-in escaping.
- **Asynchronous Operations:** Use `async/await` and handle errors cleanly without deep nesting. Surface user-facing errors via predefined notification patterns or Error Boundaries.

---

## 6. Testing Expectations

- **Comprehensive Unit Tests:** Unit tests are **mandatory**. ALWAYS include tests for utilities, layout algorithms, and code generators. Cover both the happy-path and the not-happy-path.
- **UI Tests:** Visual and interaction tests ALWAYS accompany changes to the User Experience. Playwright is recommended for End-to-End browser testing of canvas dragging and UI workflows.
- **Avoid Brittle Tests:** Do not rely on timing assertions. Prefer fake timers, mock clocks, or injected dependencies.

---

## 7. Architecture & Tech Stack

- **Framework:** React 19 + TypeScript 5.9 (ES Modules, no CommonJS)
- **Build Tool:** Vite (using Rolldown fork for extreme performance)
- **Node Graph Engine:** `@xyflow/react` (React Flow v12)
- **Styling:** Tailwind CSS v4 + PostCSS + CSS variables.
- **State Management:** Local React Hooks + `ReactFlowProvider` contexts.

---

## 8. General Guardrails & Workflow

- **Signed Commits:** All commits **MUST** be signed. NEVER attempt to disable GPG signing.
- **Conventional Commits:** Use standard conventional commit formats (e.g., `feat:`, `fix:`, `docs:`).
- **Clean Changes:** Ensure changes are clean and canonical. ALWAYS run linters, type checks (`tsc -b`), and formatters before submitting a PR.
- **Temporary Files:** If you need to write temporary files, write them outside tracked source directories or `ignore` them properly.
- **Search Boundaries:** NEVER run commands like `grep` over auto-generated directories such as `/dist` or `node_modules`.

---

## 9. Naming & Style Conventions

- **PascalCase** for React components, interfaces, classes, enums, and TS type aliases (e.g., `AggressionNode.tsx`).
- **camelCase** for variable names, utility functions, and utility filenames (e.g., `codeGenerator.ts`).
- **kebab-case** for purely organisational directories unless the standard dictates otherwise.
- **Interface Naming:** Skip the 'I' prefix for interfaces (e.g., `SocketDefinition`, not `ISocketDefinition`). Name entities based on behaviour, not implementation.

_This constitution sets the definitive baseline for reviewing any pull request or performing programmatic changes on `frontier-flow`._
