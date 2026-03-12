# Frontier Flow — Copilot Instructions

## Project

Frontier Flow is a visual low-code programming interface for EVE Frontier game automation. Users drag-and-drop nodes on a canvas to define game logic, then generate, compile, and deploy Sui Move smart contracts — all from the browser.

## Tech Stack

- **Runtime**: React 19, TypeScript 5.9 (strict, no `any`), ES Modules
- **Build**: Vite, Bun (`bun dev`, `bun run build`, `bun run lint`, `bun run test`)
- **Styling**: Tailwind CSS 4, CSS variables, dark theme, no border-radius
- **Graph Engine**: @xyflow/react (React Flow), dagre (auto-layout)
- **Blockchain**: @mysten/sui, @mysten/dapp-kit, @zktx.io/sui-move-builder (WASM)
- **Testing**: Vitest, @testing-library/react, Playwright, msw
- **Linting**: ESLint 10 (flat config)

## Key Conventions

- Favour immutable data and pure functions
- All public APIs need docstrings
- Typed sockets (Signal, Entity, Value, Vector, Any) — colour-coded, Blender-style
- Code generation must be deterministic and readable
- Minimum 70 % test coverage; critical paths ≥ 90 %
- Feature branches only, min 1 PR approval, all CI green before merge
- Dependabot enabled; lock files committed (`bun.lockb`, frozen installs)

## Reference Docs

Read these for deeper context when working in related areas:

- `docs/CONSTITUTION.md` — governance, principles, absolute source of truth
- `docs/SOLUTION-DESIGN.md` — architecture, internals, code references
- `docs/HLD.md` — high-level design & technical specification
- `docs/DESIGN-SYSTEM.md` — theming, typography, colours, accessibility (WCAG 2.1 AA)
- `docs/TESTING-STRATEGY.md` — test pyramid, tooling, fixtures, coverage gates
- `docs/SECURITY.md` — supply-chain hardening, secret management, XSS prevention
- `docs/GLOSSARY.md` — domain terminology (EVE Frontier, Sui, UI concepts)
- `docs/API-CONTRACTS.md` — generated code interfaces
- `docs/ADR/` — architectural decision records
