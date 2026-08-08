# Room4U Design System

One source of truth: `client/src/design/tokens.css`. Everything visual lives there; nothing is hardcoded in features.

## Layers

1. **Primitives** (`design/tokens.css`) — raw palette + type + space + shape + motion values.
2. **Semantic roles** (`design/tokens.css`) — colors by role: `--color-primary`, `--color-on-primary`, `--color-surface`, `--color-danger`, …
3. **Primitives components** (`design/primitives/`) — `Button, Card, Badge, Input, Select, Field, Alert, Spinner, Skeleton, EmptyState` + layout/utility classes in `design/primitives.css`. Feature code uses these; it never picks values.

## Tokens (quick map)

- **Color**: monochrome drafting table + one electric teal. `--color-glide-teal #71eaee` (action fills only) · `--color-teal-mist #e4feff` (soft washes) · neutrals `--color-ink-black → --color-paper-white` (black text, charcoal secondary, stone borders, bone surfaces) · semantic roles (`--color-*`) with `on-*`, `*-soft` variants. Ember survives only as the `--color-warning` family (urgent "Last bed"/"Full" badges).
- **Type**: `--font-sans` (Inter) / `--font-display` (Fraunces) · `--text-xs…display` · `--weight-*` · `--leading-*` · `--tracking-*`.
- **Space**: `--space-1…16` (4px grid).
- **Shape**: `--radius-sm/md/lg` all `6px` · inset highlight shadows (`--shadow-sm/md/lg`) · `--border-width/strong`.
- **Control**: `--control-min-h[-sm/-lg]` (touch targets) · `--focus-ring` · `--measure[-lg]`.
- **Motion**: `--dur-fast/med/slow/spin/pulse` + `--ease`.
- **Layout**: `--bp-sm/md/lg` · `--icon-sm/md/lg` · `--z-*`.

## Rules

- **One accent**: `--color-glide-teal` is the single chromatic accent, reserved for primary action fills (buttons, avatar, active CTA) and the wordmark "4". Never teal on teal, never teal as text on white (contrast fails — use `--color-ink` for focus/active indicators instead). Ember is not an accent; it is the warning family only.
- **One dark moment**: `--color-banner` (ink black) appears only on the hero. The footer is light (bone) with a hairline top border. No other dark surfaces.
- **Wordmark**: three-part mark — Room + `4` (teal spark) + `U`. On light surfaces `4` is `--teal-600`; Room and `U` inherit `--color-text-primary`. There is no dark wordmark variant anymore.
- **Borders over shadows**: structure comes from `1px` ink/stone borders; shadows are inset white highlights only (`--shadow-*`), never drop shadows.
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
