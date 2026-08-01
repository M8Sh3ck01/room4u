# Database Design — Room4U v1

**Version:** v6
**Date:** 2026-07-31
**Source:** `v6/task-analysis.md` + `v6/wireframes.md` (Phase 5 deliverable)
**Storage type:** MongoDB Atlas **M0 (free tier)** — finalized in Phase 7 (`v6/architecture.md`). Schema expressed as documents/collections: `rooms`, `bookings`, `payments`, `leads` (lead rooms), `users`, `areas`, `hostels`, `landlords`, `followups`, `roomevents`, plus an `idempotencykeys` collection (TTL 24h) for claim idempotency.

**M0 implications (see architecture §5):** no multi-document transactions — all critical writes are single-document atomic ops; `beds_left` + `rented` are **stored on the Room doc and maintained atomically** (not derived at read time); `sold[].charge_id` unique index prevents double webhook application; nightly JSON export to R2 stands in for backups (M0 has none).

---

## ER Diagram (text)

```
Area 1─N Hostel 1─N Room 1─N Booking 1─1 FollowUp
                        │        │
              Landlord 1─N Room    │
              User 1─N Room (reported_by)
              User 1─N Booking (user_id)
                        Booking 1─N Payment
                        Room 1─N Payment (direct: deposit / reporter fee)
                        Room 1─N RoomEvent (audit)
```

**Hostel vs Room (plain language):**
- **Hostel = the building.** One name, one area, one GPS pin, one caretaker, many rooms. The tenant lives *at* a hostel.
- **Room = a unit inside the hostel.** One type (single/shared), a number of beds, one per-bed price, its own availability and photos. One hostel has many rooms (`Hostel 1─N Room`).

**Status lifecycle:** `Room.status` covers the whole chain — a submitted lead is a `Room` with status `lead`. A room is `rented` when its **last bed** is booked + paid. Single rooms just have `beds = 1`, so they behave exactly like a shared room with one bed — one unified model.

---

## Entities

### User  (any signed-in user can claim AND report — no tenant/spotter roles)
```
id:           uuid (PK)
google_sub:   string (unique)      ← Google OAuth subject
email:        string (unique)
name:         string               ← from Google
phone:        string (nullable)    ← required for tenants at claim; spotters add on first lead
is_operator:  boolean (default false)  ← only special flag: set from operator email whitelist at sign-in
created_at:   timestamp (default now)
updated_at:   timestamp (nullable)

Note: no tenant/spotter roles. Identity per activity — reported_by on each Room,
      user_id on each Booking. "Tenant" / "spotter" are momentary roles of ONE user,
      never separate accounts — the same student reports a room today and claims
      one tomorrow.
Indexes: google_sub (unique), email (unique)
```

### Area (reference directory)
```
id:      uuid (PK)
name:    string (unique)           ← Chibavi, Luwinga, Katoto, Area 1-3, …
```

### Hostel (reference directory)
```
id:              uuid (PK)
name:            string
area_id:         uuid (FK → Area.id, required)
caretaker_name:  string (nullable)   ← on-site caretaker; shows rooms, holds keys
caretaker_phone: string (nullable)
lat:             decimal (nullable)   ← GPS pin: one-tap capture (spotter lead or operator inspection); optional, never blocks
lng:             decimal (nullable)
created_at:      timestamp (default now)

Unique: (name)      Index: area_id
```

### Landlord (reference directory + trust record)
```
id:         uuid (PK)
name:       string (required)
phone:      string (required)
whatsapp:   string (nullable, default = phone)
tier:       enum (full | skipped) default 'full'   ← auto-suggested: known-success → skipped
flag:       enum (none | warn | blacklist) default 'none'
notes:      text (nullable)                          ← incident history
created_at: timestamp (default now)
updated_at: timestamp (nullable)

Indexes: name, phone
```

### Room  (lead → stock → rented)
```
id:              uuid (PK)
hostel_id:       uuid (FK → Hostel.id, required)
landlord_id:     uuid (FK → Landlord.id, required)
reported_by:     uuid (FK → User.id, nullable)      ← which user reported it
type:            enum (single | shared)
beds:            integer (default 1)              ← 1 for single; 2–4 for shared
price:           integer (MWK per bed per month, required)
available_from:  date (required)
maps_link:       string (nullable)                   ← Google Maps proof
photos:          array of image URLs (≥1)
status:          enum (lead | stock | rented) default 'lead'
inspection_tier: enum (full | skipped) (nullable)
call_notes:      text (nullable)
ck_vacant / ck_photos_real / ck_price_ok / ck_location_pin / ck_features / ck_deposit_is_rent / ck_refund_agreed:
                 boolean (each nullable)              ← 7-condition checklist
deposit_paid_at: timestamp (nullable)                ← set ⇒ status = stock
rented_at:       timestamp (nullable)                ← set ⇒ status = rented (last bed paid)
created_at:      timestamp (default now)
updated_at:      timestamp (nullable)

beds_left: stored int (initialized = beds at stock-flip; $inc atomically per paid/refunded bed — see architecture §5)
rented:    boolean (default false; set true when last bed paid)  ← keeps status = stock while beds remain
sold:      array of { user_id, charge_id, paid_at }              ← per-bed payment record; unique index on sold.charge_id
Indexes: status, hostel_id, price, available_from, "sold.charge_id" (unique)
```

### Booking  (1 booking = 1 bed claim → payment)
```
id:            uuid (PK)
room_id:       uuid (FK → Room.id)
user_id:       uuid (FK → User.id)                  ← which user booked this bed
status:        enum (requested | paid | cancelled | refunded) default 'requested'
charge_id:     string (nullable)                     ← PayChangu charge id
move_in_date:  date (nullable)                       ← set when this tenant's bed is paid
notes:         text (nullable)
requested_at:  timestamp (default now)
paid_at:       timestamp (nullable)
cancelled_at:  timestamp (nullable)

Notes: each Booking claims exactly 1 bed (beds are interchangeable — no bed number needed).
       A room is `rented` when paid bookings = Room.beds.
Indexes: room_id, user_id, status
```

### Payment
```
id:          uuid (PK)
booking_id:  uuid (FK → Booking.id, nullable)
room_id:     uuid (FK → Room.id, nullable)          ← for deposit/reporter fee before a tenant
type:        enum (tenant_payment | gateway_fee | deposit | reporter_fee | refund)
amount:      integer (MWK, positive)                 ← direction derived from type
method:      enum (gateway | mobile_money | cash) default 'gateway'
reference:   string (nullable)
charge_id:   string (nullable, PayChangu)
created_at:  timestamp (default now)

Indexes: booking_id, room_id, type, created_at
```

### FollowUp
```
id:          uuid (PK)
booking_id:  uuid (FK → Booking.id, unique)
due_date:    date (move_in_date + 3 days)
status:      enum (due | done | skipped) default 'due'
outcome:     enum (all_good | refund_claim | landlord_issue | none) nullable
notes:       text (nullable)
created_at:  timestamp (default now)
done_at:     timestamp (nullable)

Indexes: due_date, status
```

### RoomEvent (audit trail)
```
id:           uuid (PK)
room_id:      uuid (FK → Room.id)
from_status:  enum (nullable)
to_status:    enum (nullable)
actor_id:     uuid (FK → User.id, nullable)
note:         text (nullable)
created_at:   timestamp (default now)

Indexes: room_id, created_at
```

---

## Status flip rules (single source of truth)

| Event | Result |
|---|---|
| Spotter submits lead | Room created, status `lead` |
| Operator records checklist + taps "Pay deposit" | `deposit_paid_at` set, status `stock`, auto-Payments: deposit −10,000, reporter −3,000, RoomEvent logged |
| PayChangu webhook confirms K20,000 (1 bed) | That Booking → `paid`, `paid_at` + `move_in_date` set. Room `beds_left` decremented **atomically** (`$inc −1`) + `sold[]` gets `{ charge_id }` in the same single-doc op. If beds_left hits 0 → `rented: true`, status `rented`, listing drops it; otherwise stays `stock`, listing shows "N beds left" |
| Extra bookings on same room | Allowed while beds remain (each = 1 bed). For the last bed, first-to-pay wins; others → cancelled + notified |
| Refund | Payment type `refund`, Booking → `refunded`. If the bed is freed, room reverts to `stock` with that bed available again |
| Booking becomes paid | FollowUp auto-created: due_date = move_in_date + 3 days |

---

## Location & distance (Option A — real GPS, no external API)

**Goal:** every listing shows a real, honest distance to Mzuni — not a vague "walkable" box.

**Campus anchor:** one lat/lng pair stored in app config, set once by the operator (Mzuni main gate/campus center). Everything measures against it.

**GPS capture (lenient by design — never blocks, never required):**
- Spotter lead form has a one-tap **"Use my location"** button (browser geolocation). One tap, ~1 second, done — writes the pin and shows "You're at Luwinga — looks right?" for a gentle confirm. If GPS fails or is skipped, the lead still submits; distance just shows "to be confirmed" until the pin exists.
- Operator can re-capture/confirm the same pin at inspection — proves the visit and locks a trusted coordinate.
- Pin lives on **Hostel**; every room inherits it via `hostel_id`.

**Distance (derived at read — nothing stored, no redundancy):**
- `dist_km` = Haversine straight-line from hostel pin to campus anchor.
- `walk_min = round(dist_km × 15)` — from average walking speed 5 km/h (12 min/km) × ~1.25 detour factor for roads vs. straight line.
- Two tunable constants (`SPEED_MIN_PER_KM = 12`, `DETOUR_FACTOR = 1.25`) in one place; tune later if feedback says we over-promise.

**Display (listing card):** `2.1 km · ~32 min walk from Mzuni` + a free **"Open walking directions"** link that deep-links into Google Maps (real route, offloaded to Google for free).

**Filtering:** listing can sort/filter by distance. Rooms without a pin sort last / show "distance to come" — never hidden.

*Upgrade path: if we ever want true road distances, we swap the `× 15` estimate for a one-time routing call per hostel and cache `walk_time_min`. Nothing else changes.*

## Books / net per bed & per room (derived from Payments)

`net = Σ(tenant_payment) − Σ(gateway_fee) − Σ(deposit) − Σ(reporter_fee) − Σ(refund)`

- **Per bed (each tenant):** K20,000 in − K360 gateway = **K19,640 net contribution**.
- **Room-level one-time costs:** landlord deposit K10,000 + spotter K3,000.
- **Per room (n = beds):** `net = n × 19,640 − 13,000`
  - Single (n=1) = **K6,640** ✓ (matches the original figure)
  - Shared (n=2) = K26,280
  - Shared (n=3) = K45,920

---

## Mapping: entities → goals/screens

| Entity | Goal(s) | Screen(s) |
|---|---|---|
| User | 2, 3, all | claim (W1), lead form (W3), admin |
| Area / Hostel / Landlord | 3, 4, 7 | lead form, lead→stock, directory |
| Room | 1, 4, 5 | listing, lead→stock, books |
| Booking | 2, 5, 6 | claim, money, follow-up |
| Payment | 5 | money |
| FollowUp | 6 | follow-up |
| RoomEvent | 4 | (audit, admin) |
