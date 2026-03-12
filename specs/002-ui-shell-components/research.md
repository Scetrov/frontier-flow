# Research: UI Shell Components

**Feature**: `002-ui-shell-components`
**Date**: 2026-03-12
**Status**: Complete

## R-001: Favicon Strategy for Vite SPA

**Decision**: Multi-format favicon set covering modern and legacy browsers.

**Rationale**: A single `.svg` favicon handles modern browsers with crisp scaling, while a `.ico` fallback ensures legacy compatibility. Apple Touch Icon handles iOS home-screen bookmarks. All files live in `public/` so Vite copies them verbatim to the build output.

**Artifacts**:
- `public/favicon.svg` — SVG favicon (primary, modern browsers)
- `public/favicon.ico` — ICO fallback (32×32, legacy browsers)
- `public/apple-touch-icon.png` — 180×180 PNG (iOS home screen)

**`index.html` links**:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

**Alternatives considered**:
- Single `.ico` only: Rejected — poor quality at high DPI, no colour adaptation.
- `vite-plugin-pwa` for full manifest + icons: Rejected — over-engineering for current scope. PWA support can be added later.

---

## R-002: Open Graph Meta Tag Set

**Decision**: Static OG meta tags in `index.html` covering title, description, image, URL, and type. Include Twitter Card tags for compatibility.

**Rationale**: Since Frontier Flow is a single-page app with a single public-facing identity (no per-page dynamic content), static meta tags in `index.html` are sufficient. Social platform crawlers (Discord, X, Slack) do not execute JavaScript, so these must be in the raw HTML.

**Required tags**:
```html
<meta property="og:title" content="Frontier Flow" />
<meta property="og:description" content="Visual low-code programming interface for EVE Frontier game automation. Drag-and-drop nodes to build Sui Move smart contracts." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://frontierflow.dev" />
<meta property="og:image" content="https://frontierflow.dev/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Frontier Flow — Visual node editor for EVE Frontier automation" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Frontier Flow" />
<meta name="twitter:description" content="Visual low-code programming interface for EVE Frontier game automation." />
<meta name="twitter:image" content="https://frontierflow.dev/og-image.png" />
```

**OG image specification**: 1200×630px PNG, branded with Frontier Flow logo and node canvas screenshot on dark background.

**Alternatives considered**:
- `react-helmet-async` for dynamic tags: Rejected — unnecessary for a single-identity SPA; adds runtime overhead and a dependency.
- Server-side rendering for dynamic OG: Rejected — no SSR in current architecture.

---

## R-003: Responsive Sidebar Pattern (Tailwind CSS 4)

**Decision**: Desktop-first sidebar using `md:` breakpoint (768px). On desktop, sidebar is a static `<aside>` within a flex layout. On mobile, sidebar is hidden by default and toggled via a button that renders it as a fixed overlay with a backdrop.

**Rationale**: The canvas needs maximum screen real estate on mobile. A fixed overlay avoids displacing the canvas during toggle. The `md:` breakpoint (768px) aligns with FR-007. Using Tailwind's responsive prefixes keeps styles co-located and avoids separate media query files.

**Pattern**:
- Layout: `<div class="flex h-screen flex-col">` wrapping `<header>`, `<main class="flex flex-1 overflow-hidden">`, `<footer>`.
- Sidebar inside `<main>`: `<aside class="hidden md:flex md:w-64 ...">` for desktop, toggled visibility for mobile.
- Mobile toggle: A button (hamburger/panel icon from lucide-react) visible only below `md:`.
- Backdrop: `<div class="fixed inset-0 bg-black/40 z-20 md:hidden">` when mobile sidebar is open.
- Transitions: `transition-transform duration-200` for slide-in, or `transition-opacity` for fade.

**Alternatives considered**:
- CSS-only `:target` sidebar: Rejected — poor state management, not accessible.
- Headless UI dialog/drawer: Rejected — adds a dependency for a simple toggle; premature.
- Right-side sidebar: Rejected — existing HLD specifies a right-side Sidebar, but the spec says "side panel" generically. Following the HLD's convention of Sidebar on the right side of the canvas.

---

## R-004: Semantic HTML Structure for App Shell

**Decision**: Use `<header>`, `<main>`, `<aside>`, and `<footer>` elements with appropriate ARIA roles and labels.

**Rationale**: Semantic elements provide built-in accessibility and SEO benefits. Screen readers can navigate by landmarks. The structure aligns with WCAG 2.1 AA (FR-011) and the constitution's Principle VII.

**Structure**:
```html
<div class="flex h-screen flex-col">
  <header role="banner">
    <!-- Logo, app title, future toolbar buttons -->
  </header>
  <main class="flex flex-1 overflow-hidden">
    <div role="region" aria-label="Node editor canvas" class="flex-1">
      <!-- ReactFlow canvas -->
    </div>
    <aside role="complementary" aria-label="Node toolbox">
      <!-- Sidebar with draggable nodes -->
    </aside>
  </main>
  <footer role="contentinfo">
    <!-- Version, repo link -->
  </footer>
</div>
```

**Alternatives considered**:
- All `<div>` with ARIA roles only: Rejected — semantic elements are preferred and provide the same roles implicitly.
- `<nav>` for sidebar: Rejected — sidebar is a toolbox/palette, not navigation. `<aside>` is semantically correct.

---

## R-005: Side Panel Drag-and-Drop Implementation

**Decision**: Use HTML5 Drag and Drop API with `draggable="true"`, `onDragStart` setting `dataTransfer` with node type and label. This matches the existing architecture specified in the SOLUTION-DESIGN.md.

**Rationale**: The HLD and SOLUTION-DESIGN.md already define this exact pattern. React Flow's `onDrop` handler expects `dataTransfer.getData('application/reactflow')`. Using the native API avoids additional dependencies and is compatible with the React Flow integration.

**Implementation**:
```typescript
const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.setData('application/label', label);
  event.dataTransfer.effectAllowed = 'move';
};
```

**Alternatives considered**:
- `@dnd-kit/core`: Rejected — adds a dependency; HTML5 DnD is sufficient and already specified in the architecture.
- React Flow's built-in drag from external: Uses the same HTML5 DnD under the hood.

---

## R-006: Footer Version Display

**Decision**: Display version from a build-time constant injected by Vite's `define` config, sourced from `package.json` version field.

**Rationale**: Vite can inject `import.meta.env` or `define` values at build time. Reading from `package.json` ensures the displayed version always matches the deployed build without runtime file fetching.

**Implementation**: In `vite.config.ts`, add:
```typescript
define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
}
```

In `Footer.tsx`, reference `__APP_VERSION__` (declared in `vite-env.d.ts`).

**Alternatives considered**:
- Fetching `package.json` at runtime: Rejected — exposes package metadata; unnecessary network request.
- Hardcoded version string: Rejected — inevitably drifts from actual package version.

---

## R-007: Side Panel Position (Left vs Right)

**Decision**: Right side of the canvas, consistent with the existing HLD and SOLUTION-DESIGN.md component hierarchy.

**Rationale**: The HLD shows `<Sidebar />` rendered after `<DnDFlow />` in the component tree, which in a flex layout places it on the right. The SOLUTION-DESIGN.md's component hierarchy confirms this positioning. Following the established architecture avoids divergence.

**Alternatives considered**:
- Left-side panel (Blender-style): Rejected — HLD already established right-side convention.
