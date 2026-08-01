# Wireframes — Room4U v1

**Version:** v6
**Date:** 2026-07-31
**Source:** `v6/task-analysis.md` (Phase 4 deliverable)
**Format:** Mobile-first low-fi sketches, one wave at a time

---

## Wave 1 — Tenant screens

### Screen 1: Find a room (public listing, no login)

```
┌────────────────────────────────┐
│  ROOM4U                  [filters] │
│                                  │
│  [Filter bar — ALL filters]     │
│  Area        : [Any ▾]          │
│  Price (max) : [Any ▾]          │
│  Room type   : [Any ▾]          │  Single / Shared
│  Available   : [Any ▾]          │  Now / date
│  Walk from Mzuni: [Any ▾]       │  Under 20 min / 40 / Any
│                                  │
│  ┌──────────────────────────┐  │
│  │ [ photo ] Chibavi Hostel   │  │
│  │   Single · K35,000/mo      │  │
│  │   Available 1 Sept         │  │
│  │   🚶 2.1 km · ~32 min      │  │
│  │       [ directions ]       │  │  → Google Maps walking route
│  │   [ I want this room ]     │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ [ photo ] Area 3, Luwinga  │  │
│  │   Shared (3) · 2 beds left │  │
│  │   K20,000/bed · Avail now  │  │
│  │   distance to come         │  │  ← pin not set yet
│  │   [ I want this room ]     │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

Notes:
- Only `stock` rooms appear; a room drops off when its last bed is paid (`rented`); shared rooms show "N beds left"
- No landlord contact or exact address — area only
- Empty state: "No rooms right now — DM us on WhatsApp" + button

### Screen 2: Claim — request + fee clarity

```
┌────────────────────────────────┐
│  Claim this room               │
│  [ photo ] Chibavi Hostel      │
│  Bed in Shared (3) · K20,000/bed │
│  You're claiming 1 of 3 beds   │
│                                │
│  💳 Fees (paid once — no hidden): │
│   Deposit      K10,000 (part of rent)│
│   Agent fee    K10,000         │
│   Total        K20,000         │
│                                │
│  Step 1: [Sign in with Google] │
│  ─────────────────────────────  │
│  Name:   Chisomo Banda  (Google)│
│  Email:  chisomo@gmail.com(Google)│
│  Phone:  [ 0991 234 567 ]  ※   │
│  ※ We'll WhatsApp this number  │
│                                │
│  [ Request this room ]         │
└────────────────────────────────┘
```

### Screen 3: Confirmation — payment via gateway, instant

```
┌────────────────────────────────┐
│  Pay to reserve your room      │
│  Chibavi Hostel · K20,000      │
│                                │
│  [ Pay K20,000 ]               │  → PayChangu link
│                                │
│  After payment, you'll be      │
│  confirmed instantly.          │
│                                │
│  (Airtel Money · Mpamba)       │
└────────────────────────────────┘
```

### Flow (Goal 1 + Goal 2)

1. Open listing (no login) → 2. Filter/browse → 3. Tap "I want this room" → 4. Google sign-in (One-Tap) → 5. Phone (required, WhatsApp hint) → 6. Request → 7. PayChangu payment link → 8. Tenant pays K20,000 (Airtel Money/Mpamba) → 9. Webhook confirms → 10. That **bed** is paid (beds left −1); last bed paid → room `stock → rented`, leaves listing

**Reserved = paid fee.** The bed becomes theirs the moment the gateway confirms the K20,000 — no manual verification tap. Gateway fee (K360/bed, 1.8%) is absorbed by Room4U (Option A); each tenant always pays a clean K20,000.

---

## Wave 2 — Operator screens (admin, Google-auth protected)

**Screen A: Dashboard (bottom tabs: Dashboard · Leads · Money)**

```
┌────────────────────────────────┐
│  Room4U Admin          [You ▾] │
│  ────────────────────────────── │
│  Leads: 3 · Stock: 2 · Rented: 5│   ← auto-counted
│  ────────────────────────────── │
│  LEADS (3)                      │
│  • Chibavi · Single · K35k     │ [view]
│  • Area 3 · Shared · K20k      │ [view]
│  • Katoto · Single · K30k      │ [view]
│  ────────────────────────────── │
│  STOCK (2)                      │
│  • Mchengautuwa · Shared · K25k │ [view]
│  ────────────────────────────── │
│  RENTED (5)                     │
│  • Area 2 · Single · K28k      │ [view]
│  ────────────────────────────── │
│  [ Dashboard ]  [ Leads ]  [ Money ]  ← bottom tabs
└────────────────────────────────┘
```

**Screen B: Lead detail → verify → deposit → stock**

```
┌────────────────────────────────┐
│  ← Lead: Chibavi Hostel        │
│  Spotter: Memory (K3k on success)│
│  ────────────────────────────── │
│  Hostel:  [Chibavi Hostel ⌕]   │  ← searchable select
│  Area:    [Chibavi ▾]          │  ← auto from hostel
│  Caretaker: Lasta 0991 444 555 │  ← auto-filled from hostel
│  Type:    [Shared ▾]           │
│  Beds:    [3 ▾]                │  ← 1 = single, 2–4 = shared
│  Price:   [ 20,000 ] /bed      │  ← numeric, validated
│  Maps:    [view link]          │
│  Available: [01 Sep 📅]        │  ← date picker
│  Photos:  [4] [add]            │
│  ────────────────────────────── │
│  LANDLORD: [Mr Mwale ⌕]        │  ← searchable select
│    Phones: 0991 555 000  ✓ auto-filled
│    Tier:   [Full inspection ▾] │  ← auto-suggested
│  ────────────────────────────── │
│  VERIFICATION                  │
│  Call: [Vacant confirmed ✅]    │  ← chips + optional notes
│  Checklist (7):                 │
│   [x] vacant  [x] photos real   │
│   [x] price ok [x] location pin │
│   [x] features [x] deposit=rent │
│   [x] refund agreed             │
│  ────────────────────────────── │
│  [ Pay deposit → make stock ]   │  ← sticky CTA
│   K10,000 out · auto K3k payout │
│   to spotter · flips to stock   │
└────────────────────────────────┘
```

**Screen C: Money / Books**

```
┌────────────────────────────────┐
│  ← Money                       │
│  In: K45,000 · Out: K23,000   │
│  Net: K22,000                  │   ← auto-calculated
│  [ + Record ]                  │   ← only manual/cash/refunds
│  ────────────────────────────── │
│  DATE   TYPE       AMOUNT  SRC │
│  31/07  Tenant pay  +20,000 ✓ │   ← auto (webhook)
│  31/07  Gateway fee -360    ✓ │   ← auto (webhook)
│  31/07  Deposit    -10,000  ✓ │   ← auto (deposit CTA)
│  31/07  Reporter   -3,000   ✓ │   ← auto (deposit CTA)
│  31/07  Refund     -10,000    │   ← manual
│  ...                           │
│  [ Dashboard ]  [ Leads ]  [ Money ]
└────────────────────────────────┘
```

Notes:
- Tenant payments arrive via PayChangu webhook — no form, no tap
- "+ Record" only for things the gateway/actions can't auto-create: refunds, cash payments, unusual amounts
- Direction auto-derived from type; room auto-locked when action starts from a booking

---

## Wave 3 — Spotter / Follow-up / Landlord trust

**Screen D: Spotter — report vacancy (Google-auth protected)**

```
┌────────────────────────────────┐
│  ← Report a vacant room        │
│  Signed in as Memory J.         │  ← any signed-in student can report
│  [ Copy from previous report ] │   ← one tap
│  ────────────────────────────── │
│  Hostel name: [Chibavi ⌕ +]    │  ← autocomplete + new
│  Location: [📍 Use my location ]│  ← one tap, optional
│            "You're at Luwinga  │    (or paste maps link)
│             — looks right? ✓"  │
│  Room type:   [Single ▾]       │
│  Monthly price: [ 35,000 ]     │
│  Landlord name: [ Mr Mwale ]   │
│  Landlord phone: [ 0991 555 000 ]
│  WhatsApp: ☑ same as phone     │   ← default checked
│  Caretaker (optional):         │
│    name: [ Lasta ] phone: [ _ ]│
│  Available from: [ 01 Sep 📅 ] │
│  Photos: [ + add up to 5 ]     │
│  ────────────────────────────── │
│  [ Submit lead ]               │  ← sticky CTA
└────────────────────────────────┘
```

**Screen E: Follow-up (day-3)**

```
┌────────────────────────────────┐
│  ← Follow-ups                  │
│  Due today: 2                  │   ← auto-generated
│  ────────────────────────────── │
│  • Chisomo Banda — Chibavi     │
│    Move-in: 28 Jul (day 3)     │
│    [ WhatsApp tenant ]         │  → opens chat, then log
│    Outcome: [All good]         │
│            [Issue → refund]    │  ← chips
│            [Issue → landlord]  │
│  ────────────────────────────── │
│  • Thoko Phiri — Area 3        │
│    Move-in: 29 Jul (day 2)     │
│    Outcome: [chips]            │
└────────────────────────────────┘
```

**Screen F: Landlord trust (directory)**

```
┌────────────────────────────────┐
│  ← Landlord directory          │
│  [Search: [Mr Mwale ⌕]]        │
│  ────────────────────────────── │
│  Mr Mwale · Chibavi            │
│  Tier: Full inspection         │
│  Flags: —                      │
│  Rooms: 2 · Successful: 1      │
│  [Trigger: ▸]                  │   ← opens trigger chips
│  ────────────────────────────── │
│  Trigger chips → auto action:  │
│   [Room ≠ photos]  → Demote    │
│   [Double-booked]  → Blacklist │
│   [Refused refund] → Blacklist │
│   [Lied in verify] → Warn      │
│   (consequence auto-applied,   │
│    confirm to save)            │
└────────────────────────────────┘
```

---

## Appendix: Manual Input Reduction Map

**Principle:** store once, select later. The system auto-stores directories (areas, hostels, landlords, rooms, users, spotters); every entry point reuses them instead of retyping. Defaults come from the model (K10k/K3k/K20k, mobile-money method, full-inspection tier).

**Component patterns:**
- Searchable select (typeahead) with "+ New" fallback → directories
- Dropdowns → bounded sets (room type, tier, method, payment type)
- Chips (tap-to-select) → bounded outcomes/causes
- Date picker → dates
- Quick-action buttons → trigger multi-record events (no form)
- Autofill → Google auth (name/email), stored phone, model defaults
- Checkbox default → "WhatsApp same as phone"

### Goal 2 — Tenant: Claim a room
| Field | Reduction |
|---|---|
| Name, email | Auto from Google |
| Phone | Auto for returning tenants (stored from last booking) |
| Room | Auto (from tapped card) |

### Goal 3 — Spotter: Report vacancy
| Field | Reduction |
|---|---|
| Hostel name | Autocomplete + "+ new" |
| Location | One-tap "Use my location" (GPS) OR paste maps link — optional, never blocks |
| Room type | Dropdown (Single/Shared) |
| Beds (if shared) | Number stepper (2–4); defaults to 1 for single |
| Caretaker | Optional; stored on hostel → auto-filled whenever the hostel is selected after |
| Available date | Date picker |
| Landlord WhatsApp | Default = landlord phone (checkbox "same as phone") |
| Landlord info | "Copy from previous report" (spotters report multiple rooms in one hostel) |
| Spotter phone | Stored in profile after first lead → auto next time |
| Photos | Upload (not typing) |
| Price | Numeric with typical-range validation |

### Goal 4 — Operator: Lead → stock
| Field / action | Reduction |
|---|---|
| Landlord | Searchable select → auto-fills phones, WhatsApp, tier, flags |
| Hostel | Searchable select → auto-fills area |
| Area | Dropdown (auto from hostel) |
| Tier | Auto-suggested (full for new, skipped for directory-proven) — confirm only |
| Checklist | 7 taps (checkboxes) |
| Call notes | Status chips ("Vacant confirmed ✅") + optional free notes |
| Pay deposit button | One tap → deposit record (K10k out) + `stock` flip + spotter payout (K3k out) + net calc. Amounts default, override only if unusual |

### Goal 5 — Track money
| Field / action | Reduction |
|---|---|
| Direction | Eliminated (derived from type) |
| Tenant paid K20k | Quick action → deposit + agent-fee records, `rented` flip, drops off listing |
| Amount | Auto-filled by type; override only for deviations |
| Method | Dropdown, defaults to mobile money |
| Room | Auto-locked when action starts from a booking |
| Books / net | Fully auto-calculated |

### Goal 6 — Follow-up
| Field | Reduction |
|---|---|
| Reminder | Auto-generated (day-3), no creation input |
| Outcome | Chips: [All good] / [Issue → refund] / [Issue → landlord flag] |

### Goal 7 — Landlord trust
| Field | Reduction |
|---|---|
| Trigger | Chips for the 4 documented triggers → auto-applies consequence (demote/blacklist/warn) — confirm only |
| Notes | Optional free text |

### Cross-cutting
- Timestamps, status flips, totals, net-per-room → automatic
- Google auth autofills name/email for every actor
- Searchable selects wherever a directory exists
- Chips instead of free text wherever the set is bounded

### Deliberately manual (can't reduce safely)
- New tenant's phone (first time)
- Truly new landlord name/phone (new supply)
- Google Maps link / location proof (verification value)
- Exact price (numeric, validated)
- Optional notes & payment references

---
