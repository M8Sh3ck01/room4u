# Room4U Design System

Room4U is rebuilt on the **shadcn/ui foundation** (Tailwind v4 + Radix). One source of truth: `client/tailwind.css` holds the shadcn theme contract (neutral/monochrome); `client/src/design/tokens.css` holds raw Dayos base values still referenced by feature code.

## Layers

1. **Token base** (`design/tokens.css`) — raw palette + type + space + shape + motion values (the only place raw `hex` / `px` / `rem` / `em` are allowed), plus the neutral grays feature code still maps to.
2. **Theme** (`client/tailwind.css`) — the shadcn contract (`--background`, `--card`, `--primary`, `--muted`, `--border`, `--ring`, …) set to the **default shadcn neutral palette** (white background, zinc borders, near-black primary, real shadows), with radius/size/shadow tokens (`--radius-md/lg/xl`, `--shadow-sm/md/lg`).
3. **Components** (`components/ui/`) — generated shadcn components (`Button`, `Card`, `Badge`, `Input`, `Label`, `Alert`, `Select`, `Avatar`, `Skeleton`) in their default styles.
4. **Feature code** — uses shadcn components directly plus Tailwind utilities (token-backed `var()` arbitrary values where needed). No bespoke primitives; no per-screen CSS files.

## Tokens (quick map)

- **Color**: **monochrome shadcn** — white page (`--background`), zinc borders (`--border`), `--muted`/`--muted-foreground` surfaces, near-black `--primary` buttons. The Dayos brand accents (volt yellow, mint) are no longer used in the UI.
- **Type**: `--font-sans` (Inter) / `--font-display` (Anton, wordmark + old h1s) / `--font-mono` (JetBrains Mono) · `--text-xs…hero` · `--weight-*` · `--leading-*` · `--tracking-*`.
- **Space**: `--space-1…16` (4px grid).
- **Shape**: `--radius-sm/md/lg/xl` (`6px/8px/12px/16px`) · real `--shadow-sm/md/lg` · `--border-width/strong`.
- **Control**: `--control-min-h[-sm/-lg]` (touch targets) · `--focus-ring` · `--measure[-lg]`.
- **Motion**: `--dur-fast/med/slow/spin/pulse` + `--ease`.
- **Layout**: `--bp-sm/md/lg` · `--icon-sm/md/lg/xl/2xl` · `--z-*`.

## Rules

- **Default shadcn look**: white background, `border` + `shadow-sm` cards (`rounded-xl`), 8px button radii, neutral focus rings. No raw Dayos accent fills.
- **Primary actions**: `Button variant="default"` (near-black) with white text.
- **Status colors** remain for feedback only: `--color-danger-soft/-success-soft/-warning-soft/-info-soft` with their `*-soft-text` pairs on badges/alerts.
- **Wordmark**: three-part mark — Room + `4` + `U`, all monochrome `text-foreground`.
- **Ban**: raw hex/rgb colors and `px/rem/em` lengths anywhere in `client/src` except `design/tokens.css`. Enforced by `npm run check:design` (which also scans `.jsx`, so token-backed `var()` arbitrary values are required in feature code).
- **Utilities over CSS**: layout lives in Tailwind utilities in feature JSX. There are no feature `.css` files.
- **Allowed pairs** (the "this on this" contract):
  - `surface` → `text-primary` / `text-muted` / `text-faint`
  - `primary` / `danger` → only their `on-*` token
  - `*-soft` → the matching `*-soft-text`
- **States**: every interactive element gets hover, active, focus-visible, disabled; 44px touch targets (`--control-min-h`, 48px on touch).

## Adding a screen

1. Compose from shadcn components (`Button`, `Card`, `Badge`, `Input`, `Label`, `Alert`, `Select`, `Avatar`, `Skeleton`) and Tailwind utilities.
2. Use token-backed arbitrary values (e.g. `bg-[var(--color-primary-soft)]`, `min-h-[var(--control-min-h)]`) when a utility doesn't exist.
3. Run `npm run check:design` — it must pass before build.
