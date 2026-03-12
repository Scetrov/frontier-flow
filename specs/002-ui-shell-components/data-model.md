# Data Model: UI Shell Components

**Feature**: `002-ui-shell-components`
**Date**: 2026-03-12

## Entities

### NodeDefinition

Represents a draggable node type available in the side panel.

| Field         | Type     | Description                                      | Constraints                     |
|---------------|----------|--------------------------------------------------|---------------------------------|
| `type`        | `string` | Unique node type identifier (e.g., `"aggression"`) | Required, non-empty, unique     |
| `label`       | `string` | Human-readable display name (e.g., `"Aggression"`) | Required, non-empty             |
| `description` | `string` | Short description shown in the side panel        | Required, non-empty             |
| `color`       | `string` | Tailwind/CSS background class or variable for category indicator | Required, valid CSS class |

**Validation rules**:
- `type` must be a valid React Flow node type key (alphanumeric, camelCase).
- `label` and `description` must not contain raw HTML (React handles escaping).
- `color` must reference the design system CSS variables (e.g., `bg-[var(--brand-orange)]`).

**State transitions**: None — `NodeDefinition` is a static, read-only data structure.

### ShellLayout

The top-level page layout structure composing all shell components. Not a
persisted entity — this is a presentational composition.

| Slot       | Component   | HTML Element | Position               |
|------------|-------------|--------------|------------------------|
| `header`   | `Header`    | `<header>`   | Top, full-width        |
| `canvas`   | `DnDFlow`   | `<div>`      | Main area, flex-grow   |
| `sidebar`  | `Sidebar`   | `<aside>`    | Right of canvas        |
| `footer`   | `Footer`    | `<footer>`   | Bottom, full-width     |

**Layout**: Outer flex column (`h-screen`), inner flex row for canvas + sidebar.

### SidebarState

Tracks the open/closed state of the mobile sidebar.

| Field    | Type      | Description                       | Default |
|----------|-----------|-----------------------------------|---------|
| `isOpen` | `boolean` | Whether the mobile sidebar is visible | `false` |

**State transitions**:
- `closed → open`: User clicks toggle button (mobile only)
- `open → closed`: User clicks toggle button, clicks backdrop, or viewport resizes above `md` breakpoint

## Relationships

```
ShellLayout
├── Header (1:1)
├── Canvas / DnDFlow (1:1)
├── Sidebar (1:1)
│   ├── SidebarState (1:1, internal)
│   └── NodeDefinition[] (1:many, static list)
└── Footer (1:1)
```

## Type Definitions

```typescript
interface NodeDefinition {
  readonly type: string;
  readonly label: string;
  readonly description: string;
  readonly color: string;
}
```

Note: `ShellLayout` and `SidebarState` are implicit in JSX composition and
`useState` respectively — they do not require separate type definitions.
