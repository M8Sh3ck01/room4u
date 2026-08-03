# Design Critique Log

## Protocol

- **When**: after every shipped change that touches the UI (features, screens, components), before the user reviews it.
- **What**: a numbered critique ranked by severity; each item names the violated principle (contrast/WCAG, visual hierarchy, consistency, affordance, etc.) and the file/line.
- **How applied**: one fix at a time; each fix ships as its own commit, verified with `npm run check:design` + `npm run build` (client) before pushing.
- **Backlog**: deferred items below stay open until fixed. Move fixed items to the Resolved table with the commit that closed them.

## Open

- [ ] **Date input locale** — `type="date"` renders the browser's `mm/dd/yyyy` regardless of locale; a native input can't be reformatted. Only fixable by replacing with a custom input.
  - `client/src/features/browse/BrowseScreen.jsx` (Available from field)
- [ ] **Empty-catalog CTA** — the landing-style empty state currently has no action button; pending a decision on the mechanism (WhatsApp "message us" needs an operator number, or a landlord "list your room" link).
  - `client/src/features/browse/BrowseScreen.jsx`

## Resolved

| # | Fix | Commit |
|---|-----|--------|
| 1 | Muted text darkened to `--neutral-700` (WCAG AA ~5.8:1) | `5db0e99` |
| 2 | Areas load-failure now shows a warning Alert (was silent empty select) | `457b217` |
| 3 | "Move-in date" relabeled "Available from" + hint (field is on-or-after) | `523f821` |
| 4 | Filters toggle + results count grouped into one controls row | `6158bfe` |
| 5 | Filter model unified on Apply; skeleton matches card 16:9 geometry | `05d52a5` |
| 6 | Card v2: distance on its own row, walking-directions footer link, type badge dropped | `2467f73` |
| 7 | Empty state mirrors active filters; "Reset" label unified | `ac69834` |
| 8 | Empty-state title branches on whether filters are active; fixed missing punctuation | `4afd451` |
| 9 | A11y: `aria-controls`/panel `id`, `role="status"` on count, `aria-busy` on results region | `4afd451` |
| 10 | Hero copy tightened to one line ("Rooms near Mzuzu University") | `4afd451` |
| 11 | Skeleton now matches full card geometry (photo, body, price line, footer) | `4afd451` |
| 12 | Adaptive empty state: hide Filters/0-rooms when catalog is empty; landing-style message; Reset only shown when filters are active; fixed duplicate copy | `02c17fe` |
