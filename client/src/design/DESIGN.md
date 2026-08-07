# Room4U Design System

One source of truth: `client/src/design/tokens.css`. Everything visual lives there; nothing is hardcoded in features.

## Layers

1. **Primitives** (`design/tokens.css`) — raw palette + type + space + shape + motion values.
2. **Semantic roles** (`design/tokens.css`) — colors by role: `--color-primary`, `--color-on-primary`, `--color-surface`, `--color-danger`, …
3. **Primitives components** (`design/primitives/`) — `Button, Card, Badge, Input, Select, Field, Alert, Spinner, Skeleton, EmptyState` + layout/utility classes in `design/primitives.css`. Feature code uses these; it never picks values.

## Tokens (quick map)

- **Color**: `--teal-50…950` (deep teal, primary + banner) · `--ember-50…950` (warm sunset, banner accent + warning) · `--neutral-0…950` (cream) · semantic roles (`--color-*`) with `on-*`, `*-soft` variants.
- **Type**: `--font-sans` (Inter) / `--font-display` (Fraunces) · `--text-xs…display` · `--weight-*` · `--leading-*` · `--tracking-*`.
- **Space**: `--space-1…16` (4px grid).
- **Shape**: `--radius-sm/md/lg/full` · `--shadow-sm/md/lg` · `--border-width/strong`.
- **Control**: `--control-min-h[-sm/-lg]` (touch targets) · `--focus-ring` · `--measure[-lg]`.
- **Motion**: `--dur-fast/med/slow/spin/pulse` + `--ease`.
- **Layout**: `--bp-sm/md/lg` · `--icon-sm/md/lg` · `--z-*`.

## Rules

- **Accent on dark**: `--color-banner-accent` (ember) is the only accent allowed on `--color-banner` / header / footer — with one exception, the "Room4U" wordmark, which is three-color by design: `on-banner` (Room) + `--teal-300` (4) + `--color-banner-accent` (U).
- **Ban**: raw hex/rgb colors and `px/rem/em` lengths anywhere in `client/src` except `design/tokens.css`. Enforced by `npm run check:design`.
- **Allowlist** (documented exceptions): `0`, `100%`, `auto`, `transparent`, `currentColor`; layout-only values (`width: 100%`, `flex`, `overflow`, `position`); unitless numbers passed as props (e.g. `Skeleton` dimensions).
- **Media queries**: `@media` lines may use literal `px` breakpoints (Lightning CSS can't resolve `var()` in media conditions). Values must match the `--bp-*` tokens (`640px`/`1024px`). Enforced by `check:design` skipping `@media` lines.
- **Allowed pairs** (the "this on this" contract):
  - `surface` → `text-primary` / `text-muted` / `text-faint`
  - `primary` / `danger` → only their `on-*` token
  - `*-soft` → the matching `*-soft-text`
- **States**: every interactive element gets hover, active, focus-visible, disabled; 44px touch targets.

## Adding a screen

1. Compose from primitives (`Button`, `Card`, `Badge`, `Field`, …).
2. Co-locate a tokens-only CSS file for screen-specific layout (like `AppShell.css`).
3. Run `npm run check:design` — it must pass before build.
