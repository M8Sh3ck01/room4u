# Room4U Design System

Room4U is built on the **shadcn/ui foundation** (Tailwind v4 + Radix). The single source of truth is `client/tailwind.css` — the shadcn theme contract in a neutral/monochrome palette. The old custom Dayos token layer (`client/src/design/tokens.css`) has been removed entirely.

## Layers

1. **Theme** (`client/tailwind.css`) — the shadcn contract (`--background`, `--card`, `--primary`, `--muted`, `--border`, `--ring`, …) set to the **default shadcn neutral palette** (white background, zinc borders, near-black primary, real shadows), with radius/shadow tokens (`--radius-sm/md/lg/xl`, `--shadow-sm/md/lg`). This is the only file holding raw `hex` values.
2. **Base** (`src/index.css`) — global resets (fonts, focus-visible). No tokens beyond shadcn theme vars.
3. **Components** (`components/ui/`) — generated shadcn components (`Button`, `Card`, `Badge`, `Input`, `Label`, `Alert`, `Select`, `Avatar`, `Skeleton`) in their default styles.
4. **Feature code** — uses shadcn components directly plus Tailwind utilities. No bespoke primitives; no per-screen CSS files.

## Tokens

- **Color**: **monochrome shadcn** — white page (`--background`), zinc borders (`--border`), `--muted`/`--muted-foreground` surfaces, near-black `--primary` buttons.
- **Type**: `--font-sans` (Inter) / `--font-mono` (JetBrains Mono). Headings are default sans — no display/Anton typeface.
- **Shape**: `--radius-sm/md/lg/xl` (`6px/8px/12px/16px`) · real `--shadow-sm/md/lg`.
- **Status**: semantic Tailwind palette utilities for feedback only — `amber` (warning/pending), `emerald` (success/paid), `red` (danger/cancelled), `sky` (info/refunded).

## Rules

- **Default shadcn look**: white background, `border` + `shadow-sm` cards (`rounded-xl`), default button radii, neutral focus rings.
- **Primary actions**: `Button variant="default"` (near-black) with white text.
- **Headings**: sans-serif, sentence case. The old brutalist Anton/uppercase `h1/h2` base rules are gone; every heading carries explicit shadcn-size utilities (`text-2xl font-semibold tracking-tight` etc.).
- **Wordmark**: three-part mark — Room + `4` + `U`, all monochrome `text-foreground`, bold sans.
- **Ban**: raw hex/rgb colors and `px/rem/em` lengths anywhere in `client/src`. Enforced by `npm run check:design` (scans `.jsx`/`.js`/`.css`, skips vendored `components/ui`).
- **Utilities over CSS**: layout lives in Tailwind utilities in feature JSX. There are no feature `.css` files.

## Adding a screen

1. Compose from shadcn components (`Button`, `Card`, `Badge`, `Input`, `Label`, `Alert`, `Select`, `Avatar`, `Skeleton`) and Tailwind utilities.
2. Use shadcn theme vars only (`--background`, `--muted`, `--border`, …) for any arbitrary value.
3. Run `npm run check:design` — it must pass before build.
