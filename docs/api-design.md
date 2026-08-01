# API / Backend Design — Room4U v1

**Version:** v6
**Date:** 2026-08-01
**Source:** `v6/task-analysis.md` + `v6/wireframes.md` + `v6/database-design.md` (Phase 6 deliverable)
**Scope:** Single REST-ish API behind one web server (frontend + API served together — no separate hosting).

---

## 1. Auth strategy & roles

**Google OAuth for every acting user** — no passwords stored.

- Client runs Google One-Tap → gets a Google `id_token` → sends it to `POST /api/auth/google`.
- Server verifies the token with Google **and checks `aud` (must be our Google client id) + `iss` (must be Google)** — a valid token issued to some other app is rejected. Then finds-or-creates a `User` by `google_sub` and issues a **session JWT**.
- Client sends `Authorization: Bearer <jwt>` on all authed calls.
- **JWT TTL ≈ 1 hour, no refresh tokens.** Re-auth = re-run Google One-Tap silently when a call returns `401 UNAUTHORIZED`.

**No tenant/spotter roles.** Any signed-in user can claim beds *and* report vacancies — identity lives on the activity (`reported_by` on each Room, `user_id` on each Booking). Tenant/spotter are momentary roles of one user, never separate accounts. The only special flag is `is_operator`.

| Flag | Who | Assigned how |
|---|---|---|
| `is_operator = false` | Everyone | Default |
| `is_operator = true` | You | Email whitelist in config (checked at sign-in) |

**Phone gate:** `phone` must be set before the first claim or first lead (`PATCH /api/me`). The API returns `403 NEEDS_PHONE` otherwise — the UI collects it first.

---

## 2. Endpoint map

### Public (no auth)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Deploy/uptime check → `{ "ok": true }` |
| GET | `/api/rooms` | List `stock` rooms (filters, distance, beds left) |
| GET | `/api/rooms/:id` | Room detail (no landlord contact / no address) |
| GET | `/api/areas` | Area list for filter + selects |

### Auth (any signed-in user)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/google` | Exchange Google token → session JWT |
| GET | `/api/me` | Current user |
| PATCH | `/api/me` | Set/update phone |
| POST | `/api/rooms/:id/claims` | Claim a bed → booking + PayChangu link |
| GET | `/api/bookings/:id` | Booking status (owner or operator) |
| GET | `/api/bookings/mine` | My bookings |
| POST | `/api/bookings/:id/cancel` | Cancel a `requested` booking (pre-payment) |
| POST | `/api/leads` | Submit a lead (any signed-in user) |
| GET | `/api/leads/mine` | My leads + payout status |
| POST | `/api/uploads` | Upload photo → URL |

### PayChangu webhook (no JWT — HMAC verified)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/paychangu` | Confirm K20k → bed paid, room flip |

### Operator only (`is_operator = true`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard counts (leads/stock/rented) |
| GET | `/api/admin/leads` | Leads queue |
| GET | `/api/admin/leads/:id` | Lead detail |
| POST | `/api/admin/leads/:id/verify` | Save checklist + tier + caretaker/beds/price (action) |
| POST | `/api/admin/rooms/:id/deposit` | "Pay deposit → stock" (deposit + reporter fee auto) |
| GET | `/api/admin/rooms?status=` | Stock/rented lists |
| GET | `/api/admin/bookings` | All bookings |
| POST | `/api/admin/bookings/:id/refund` | Record refund (frees the bed) |
| GET | `/api/admin/payments` | Books |
| POST | `/api/admin/payments` | Manual record (+ Record: refunds/cash) |
| GET | `/api/admin/followups` | Due/done follow-ups |
| PATCH | `/api/admin/followups/:id` | Log outcome (done/skipped) |
| GET | `/api/admin/landlords` | Landlord directory |
| PATCH | `/api/admin/landlords/:id` | Trigger chips → tier/flag/notes |
| GET | `/api/admin/hostels` | Hostel directory |
| POST | `/api/admin/hostels` | Create hostel |
| POST | `/api/admin/landlords` | Create landlord |
| GET | `/api/directories/hostels?q=` | Autocomplete + autofill (area, caretaker) |
| GET | `/api/directories/landlords?q=` | Autocomplete + autofill (phones, WhatsApp, tier, flags) |

---

## 3. Core request/response shapes

### POST /api/auth/google
```json
// Request
{ "id_token": "eyJ..." }
// Response 200
{
  "token": "jwt...",
  "user": { "id": "uuid", "email": "chisomo@gmail.com", "name": "Chisomo Banda",
            "phone": null, "is_operator": false }
}
```

### GET /api/rooms
```json
// Query: ?area=uuid&max_price=20000&type=shared&max_walk_min=30&available_from=2026-09-01
// Response 200
{ "rooms": [
  { "id": "uuid", "photos": ["url"], "hostel": "Chibavi Hostel", "area": "Chibavi",
    "type": "shared", "beds": 3, "beds_left": 2, "price": 20000,
    "available_from": "2026-09-01", "dist_km": 2.1, "walk_min": 32 }
] }
```
- Returns only `status = stock` rooms with `beds_left >= 1`.

### GET /api/rooms/:id
```json
// Response 200
{ "id": "uuid", "photos": ["url"], "hostel": "Chibavi Hostel", "area": "Chibavi",
  "type": "shared", "beds": 3, "beds_left": 2, "price": 20000,
  "available_from": "2026-09-01", "dist_km": 2.1, "walk_min": 32,
  "directions_url": "https://maps.google.com/?dirflg=w&saddr=...&daddr=...",
  "landlord_contact": null }          // ← null until the tenant's booking is paid
```

### POST /api/rooms/:id/claims
```json
// Request: (auth) header `Idempotency-Key: <uuid>` — one per claim attempt.
//          Re-sending the same key returns the SAME booking + payment_link
//          (no duplicate booking, no second link, no double charge).
// Response 201
{ "booking": { "id": "uuid", "room_id": "uuid", "status": "requested" },
  "pay_amount": 20000,
  "payment_link": "https://paychangu.com/pay/..." }   // one-tap mobile-money link
// Errors
// 403 NEEDS_PHONE — set phone first
// 409 NO_BEDS — no beds left on this room
// 404 ROOM_NOT_FOUND — not stock
```

### POST /api/leads  (spotter)
```json
// Request
{ "hostel_name": "Chibavi Hostel", "area_id": "uuid",
  "location": { "lat": -11.4533, "lng": 34.0214, "source": "gps" },   // or maps_link
  "maps_link": null,
  "type": "shared", "beds": 3, "price": 20000,
  "landlord": { "name": "Mr Mwale", "phone": "0991555000", "whatsapp": "0991555000" },
  "caretaker": { "name": "Lasta", "phone": "0991444555" },            // optional
  "available_from": "2026-09-01",
  "photos": ["url"] }
// Response 201
{ "lead": { "id": "uuid", "status": "lead" } }
```
- Server finds-or-creates Hostel (name+area) and Landlord (phone); new landlord defaults `tier=full`, `flag=none`.
- Open to any signed-in user (no spotter role) — `reported_by = user.id` records who to pay and for quality tracking.

### POST /api/admin/leads/:id/verify
```json
// Request
{ "inspection_tier": "full", "call_notes": "Vacant confirmed ✅",
  "checklist": { "vacant": true, "photos_real": true, "price_ok": true,
                 "location_pin": true, "features": true,
                 "deposit_is_rent": true, "refund_agreed": true },
  "beds": 3, "price": 20000, "caretaker": { "name": "Lasta", "phone": "0991444555" } }
// Response 200
{ "id": "uuid", "verified": true }
```

### POST /api/admin/rooms/:id/deposit
```json
// Response 200
{ "room": { "id": "uuid", "status": "stock", "deposit_paid_at": "..." },
  "events": [
    { "type": "deposit",     "amount": -10000 },   // payment record
    { "type": "reporter_fee","amount": -3000 } ] }  // payment record + room event log
```
- One tap → deposit payment, reporter fee, `lead → stock` flip, RoomEvent logged, room appears on listing.
- Double-tap guard: if room is already `stock`, respond `409 ALREADY_STOCK` (no duplicate deposit/reporter records).

### POST /api/uploads  (R2 presigned — no bytes through the server)
```json
// Request: (auth) nothing in the body
// Response 201
{ "uploadUrl": "https://presigned-put.r2.dev/...", "objectKey": "rooms/<roomId>/photo-1.jpg",
  "url": "https://<bucket>.r2.dev/rooms/<roomId>/photo-1.jpg" }   // final public URL
// The device PUTs the image bytes DIRECTLY to uploadUrl (S3-compatible, short-lived).
// Mongo stores only `url`. Caps (enforced at presign time): images only (jpeg/png/webp),
// ≤ 5 MB each, ≤ 5 photos per room. 413 FILE_TOO_LARGE / 415 UNSUPPORTED_TYPE otherwise.
```

### POST /api/webhooks/paychangu
```json
// PayChangu sends this to a fixed URL; header carries the HMAC signature
// Request (verified): { "charge_id": "...", "amount": 20000, "status": "SUCCESS", ... }
// Response: always 200 { "ok": true }   (even for duplicates — idempotent)
```
**Flow (single-document atomicity — MongoDB M0 has NO multi-doc transactions; see `v6/architecture.md` §5):**
1. Verify HMAC signature from the header; reject with 401 if bad.
2. Idempotency: one atomic `findOneAndUpdate` on the Room doc with conditional filter `{ rented: false, "sold.charge_id": { $ne: chargeId } }` — decrements `beds_left`, pushes `{ charge_id }` into `sold[]`, and sets `rented: true` when beds_left hits 0. If the filter matches nothing (charge already applied / room already full) → return 200, no-op. **Winner of the last-bed race wins the room; losers no-op.**
3. Mark booking `paid`, stamp `paid_at` + `move_in_date`.
4. Create payments: `tenant_payment` +20,000 (gateway) and `gateway_fee` −360.
5. Cancel + notify other `requested` bookings on a room that just hit `rented`.
6. Create FollowUp: `due_date = move_in_date + 3 days`.
- A reconciliation sweep (cron) re-applies any `sold[]` entry whose booking is `paid` but room not updated (crash between 3 and 2) — same conditional op, idempotent.

---

## 4. Error format (all endpoints)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Price is required", "fields": ["price"] } }
```
Common codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NEEDS_PHONE` (403), `NOT_FOUND` (404), `NO_BEDS` (409), `ALREADY_STOCK` (409),
`CONFLICT` (409), `FILE_TOO_LARGE` (413), `UNSUPPORTED_TYPE` (415), `INTERNAL` (500).

---

## 5. Concurrency & data rules (single source of truth)

- **Beds are the inventory unit.** `beds_left` is **stored on the Room doc and maintained atomically** (`$inc` per paid/refunded bed in a single-document op). The last-bed race is resolved in the DB by the conditional `findOneAndUpdate` (architecture §5), not in app logic.
- **Paid is final.** `booking.status = paid` is the ownership record (see ownership-assurance section in subsystems). Nothing flips it back except an explicit operator refund.
- **Refund frees a bed.** `POST /api/admin/bookings/:id/refund` → booking `refunded`, payment `refund` −10,000 (deposit part), bed freed (atomic `$inc` back on Room; room reverts to `stock` if it was `rented`).
- **No stale listing.** Listing query only ever reads `status = stock`.
- **Idempotent writes.** `POST /api/rooms/:id/claims` requires an `Idempotency-Key` header — the key is stored in a `idempotencykeys` collection (unique index + 24h TTL); re-sending the same key returns the same booking + payment link via `$setOnInsert` (catch `11000` on simultaneous duplicates) instead of minting a second. The webhook is idempotent by `charge_id` (unique on `Room.sold[].charge_id`); the deposit action is guarded by the conditional `{ status: "lead" }` flip (`matchedCount = 0` → `409 ALREADY_STOCK`).

## 6. Notes for later phases

- Webhook needs a stable public URL (deploy phase) and a registered secret with PayChangu.
- Photo upload is **Cloudflare R2 with presigned PUT** (decided in Phase 7, architecture §6): device uploads directly to R2, Mongo stores the URL only. Cloudinary fallback if R2 card-walls at activation.
- `GET /api/directories/*` power the searchable-selects from the wireframe's Manual Input Reduction Map.
- MongoDB M0 has no multi-doc transactions and no backups — all critical writes are single-document atomic ops, and a nightly JSON export to R2 stands in for backups (architecture §5).
