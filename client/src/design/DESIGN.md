# Room4U Design System

One source of truth: `client/src/design/tokens.css`. Everything visual lives there; nothing is hardcoded in features.

## Layers

1. **Tokens** (`design/tokens.css`) — raw palette + type + space + shape + motion values.
2. **Semantic roles** (`design/tokens.css`) — colors by role: `--color-primary`, `--color-on-primary`, `--color-surface`, `--color-danger`, …
3. **Primitive components** (`design/primitives/`) — `Button, Card, Badge, Input, Select, Field, Alert, Spinner, Skeleton, EmptyState` + layout/utility classes in `design/primitives.css`. Feature code uses these; it never picks values.

## Tokens (quick map)

- **Color**: brutalist editorial on warm gray. `--color-carbon-black #000000` (blocks, primary) · `--color-warm-canvas #e5e5e5` (page) · `--color-paper-white #ffffff` (cards) · `--color-mint-chip #d1ffca` (small accent fills, chips) · `--color-voltage-yellow #fff100` (micro-only: icon accents, focus) · neutrals `--color-mist-gray → --color-graphite` · semantic roles (`--color-*`) with `on-*`, `*-soft` variants.
- **Type**: `--font-sans` (Inter) / `--font-display` (Anton) / `--font-mono` (JetBrains Mono) · `--text-xs…hero` · `--weight-*` · `--leading-*` · `--tracking-*`.
- **Space**: `--space-1…16` (4px grid).
- **Shape**: `--radius-sm/md/lg/xl/pill/full` · **all shadows `none`** (flat, border-driven) · `--border-width/strong`.
- **Control**: `--control-min-h[-sm/-lg]` (touch targets) · `--focus-ring` · `--measure[-lg]`.
- **Motion**: `--dur-fast/med/slow/spin/pulse` + `--ease`.
- **Layout**: `--bp-sm/md/lg` · `--icon-sm/md/lg/xl/2xl` · `--z-*`.

## Rules

- **Zero elevation**: no drop shadows anywhere. Structure comes from `--border-width` hairlines (`--color-border` ash) and, where it matters, `--border-strong` black outlines.
- **Black blocks**: primary actions are solid `--color-carbon-black` fills with `--color-paper-white` text; hover `--color-graphite`, active `--color-slate`.
- **Mint accent**: `--color-mint-chip` is the small-accents family — chips, soft fills, `--color-primary-soft`, the wordmark "4" spark. Never as body text on white (contrast fails).
- **Yellow is micro-only**: `--color-voltage-yellow` for icon accents, status micro-details, and the focus ring (`--color-focus`). Never as a fill.
- **One dark moment**: `--color-banner` (carbon black) appears only on the hero. The footer is light with a hairline top border. No other dark surfaces.
- **Wordmark**: three-part mark — Room + `4` (mint spark) + `U`. On light surfaces `4` is `--color-accent`; Room and `U` inherit `--color-text-primary`.
- **Ban**: raw hex/rgb colors and `px/rem/em` lengths anywhere in `client/src` except `design/tokens.css`. Enforced by `npm run check:design`.
- **Allowlist** (documented exceptions): `0`, `100%`, `auto`, `transparent`, `currentColor`; layout-only values (`width: 100%`, `flex`, `overflow`, `position`); unitless numbers passed as props (e.g. `Skeleton` dimensions).
- **Media queries**: `@media` lines may use literal `px` breakpoints (Lightning CSS can't resolve `var()` in media conditions). Values must match the `--bp-*` tokens (`640px`/`768px`/`1024px`). Enforced by `check:design` skipping `@media` lines.
- **Allowed pairs** (the "this on this" contract):
  - `surface` → `text-primary` / `text-muted` / `text-faint`
  - `primary` / `danger` → only their `on-*` token
  - `*-soft` → the matching `*-soft-text`
- **States**: every interactive element gets hover, active, focus-visible, disabled; 44px touch targets (`--control-min-h`, 48px on touch).

## Adding a screen

1. Compose from primitives (`Button`, `Card`, `Badge`, `Field`, …).
2. Co-locate a tokens-only CSS file for screen-specific layout (like `AppShell.css`).
3. Run `npm run check:design` — it must pass before build.
