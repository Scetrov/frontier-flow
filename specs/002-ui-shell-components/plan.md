# Implementation Plan: UI Shell Components

**Branch**: `002-ui-shell-components` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-ui-shell-components/spec.md`

## Summary

Build the high-level UI shell for Frontier Flow: branded favicon and Open Graph metadata in `index.html`, a title bar (Header) component with logo and app name, a collapsible side panel (Sidebar) listing draggable node definitions, and a footer with version info and repository link. All components use Tailwind CSS 4 utility classes, semantic HTML, the existing CSS variable design tokens, and are responsive from 320px to 2560px.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, ES Modules), HTML5
**Primary Dependencies**: React 19, Tailwind CSS 4, lucide-react (icons), Vite (build)
**Storage**: N/A
**Testing**: Vitest + @testing-library/react (unit), Playwright (E2E)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Single-page web application (React SPA)
**Performance Goals**: Shell render within 1 second of initial page load
**Constraints**: No horizontal scrollbar from 320px–2560px; WCAG 2.1 AA compliance
**Scale/Scope**: 4 shell components (Header, Sidebar, Footer, updated index.html)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Type Safety Above All | PASS | All components use TypeScript strict; no `any` |
| II. Visual Feedback is Paramount | PASS | Drag start feedback on sidebar items; toggle transitions |
| III. Domain-Driven Design | PASS | Sidebar node definitions map to EVE Frontier domain (Aggression, Proximity, etc.) |
| IV. Predictable Code Generation | N/A | Feature does not involve code generation |
| V. Security by Default | PASS | No secrets; all rendered content is hardcoded or sanitised by React |
| VI. Test-First Quality | PASS | Unit tests for each component; E2E for layout and drag interactions |
| VII. Accessibility & Inclusion | PASS | Semantic HTML (header/nav/aside/footer), ARIA labels, :focus-visible, keyboard toggle |

**Gate result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-shell-components/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
index.html                          # Updated: favicon links, OG meta tags
public/
├── favicon.svg                     # New: branded SVG favicon
├── favicon.ico                     # New: ICO fallback (32×32)
├── apple-touch-icon.png            # New: iOS home screen icon (180×180)
├── og-image.png                    # New: Open Graph preview image (1200×630)
└── site.webmanifest                # New: web app manifest
src/
├── App.tsx                         # Updated: compose shell layout
├── components/
│   ├── Header.tsx                  # New: title bar with logo and app name
│   ├── Sidebar.tsx                 # New: collapsible node toolbox panel
│   └── Footer.tsx                  # New: version info and repo link
└── __tests__/
    ├── Header.test.tsx             # New: unit tests
    ├── Sidebar.test.tsx            # New: unit tests
    └── Footer.test.tsx             # New: unit tests
```

**Structure Decision**: Single-project structure following the existing `src/components/` convention established in the HLD. Tests co-located under `src/__tests__/` following Vitest conventions. Static assets in `public/` per Vite standards.

## Complexity Tracking

No constitution violations — this section is intentionally empty.
