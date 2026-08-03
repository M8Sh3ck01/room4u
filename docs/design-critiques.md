# Design Critique Log

## Protocol

- **When**: after every shipped change that touches the UI (features, screens, components), before the user reviews it.
- **What**: a numbered critique ranked by severity; each item names the violated principle (contrast/WCAG, visual hierarchy, consistency, affordance, etc.) and the file/line.
- **How applied**: one fix at a time; each fix ships as its own commit, verified with `npm run check:design` + `npm run build` (client) before pushing.
- **Backlog**: deferred items below stay open until fixed. Move fixed items to the Resolved table with the commit that closed them.

## Open

- [ ] **Home / hero copy** — the two-sentence paragraph (value prop + spec) delays first content below the fold on mobile; tighten to one line.
  - `client/src/features/home/HomeScreen.jsx:68`
- [ ] **Date input locale** — `type="date"` renders the browser's `mm/dd/yyyy` regardless of locale; format hint not visible on all browsers.
  - `client/src/features/home/HomeScreen.jsx` (Available from field)
- [ ] **Type duplication** — room type shown both as a filter and (removed from cards, still) the detail badge; verify no redundancy remains on the listing page.

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
