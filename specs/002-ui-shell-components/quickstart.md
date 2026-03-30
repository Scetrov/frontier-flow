# Quickstart: UI Shell Components

**Feature**: `002-ui-shell-components`
**Date**: 2026-03-12

## Prerequisites

- Bun ≥ 1.0.0 installed
- Repository cloned and on branch `002-ui-shell-components`
- Dependencies installed: `bun install`

## Development

```bash
# Start development server
bun dev

# Run component tests
bun run test:run

# Run end-to-end tests
bun run test:e2e

# Type-check
bun run typecheck

# Lint
bun run lint

# Build production
bun run build
```

## What This Feature Adds

1. **Updated `index.html`** — Branded favicon links (SVG + ICO + Apple Touch), Open Graph and Twitter Card meta tags.
2. **`Header.tsx`** — Title bar with Frontier Flow logo SVG and application name. Uses `<header>` semantic element.
3. **`Sidebar.tsx`** — Right-side collapsible node toolbox panel. Lists all `NodeDefinition` items as draggable cards. Collapses to toggle on viewports below 768px.
4. **`Footer.tsx`** — Bottom bar with version number (from build-time constant) and repository link. Uses `<footer>` semantic element.
5. **Updated `App.tsx`** — Composes Header, main canvas area, Sidebar, and Footer into a responsive flex layout.

## Verifying the Feature

### Visual Check

1. Run `bun dev` and open `http://localhost:5179` in a browser.
2. Confirm the browser tab shows the Frontier Flow favicon and title.
3. Verify the Header is visible at the top with logo and "Frontier Flow" text.
4. Verify the Sidebar is visible on the right listing node definitions.
5. Verify the Footer is visible at the bottom with version and repo link.
6. Resize the browser below 768px and confirm the Sidebar collapses; a toggle button appears.

### Automated Test Check

1. Run `bun run test:run` to validate Header, Footer, and Sidebar component behaviour.
2. Run `bun run test:e2e` to validate branding metadata and the mobile sidebar overlay flow.
3. If Playwright is not installed locally yet, run `bunx playwright install chromium` once before the end-to-end suite.

### OG Verification

1. Build the project: `bun run build`.
2. Inspect `dist/index.html` and confirm OG meta tags are present.
3. Use an OG preview tool (e.g., opengraph.xyz) with the deployed URL to verify the card renders.

### Accessibility Check

1. Tab through the interface — all interactive elements (sidebar toggle, links) should show a focus ring.
2. Use a screen reader to verify landmarks: banner (header), main, complementary (sidebar), contentinfo (footer).

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Favicon links, OG meta tags |
| `src/App.tsx` | Shell layout composition |
| `src/components/Header.tsx` | Title bar component |
| `src/components/Sidebar.tsx` | Node toolbox panel |
| `src/components/Footer.tsx` | Version and links bar |
| `public/favicon.svg` | SVG favicon |
| `public/og-image.png` | Open Graph preview image (1200×630) |
