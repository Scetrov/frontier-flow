---
title: Frontier Flow - Design System
version: 1.0.0
status: active
created: 2026-02-22
updated: 2026-02-27
author: Scetrov
description: Typography, colour palette, component styling, and accessibility standards for the Frontier Flow application.
---

## Typography

### Headers / Display

- **Font Family**: `Disket Mono`, monospace
- **Usage**: Headings (`h1`, `h2`, `h3`), Buttons, Logo accents

### Body

- **Font Family**: `'Inter'`, system-ui, -apple-system, sans-serif
- **Usage**: Paragraphs, Interface text

### Code

- **Font Family**: `'Fira Code'`, monospace
- **Usage**: Syntax highlighting, code preview panels, generated Move code display

## Colour Palette

### Theme Usage Guidance

[!TIP]
**Always** use usage-based variables (e.g., `--bg-primary`, `--text-primary`) instead of hardcoded colors. These variables automatically switch values based on the active theme (Light/Dark).

| Variable           | Light Mode (Stone/Warm)    | Dark Mode (Red/Nebula)   | Usage Meaning               |
| ------------------ | -------------------------- | ------------------------ | --------------------------- |
| `--bg-primary`     | `#fafaf9` (Stone 50)       | `#1a0a0a` (Deep Dark)    | Main page background        |
| `--bg-secondary`   | `#e7e5e4` (Stone 200)      | `#2d1515` (Dark Red)     | Inputs, code blocks, panels |
| `--text-primary`   | `#1c1917` (Stone 900)      | `#fafae5` (Cream White)  | Main headings, body text    |
| `--text-secondary` | `#57534e` (Stone 600)      | `#c7b8b3` (Light Stone)  | Subtitles, meta-data        |
| `--card-bg`        | `rgba(250, 250, 229, 0.9)` | `rgba(45, 21, 21, 0.85)` | Card backgrounds            |
| `--border-color`   | `#a8a29e` (Stone 400)      | `#6b6b5e` (Stone 500)    | Borders, dividers           |

### Brand Colours (Universal)

| Variable         | Value     | Usage                       |
| ---------------- | --------- | --------------------------- |
| `--brand-orange` | `#ff4700` | Primary Actions, Highlights |
| `--cream-white`  | `#fafae5` | Light Text, Accents         |

### Socket Colours (Visual Node Graph)

| Variable           | Value     | Move Core Type | Usage                              |
| ------------------ | --------- | -------------- | ---------------------------------- |
| `--socket-signal`  | `#fafae5` | `Signal`       | Boolean, triggers, execution pulse |
| `--socket-entity`  | `#54a0ff` | `Entity`       | Riders, Tribes, Targets            |
| `--socket-value`   | `#1abc9c` | `Value`        | Numbers, Standings, Strings        |
| `--socket-vector`  | `#9b59b6` | `Vector`       | Lists, Priority Queues             |
| `--socket-any`     | `#6b6b5e` | `Any`          | Universal wildcard socket          |

### Node Title Colours

To differentiate between different nodes then the following colours may be used:

- `#ff1c00`
- `#ff7500`
- `#ff003a`
- `#ff9e00`

### Functional & UI Accent Colours

| Variable           | Value     | Usage                               |
| ------------------ | --------- | ----------------------------------- |
| `--canvas-bg`      | `#334155` | Grid background for the node editor |
| `--error-glow`     | `#ff3b30` | Visual highlight for invalid nodes  |
| `--text-dark`      | `#0b0b0b` | High-contrast text on light buttons |
| `--brand-dark`     | `#e03f00` | Darker variant of brand orange      |
| `--ui-border-dark` | `#3a3a3a` | Subtle technical borders            |

## Components

- **Buttons**: `Disket Mono` font, uppercase, strict square corners (`0px` radius).
- **Cards**: "Frontier" style with angular brackets, technical borders, and no box shadow.
- **Inputs**: Square corners, minimal, technical feel.
- **Global**: Border radius is explicitly disabled (`0px`) for a technical, industrial sci-fi look (EVE Frontier inspired), including on technical shapes like sockets and nodes.

## Accessibility & Focus States

- **Focus Indicator**: All focusable elements (buttons, inputs, nodes) must display a high-contrast focus ring when focused via keyboard.
  - **Style**: `2px solid var(--brand-orange)` or a `box-shadow` glow using `var(--brand-orange)`.
  - **Behavior**: Use `:focus-visible` to ensure the ring only appears for keyboard users, maintaining the clean aesthetic for mouse users.
- **ARIA Labels**: Interactive sockets and custom nodes must have descriptive `aria-label` attributes (e.g., `aria-label="Proximity Trigger - Target Output Socket"`).
- **Contrast**: UI text must maintain a minimum contrast ratio of 4.5:1 against its background, as defined by the Stone and Red theme variables.
