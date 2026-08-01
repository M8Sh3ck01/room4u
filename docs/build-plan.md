# Build Plan — Room4U v1 (Phase 8)

**Version:** v6
**Date:** 2026-08-01
**Source:** `08-build.md` (pipeline template) + `v6/architecture.md` + `v6/api-design.md` + `v6/database-design.md` (Phase 8 deliverable — the working plan)

**Rule (from the pipeline):** build one vertical slice end-to-end (DB → API → UI → connect → test) and have it *running locally* before moving on. One slice at a time. First slice ships in 1–3 days; if a slice drags, slice it thinner.

---

## Slice order & why

| # | Slice | Why this order |
|---|---|---|
| 0 | **Skeleton** (repo, server boot, error envelope, client shell) | Foundation — every slice rides on it |
| 1 | **Auth + profile** (Google One-Tap → JWT → phone gate) | Everything needs a user; highest external risk (OAuth) → earliest |
| 2 | **Browse listings** (public rooms + filters + distance) | The app's reason to exist; low risk, quick visible win |
| 3 | **Claim + PayChangu** (idempotent claim → pay link → webhook → atomic bed consume) | The **riskiest business logic** (last-bed race, money) → while energy is highest |
| 4 | **Lead intake → verify → stock** (spotter lead + R2 photos, operator verify + deposit) | Supply side — feeds Slice 2; uploads land here where photos are needed |
| 5 | **Operator console** (stats, rooms/bookings lists, refund, manual payments, directories) | Manage the money flow from Slice 3 |
| 6 | **Follow-ups + "my stuff"** (tenant bookings/leads/payouts; followup due list) | Secondary features, after the core works |
| 7 | **Security & ops jobs** (rate limits, reconcile sweep, nightly export, polish) | Last, after all features work |

---

## Conventions carried into every slice

- **R1–R5** from `architecture.md` §3 (models-only data access, logic in services, thin routes, service-function-only module comms, state machines as source of truth).
- Controllers folded into routes; every handler wrapped in `asyncCatch`; responses via `successResponse`; errors via the envelope + `errorHandler` (codes from api-design §4).
- Every critical write is a **single-document atomic op** (M0 — no transactions). Room doc = the aggregate: `beds_left`, `sold[].charge_id`, `rented` change together.
- Idempotency: claims via `idempotencykeys` collection (`$setOnInsert` + catch `11000`, 24h TTL); webhook by `charge_id`; deposit by conditional `{status:"lead"}` flip → `409 ALREADY_STOCK`.
- Tests: Jest + supertest against the real Express app + a dedicated `room4u_test` database (`MONGODB_URI_TEST` — local mongod or a separate DB on Atlas M0). Each slice's test checklist = **happy path / error path / edge cases / data integrity / only this slice** (per `08-build.md`). No `mongodb-memory-server` (binary too large).
- Fixed amounts (constants in config): deposit **10,000**, reporter fee **3,000**, tenant fee **20,000**, gateway **360**.

---

## Slice details

### Slice 0 — Skeleton
- Repo: `room4u/` with `client/` (Vite + React, router, `services/api.js`, `lib/formatMoney`) and `server/` (`package.json` with `module-alias`, jest, supertest).
- Server: `app.js` (composition root, mounts routes, errorHandler last), `server.js` (env → dbConnect → listen), `core/db.js`, `core/errors.js`, `core/middleware/{asyncCatch,errorHandler}`, `core/utils/apiResponse.js`, `/api/health`.
- Client: empty feature shells + routing + fetch wrapper.
- DoD: `npm run dev` boots both; `/api/health` → `{ok:true}`; client renders home shell.

### Slice 1 — Auth + profile
- Backend (`users`): `User` model (`google_sub` unique), `POST /api/auth/google` (verify id_token via google-auth-library; check `aud` + `iss`; find-or-create; operator email whitelist → `is_operator`), `GET /api/me`, `PATCH /api/me` (phone), `auth` middleware, `requireOperator`.
- Frontend: Google One-Tap button, session Context, profile screen with phone gate (`403 NEEDS_PHONE` → collect phone first), sign-out.
- Tests: mocked token → user created; repeat sign-in returns same user; whitelist flips `is_operator`; expired JWT → 401; phone gate blocks claim until set.
- DoD: sign in with a real Google account locally, set phone, see profile persist across reload.

### Slice 2 — Browse listings
- Backend (`directories` + `rooms`): `Area`/`Hostel`/`Landlord`/`Room` models; listing `GET /api/rooms` (filters `area, max_price, type, max_walk_min, available_from`, only `status=stock` & `beds_left>=1`, sorted, distance via `shared/services/distance.js`); `GET /api/rooms/:id` (no `landlord_contact`); `GET /api/areas`.
- Frontend: home screen (search bar + filters + room cards), room detail screen (photos, beds left, distance, "Open walking directions" deep link).
- Tests: seeded stock rooms listed w/ correct distance; filters narrow correctly; `landlord_contact` null on detail; non-stock hidden.
- DoD: open client, see seeded rooms with honest `2.1 km · ~32 min` distances, filter by area/price.

### Slice 3 — Claim + PayChangu (the money core)
- Backend (`bookings`, `payments`, `shared`): `Booking` model + state machine; `idempotencykeys` (TTL); `POST /api/rooms/:id/claims` (Idempotency-Key header, `NO_BEDS`/`ROOM_NOT_FOUND`); `GET /api/bookings/:id`, `/mine`; `POST /api/bookings/:id/cancel` (only `requested`); `paychanguService.initiate` (test-mode credentials, no mock); webhook route (HMAC verify) → **atomic `roomsService.consumeBed`** → booking `paid` + `paid_at` + `move_in_date` → payments (`tenant_payment` +20,000, `gateway_fee` −360) → FollowUp auto-create → cancel others when room rents; WhatsApp crawler `GET /room/:id` (OG meta).
- Frontend: claim confirm → PayChangu link (opens mobile-money) → status poll page; "My bookings"; cancel button.
- Tests: happy claim returns link; **idempotency** (same key → same booking/link); **last-bed race** (two claims/webhooks, one bed → one wins, loser no-ops); cancel pre-payment frees nothing (not paid yet); followup created; webhook signature check.
- DoD: claim a seeded room in browser, pay via PayChangu **sandbox**, webhook flips booking `paid`, `beds_left` decrements, listing shows it, room rents on last bed.

### Slice 4 — Lead intake → verify → stock
- Backend (`rooms` incl. lead intake, `directories`): `POST /api/leads` (find-or-create Hostel name+area / Landlord phone, `reported_by`, status `lead`); `POST /api/uploads` (R2 presigned PUT wrapper, caps 5MB/jpeg-png-webp/≤5); `GET /api/admin/leads`, `/api/admin/leads/:id`, `POST /api/admin/leads/:id/verify` (checklist + tier + caretaker/beds/price); `POST /api/admin/rooms/:id/deposit` (conditional flip + payments deposit −10,000 & reporter −3,000 + RoomEvent); directories autocomplete `GET /api/directories/*`.
- Frontend: spotter lead form (GPS one-tap, photo upload → R2 direct PUT); operator leads queue + verify checklist screen + "Pay deposit" button.
- Tests: lead creates `status=lead` Room; hostel/landlord dedupe; photos upload via presigned URL; verify writes checklist; deposit flips to `stock`, records both payments, logs RoomEvent; **double-tap → `409 ALREADY_STOCK`**; listing (Slice 2) now shows the room.
- DoD: submit a lead with GPS + photos → operator verifies → taps deposit → room appears on the public listing.

### Slice 5 — Operator console
- Backend (`rooms`, `bookings`, `payments`, `directories`, `shared/services/statsService`): `GET /api/admin/rooms?status=`, `GET /api/admin/bookings`, `POST /api/admin/bookings/:id/refund` (booking `refunded`, payment `refund` −10,000, **atomic bed freed**, rented → stock), `GET/POST /api/admin/payments` (manual records incl. refunds/cash), `GET /api/admin/landlords` + `PATCH /api/admin/landlords/:id` (chips → tier/flag/notes), `GET/POST /api/admin/hostels`, `POST /api/admin/landlords`, stats aggregation.
- Frontend: admin screens (dashboard stats, rooms stock/rented, bookings, money books, directories with chips).
- Tests: stats counts correct; **refund frees the bed** (rented room back to stock, bed available); manual payment recorded; directory chip updates persist.
- DoD: operator sees dashboard counts, refunds a booking → that bed reappears on the listing.

### Slice 6 — Follow-ups + tenant "my stuff"
- Backend (`followups`, `rooms`): `GET /api/admin/followups` (due/done), `PATCH /api/admin/followups/:id` (outcome done/skipped); `GET /api/leads/mine` (my leads + payout status).
- Frontend: follow-ups screen (due list + outcome logging); "My leads" screen with payout amounts (K3,000 each, paid-out flag).
- Tests: followup auto-created on paid (from Slice 3) with `due = move_in_date + 3d`; outcome logged; my-leads payout sums by status.
- DoD: after a payment, a follow-up appears on the operator's due list; tenant sees their lead + K3,000 payout status.

### Slice 7 — Security & ops jobs
- Backend (`core`, `shared/jobs`): rate limiting (claims/auth/webhook — generous for webhook); reconcile sweep job (re-apply missing `sold[]` entries for `paid` bookings; auto-cancel stale `requested` on rented rooms); nightly export job (bookings+payments+rooms → private R2 bucket JSON); security headers; `.env.example` complete; validation audit.
- Frontend: loading / empty / error / offline states; final polish pass.
- Tests: rate limit trips after N; sweep re-applies a simulated crash gap idempotently; export writes a file; full suite green.
- DoD: `npm test` all green; `npm run build` both sides; app fully usable end-to-end locally.

---

## Test checklist template (per slice, from `08-build.md`)

- **Happy path** — the ideal flow works.
- **Error path** — wrong input, expired session, network failure, bad signature.
- **Edge cases** — empty states, boundary values, rapid double-taps (idempotency).
- **Data integrity** — DB saved/returned exactly what was expected (esp. money + bed counts).
- **Only this slice** — don't test unrelated features yet.

## Next step → Deploy (Phase 9)

After all slices, deploy: real domain + HTTPS, Google OAuth web client, R2 bucket + CORS, PayChangu secret, free-host sleep-vs-serverless webhook decision.
