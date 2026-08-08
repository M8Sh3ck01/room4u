# Room4U — Style Reference
> brutalist editorial on warm gray

**Theme:** light

Room4U is a flat, border-driven interface: black type on a warm gray canvas, white cards, and black blocks for primary actions. Two restrained sparks break the monochrome — a mint green for small accent fills and chips, and a voltage yellow used at micro-scale only (icon accents, focus). Typography is the main expressive instrument: a heavy workhorse display face (Anton) for headlines, Inter for UI, JetBrains Mono for labels and microcopy. No shadows anywhere; depth comes from 1px hairlines and the contrast between black, white, and warm gray surfaces.

Live tokens live in `client/src/design/tokens.css` — this document is the reference for the intent and rules.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Carbon Black | `#000000` | `--color-carbon-black` | Body text, headings, icon strokes, hairline borders, and primary action fills — black is the architecture |
| Paper White | `#ffffff` | `--color-paper-white` | Card surfaces, button text on black, the top of the surface stack |
| Warm Canvas | `#e5e5e5` | `--color-warm-canvas` | Page background — warm gray keeps the page from feeling cold or clinical |
| Mist Gray | `#f3f3f3` | `--color-mist-gray` | Muted surface, inputs, secondary surface level — sits between white and canvas |
| Ash | `#c6c6c6` | `--color-ash` | Hairline borders, dividers, muted surface alternation |
| Smoke | `#979797` | `--color-smoke` | Faint text, placeholder, low-emphasis details |
| Slate | `#444444` | `--color-slate` | Secondary text, muted labels, active states of black fills |
| Graphite | `#2f2f2f` | `--color-graphite` | Hover states of black fills, near-black tertiary text |
| Mint Chip | `#d1ffca` | `--color-mint-chip` | The small-accents family — chips, soft fills, wordmark "4" spark. Never as text on white |
| Voltage Yellow | `#fff100` | `--color-voltage-yellow` | Micro-only: icon accents, status details, focus ring. Never as a fill |

Semantic roles: `--color-surface` (warm canvas) · `--color-surface-muted` (mist) · `--color-surface-card` (white) · `--color-primary` (black block) / `--color-on-primary` (white) · `--color-accent` (mint) / `--color-accent-yellow` (yellow) · `--color-border` (ash) / `--color-border-strong` (black) · `--color-danger` / `--color-warning` families.

## Tokens — Typography

### Inter — Workhorse sans for body, navigation, buttons, inputs, cards, and small headings
- **Weights:** 400, 500, 600, 700
- **Token:** `--font-sans`
- **Role:** All UI text. Weight 600–700 for emphasis and labels; 400 for body.

### Anton — Heavy display face for headlines and the hero
- **Weight:** 400 (single weight, high impact)
- **Token:** `--font-display`
- **Role:** Hero and display headlines only. Uppercase, tight tracking. Never body text.

### JetBrains Mono — Technical labels and microcopy
- **Weights:** 400, 500
- **Token:** `--font-mono`
- **Role:** Uppercase kickers, fact labels, chip text, small uppercase labels with `--tracking-wider`.

### Type Scale

| Role | Size | Token |
|------|------|-------|
| xs / kicker | 14px | `--text-xs` |
| sm | 15px | `--text-sm` |
| base | 16px | `--text-base` |
| lg | 18px | `--text-lg` |
| xl | 20px | `--text-xl` |
| 2xl | 24px | `--text-2xl` |
| display | `clamp(28px, 4vw, 40px)` | `--text-display` |
| hero | `clamp(40px, 6vw, 80px)` | `--text-hero` |

Line heights: `--leading-display 1.1`, `--leading-tight 1.25`, `--leading-normal 1.5`.

## Tokens — Spacing & Shapes

**Base unit:** 4px (`--space-1`). Scale: `--space-1…16` = 4 → 64px.

**Border radius:** `--radius-sm 4px` · `--radius-md 8px` · `--radius-lg 24px` · `--radius-xl 32px` · `--radius-pill 48px` · `--radius-full 999px`. Cards and buttons use `--radius-md` (8px); chips and counters use `--radius-full`.

**Shadows:** none. Zero elevation — the system is deliberately flat and border-driven.

**Borders:** `--border-width 1px` hairlines (`--color-border` ash by default, `--color-border-strong` black where structure matters), `--border-strong 2px` for strong outlines (ghost buttons).

## Components

### Black Primary Button
**Role:** The one dominant action — "Find a room", search submit, CTA

Solid `--color-carbon-black` fill, `--color-paper-white` text, `--radius-md`. Hover `--color-graphite`, active `--color-slate`. Min-height `--control-min-h` (44px). The interface's only heavy fill moment.

### Ghost Outline Button / Link
**Role:** Secondary actions, external links — "Open in Google Maps", header links

Transparent background, `--border-strong` solid `--color-carbon-black` outline (1.5px), black text, `--radius-md`. Hover inverts: black fill, white text.

### Mint Chip
**Role:** Small status and accent chips — "~15 min walk", active filters, availability pills

`--color-mint-chip` fill with `--color-carbon-black` text, `--radius-full`, JetBrains Mono uppercase microcopy. The mint family is the only chromatic fill allowed alongside black.

### Yellow Icon Accent
**Role:** Micro moments of energy — location pins, direction icons, focus ring

`--color-voltage-yellow` applied to icons and 3px focus outlines (`--color-focus`). Yellow is never a fill and never large.

### Hero
**Role:** Statement opener on the home screen

Kicker (mono uppercase) → display headline (Anton) → optional chips → ghost CTA. Sits on the warm canvas. The single dark moment (`--color-banner` black) is reserved for this zone when used.

### Filter Toolbar
**Role:** Sticky results controls below the hero

White bar, hairline bottom border. Filter triggers open a black-bordered listbox menu (custom `FilterSelect`); the chevron rotates 180° when open; active filters render as mint chips with a "Clear all" action. Filters and map state persist in the URL (`?type=&walk=&price=&map=1`).

### Mini Map
**Role:** Spatial context on the room detail screen

Reveal-on-tap toggle ("Show location on map") → keyless Google Maps embed (`?output=embed`) at 16:9 inside an ash-bordered card. A separate "Open in Google Maps" ghost button launches walking directions (official `google.com/maps/dir/?api=1` URL).

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Warm Canvas | `#e5e5e5` | Page background — warm gray base |
| 1 | Card Surface | `#ffffff` | Cards, results, inputs — white pops against the canvas |
| 2 | Muted Surface | `#f3f3f3` | Secondary fills, fact cells, skeleton blocks |
| 3 | Black Block | `#000000` | Primary buttons, hero banner — the contrast moment |

Depth never comes from shadows: hairline borders (`--color-border`) separate cards, and black blocks provide the only strong contrast.

## Do's and Don'ts

### Do
- Use `--color-carbon-black` for primary action fills and `--color-paper-white` text on top
- Use mint `--color-mint-chip` for chips, soft accent fills, and the wordmark "4" spark
- Use yellow `--color-voltage-yellow` only at micro-scale: icons, focus rings, status dots
- Use 1px hairlines (`--color-border` ash) for card structure; `--color-border-strong` black for what must read as structural
- Set the hero and display headlines in Anton (`--font-display`), uppercase, tight tracking
- Write kickers, fact labels, and chip text in JetBrains Mono uppercase with `--tracking-wider`
- Keep every interactive target at 44px (`--control-min-h`), 48px on touch

### Don't
- Do not use drop shadows anywhere — the system is flat, border-driven
- Do not use mint or yellow as body text on white (contrast fails)
- Do not use yellow as a fill or for anything larger than an icon or focus ring
- Do not use mint as a large surface — it is the small-accents family
- Do not add more than one dark moment per page — black blocks are the exception, not the rule
- Do not use Anton for body text, navigation, buttons, or anything below `--text-display`
- Do not add gradients, blurs, or glassmorphism — the system is deliberately flat

## Agent Prompt Guide

**Quick Color Reference**
- Primary text / structure: `#000000`
- Secondary text: `#444444`
- Faint text: `#979797`
- Page background: `#e5e5e5`
- Card surface: `#ffffff`
- Muted surface: `#f3f3f3`
- Hairline border: `#c6c6c6`
- Primary action fill: `#000000`
- Accent (small fills/chips): `#d1ffca`
- Micro accent (icons/focus): `#fff100`

**Example Component Prompts**

1. *Black primary button*: Solid `#000000` fill, white text, 8px radius, 44px min-height. Hover `#2f2f2f`, active `#444444`. Focus ring `rgba(255,241,0,0.5)` 3px.

2. *Ghost outline button*: Transparent fill, 1.5px `#000000` outline, black text, 8px radius. Hover inverts to black fill + white text.

3. *Mint chip*: `#d1ffca` fill, black text, 999px radius, JetBrains Mono 14px uppercase with `0.05em` tracking.

4. *Hero*: Kicker in JetBrains Mono 14px uppercase `#979797` → headline in Anton `clamp(40px,6vw,80px)` line-height 1.1 → ghost CTA. On the `#e5e5e5` canvas.

5. *Room card*: White card on `#e5e5e5`, 1px `#c6c6c6` hairline, 8px radius. Photo top, hostel name (Anton display), mono kicker (area · type), price `#000000` weight 700, mint "~15 min walk" chip, ghost "Directions" chip with yellow map-pin icon.

## Quick Start

Single source of truth: `client/src/design/tokens.css`. Do not duplicate values — import the token file and reference `var(--color-*)`, `var(--space-*)`, etc. `npm run check:design` enforces that no raw hex/px values appear outside the token file.

### Essential Tokens

```css
:root {
  /* Colors */
  --color-carbon-black: #000000;
  --color-paper-white: #ffffff;
  --color-warm-canvas: #e5e5e5;
  --color-mist-gray: #f3f3f3;
  --color-ash: #c6c6c6;
  --color-smoke: #979797;
  --color-slate: #444444;
  --color-graphite: #2f2f2f;
  --color-mint-chip: #d1ffca;
  --color-voltage-yellow: #fff100;
  --color-focus: rgba(255, 241, 0, 0.5);

  /* Typography */
  --font-sans: 'Inter', system-ui, ...;
  --font-display: 'Anton', 'Arial Narrow', ...;
  --font-mono: 'JetBrains Mono', ui-monospace, ...;
  --text-hero: clamp(40px, 6vw, 80px);
  --leading-display: 1.1;

  /* Shape & Elevation */
  --radius-md: 8px;
  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: none;

  /* Control */
  --control-min-h: 44px;
  --control-min-h-lg: 48px;
}
```
