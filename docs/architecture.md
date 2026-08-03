# App Architecture — Room4U v1

**Version:** v6
**Date:** 2026-08-01
**Source:** `v6/task-analysis.md` + `v6/wireframes.md` + `v6/database-design.md` + `v6/api-design.md` (Phase 7 deliverable)
**Supersedes:** the transport-agnostic assumptions in `api-design.md` §6 and the SQL storage type in `database-design.md`.

---

## 1. Locked stack

| Layer | Choice | Why (drivers) |
|---|---|---|
| Frontend | **React + Vite (SPA)** | Core funnel = WhatsApp link + PayChangu payment link (both web URLs). RN's install friction kills the funnel; admin is desktop work; PWA covers most RN benefits. |
| Backend | **Node + Express** | Your strongest skill (#1 driver). One Express app serves the SPA, the API, and the WhatsApp-preview crawler route. |
| Database | **MongoDB Atlas M0 (free tier)** | Your MERN lane. Free forever, 512 MB, ~100 ops/s — plenty at our scale. **No multi-document transactions** — handled by single-document atomicity (§5). |
| Images | **Cloudflare R2 (free tier)** | 10 GB-month, **$0 egress forever**, 1M writes / 10M reads per month, permanent. Cloudinary is the fallback if R2 demands a card. |
| Auth | **Google OAuth** | Free, no billing account/card. Client id type **Web app** + real domain (deploy phase). |
| Payments | **PayChangu webhook** | Confirmed in scope (Phase 5/6). Real testing phase — **no mock mode**. |
| Tests | Jest + supertest + a real MongoDB (test DB) | Tests hit the real Express app over a dedicated `room4u_test` database (`MONGODB_URI_TEST`, local mongod or a separate DB on Atlas M0) — no mocked repositories. No mongodb-memory-server (binary too large). |

**Solo-dev rule honored:** every tool above is already in your skill set (React, Express, Mongo) or free (R2, Google, PayChangu). Nothing new to learn, nothing to pay.

---

## 2. Repo layout (monorepo, two packages)

```
room4u/
├── client/                  # React + Vite SPA
│   ├── src/
│   │   ├── main.jsx         # entry → mounts app/router
│   │   ├── app/             # router.jsx (route table)
│   │   ├── features/        # one folder per feature (see Client feature rules)
│   │   │   ├── browse/      # BrowseScreen (/), RoomDetailScreen (/rooms/:id), RoomCard, browse.css
│   │   │   └── auth/        # Login, AuthGate, Profile, AuthContext, GoogleButton
│   │   ├── design/          # design system: tokens.css, primitives.css, primitives/* (Button, Card, Badge, …)
│   │   ├── components/      # shared cross-cutting UI (layout/AppShell)
│   │   ├── services/        # api.js (fetch wrapper), auth.js (Google One-Tap), rooms.js
│   │   ├── lib/             # formatMoney, date helpers
│   │   └── index.css        # global resets + typography
│   ├── scripts/check-design.js  # enforces token-only styles (no raw colors/lengths outside design/)
│   └── index.html, vite.config.js
├── server/
│   ├── src/
│   │   ├── app.js           # Express app (mounts routes, errorHandler last)
│   │   ├── server.js        # bootstrap: load env → dbConnect → listen
│   │   ├── config/          # env vars, operator whitelist, campus anchor, constants
│   │   ├── core/
│   │   │   ├── db.js        # dbConnect pattern (cached promise, 3-attempt retry)
│   │   │   ├── errors.js    # AppError + error envelope factory
│   │   │   ├── middleware/  # auth.js, requireOperator.js, validate.js, rateLimit.js, errorHandler.js, asyncCatch.js
│   │   │   └── utils/       # apiResponse.js (successResponse), idempotency key guard, TTL key, haversine, generateChargeRef
│   │   ├── modules/         # one folder per domain (§3)
│   │   │   ├── users/  ├── directories/  ├── rooms/
│   │   │   ├── bookings/  ├── payments/  └── followups/
│   │   └── shared/
│   │       ├── services/    # paychanguService.js, r2Service.js, distance.js, exportService.js
│   │       └── jobs/        # reconcileSweep.js, nightlyExport.js
│   ├── tests/               # integration tests per module
│   ├── package.json         # module-alias (@core/@modules/@shared) + jest config
│   └── .env.example
├── docs/                    # this v6 folder (copy of design docs)
└── README.md
```

**WhatsApp preview crawler route** lives in the same Express app (default include): `GET /room/:id` renders an HTML meta-tag page (`og:title`, `og:description`, `og:image`) for the room so WhatsApp link cards work. SPA routes on `/`; crawlers hit `/room/:id`.

### Client feature rules — feature-first layout

The client is organized by **user-facing capability**, not by file type. A `features/<x>/` folder is a feature when it passes the same "one job" test as a server module:

- **Owns one capability** (e.g. browse rooms, authenticate) — name it in one sentence.
- **Owns its screens, state, styles, and data calls.** A feature's components, Context, and `*.css` live inside the folder; its screens are the only public surface (imported by `app/router.jsx`).
- **Depends one-way.** Features import shared layers (`design/`, `services/`, `lib/`, `components/`) — **never another feature**. A feature→feature import is a boundary leak: fold the shared piece into the owning feature (e.g. the listing card lives in `browse/`; `home/` was folded into `browse/` as `BrowseScreen` for exactly this reason).
- **Ships one folder per capability.** When a screen inside a feature grows into its own capability, promote it (e.g. a future `booking/` feature, or splitting `profile/` out of `auth/`).

Shared layers are not features: `design/` (tokens + primitives), `services/` (API clients), `lib/` (utils), `components/` (layout shell).

---

## 3. Server module layout — function-based modular monolith

**No container classes, no repositories, no constructor injection.** Each module is plain functions + a router.

```
modules/rooms/
├── rooms.routes.js        # express.Router(), wires validate + auth middleware
├── rooms.service.js       # async functions: listRooms, getRoom, stockFromLead, ...
├── room.model.js          # Mongoose schema + model (state machine constants live here too)
└── (rooms.test.js colocated or under server/tests/)
```

**Not every module needs all files.** A reference-data module (`areas`) may be just `areas.routes.js` + `area.model.js`. State machines are constants + a `transition(doc, to)` guard — fold them into the model file, not a separate "layer" file.

### Module Layer Rules (R1–R5) — the mandatory separation

| # | Rule | Why it earns its keep |
|---|---|---|
| **R1** | **Models are the only data access.** Mongoose models are the sole thing that touches Mongo — no `Model.find/update` in routes. | No stray DB calls scattered through HTTP handlers. |
| **R2** | **State-changing operations live in service functions**, never inline in routes. | The hard logic — atomic `findOneAndUpdate`, state machines, idempotency — stays directly testable without HTTP. |
| **R3** | **Routes are thin:** parse → authorize → validate → call service → map error → respond. | Keeps HTTP concerns (`req/res`, status codes) out of business logic. |
| **R4** | **Modules talk via service functions only** — never `require` another module's model. | `payments` can't reach into `rooms`'s collection behind its back; coupling stays explicit and auditable. |
| **R5** | **State machines are the single source of truth** for `lead→stock→rented`, `requested→paid→cancelled|refunded`, `due→done|skipped`. | First-to-pay / last-bed business rules live in one pure, testable place. |

**Relaxations (allowed, not ceremony):** a route that is purely read CRUD (e.g. `GET /api/areas`, directories autocomplete) may skip the service function and call the model directly — R2 binds where there is real logic or a state change. Simple modules keep R1/R5 (don't touch another module's model, don't inline transitions) but don't need a service file at all.

**Controllers are folded into routes.** Express handlers *are* the controllers — the reference repo's `controller.js` class (read `req` → call service → respond) is dropped as ceremony. Its two reusable idioms survive in `core/`: **`asyncCatch`** (wraps handlers so thrown errors auto-forward to the error handler) and **`successResponse`** (standard success envelope, mirroring the error envelope).

- **Mongoose models are the only data layer.** MongoDB is already the data-access layer — a repository wrapper would be "abstracting an abstraction" (§ research). Service functions run the queries directly.
- **One composition root:** `app.js` mounts each `modules/*/*.routes.js` on its path. Dependency order between modules is resolved by `require` in `server.js` (like `routes/api/index.js` in the reference repo).
- **Path aliases** via `module-alias`: `@core/...`, `@modules/...`, `@shared/...`.
- Why not class+DI (the "gorilla in the Node ecosystem" lesson): `class` is ES6 (2015) sugar over 1995 prototypes and exists mainly to support constructor injection. We dropped DI → we drop classes. `this` binds at call-site, which is why class-based code keeps needing arrow-function class properties as a workaround; plain functions sidestep the whole thing. Reach for a DI container only if the app ever passes ~20–30 services.

**Server modules — 6 real modules.** A module must pass the **module test** (community consensus: "name it in one sentence", "own a specific business capability", "control its data evolution exclusively"): it **owns at least one entity** (the only thing that writes that collection) and **owns the rules** over it (state machine, invariants, atomic ops). If a folder owns no data, it is not a module — it's a route grouping.

| Module | Owns | Notes |
|---|---|---|
| `users` | User model, auth (Google token → session JWT), `me`, phone gate | `requireOperator` middleware checks `is_operator` (whitelist applied at sign-in) |
| `directories` | Area, Hostel, Landlord models | autocomplete routes, find-or-create on lead submission |
| `rooms` | Room model + Room state machine | **includes lead intake** (`createLead`) — a lead IS a Room with status `lead` (one aggregate); spotter flow, listing, verify, deposit-to-stock |
| `bookings` | Booking model + state machine | claims (with idempotency), status, cancel, refund |
| `payments` | Payment model | tenant/gateway/deposit/reporter/refund records |
| `followups` | FollowUp model + state machine | auto-create on paid, operator log |
| `shared/services` | PayChangu, R2, distance, export | cross-cutting, not domain |
| `shared/jobs` | reconcile sweep, nightly export | cron (node-cron) |

**No `admin` and no `leads` module** (both fail the module test — they own no entity):
- A **lead is a Room** in the `lead` state → lead intake lives in `rooms` (`roomsService.createLead`), which also does the find-or-create on Hostel/Landlord via `directoriesService`. One aggregate, one writer.
- **`/api/admin/*` is a route grouping, not a folder.** Operator endpoints live in the module that owns the data (`rooms` owns verify/deposit, `bookings` owns refund/cancel, `payments` owns manual records), all guarded by `requireOperator`. Dashboard stats = a read-aggregation helper in `shared/services/statsService.js` that composes the six modules' service functions. Admin panels are a presentation/console concern, not a domain ("management is not a purpose" — name by capability, never a vague umbrella).

---

## 4. Route map (from `api-design.md` §2, mounted per module)

| Mount path | Router |
|---|---|
| `/api/health`, `/api/areas` | `core` (health) + `modules/directories` (areas) |
| `/api/rooms` (public listing + detail), `/api/leads` | `modules/rooms` |
| `/api/auth`, `/api/me` | `modules/users` |
| `/api/rooms/:id/claims`, `/api/bookings` | `modules/bookings` |
| `/api/uploads` | small `modules/uploads` router (thin wrapper over `shared/services/r2Service`) |
| `/api/webhooks/paychangu` | `shared/services/paychangu` (HMAC, no JWT) |
| `/api/admin/*` | **route grouping, not a module** — each operator endpoint lives in its owning module (`rooms` verify/deposit, `bookings` refund, `payments` manual records), all behind `requireOperator`; stats via `shared/services/statsService` |
| `/api/directories/*` | `modules/directories` (autocomplete public or operator-guarded as designed) |
| `/room/:id` | WhatsApp-preview crawler page (public) |

Client routing (React): `/#/` home listing, `/#/room/:id`, `/#/auth`, `/#/me`, `/#/my-bookings`, `/#/my-leads`, `/#/admin/*` (stats, leads, rooms, bookings, followups, directories). Client and server share the route names from `wireframes.md`.

---

## 5. MongoDB M0 — atomicity & concurrency (replaces "single DB transaction")

Atlas M0 **does not support multi-document transactions**. Every critical write is a **single-document atomic operation** instead. MongoDB guarantees single-document ops are atomic — no races.

### 5.1 Webhook: last-bed winner (the critical section)

One atomic `findOneAndUpdate` on the **Room** document — a conditional filter that makes the second webhook a no-op:

```
Room.findOneAndUpdate(
  {
    _id: roomId,
    rented: false,                       // room not yet full
    "sold.charge_id": { $ne: chargeId }  // this payment not already applied
  },
  {
    $inc: { beds_left: -1 },
    $push: { sold: { user_id, charge_id, paid_at } },
    $set: { rented: beds_left - 1 <= 0 ? true : <unchanged> }
  },
  { new: true }
)
```

- If the room's last bed just got paid → `rented: true`, room drops off listing. Otherwise stays `stock`, listing shows "N beds left".
- **Winner:** the matched document (first webhook to win the race). **Loser:** `null` result → treated as already-processed, return `200 { ok: true }` (idempotent, never an error to PayChangu).
- The `charge_id` uniqueness lives **inside the Room** (`sold[].charge_id` guarded by `$ne` + a unique index on `"sold.charge_id"` — as a `partialIndexExpression`-free pattern we enforce via the conditional filter AND a unique index on the Room). Two webhooks for the same charge can't double-decrement.

### 5.2 Deposit to stock: guarded status flip

One atomic `findOneAndUpdate` flipping `lead → stock`:

```
Room.updateOne(
  { _id, status: "lead" },          // conditional: only flip if still a lead
  { $set: { status: "stock", deposit_paid_at: now } }
)
```

- `matchedCount === 0` → `409 ALREADY_STOCK` (no duplicate deposit / reporter-fee payment records). This replaces the "double-tap guard" from api-design §3.

### 5.3 Claims: DB-backed idempotency (not an in-memory map)

`POST /api/rooms/:id/claims` with header `Idempotency-Key: <uuid>`:

```
IdempotencyKey.findOneAndUpdate(
  { key, room_id, user_id },            // uniqueness enforced by unique index
  { $setOnInsert: { booking_id: <new booking>, payment_link, created_at: now } },
  { upsert: true, returnDocument: "after" }
)
```

- First attempt creates the booking + PayChangu link and records the key. Any re-send with the **same key** returns the stored booking + same payment link (catch `11000` duplicate-key if two arrive simultaneously → re-read).
- Keys get an **`expireAfterSeconds` TTL index (24 h)** so they don't accumulate on M0's 512 MB.
- No second booking, no second link, no double charge — same guarantee as api-design §3.

### 5.4 Room `beds_left` — stored, maintained atomically

- `beds_left` lives **on the Room doc** (initialized = `beds` at stock-flip), not derived at read time. Every change (webhook `$inc`, refund `$inc`) is atomic on the single doc. No cross-document counting → no transaction needed.
- `rented` is a field (`false` until last bed), so `status` stays `stock` while beds remain — matching the "stays stock, shows N beds left" rule.

### 5.5 Reconciliation sweep (cron, `shared/jobs/reconcileSweep.js`)

- Runs hourly: find `paid` bookings whose `charge_id` is missing from the room's `sold[]` (crash between webhook-write and room-update) → re-apply the `$inc`/`$push` with the same conditional `findOneAndUpdate` (idempotent).
- Find `requested` bookings older than 24 h on rooms that are now `rented` → auto-cancel + notify.

### 5.6 Nightly export (cron, `shared/jobs/nightlyExport.js`)

- M0 has **no backups** (10 GB in / 10 GB out per rolling 7 days). Nightly at 00:05 export `bookings` + `payments` (+ a Rooms snapshot) as JSON to a private R2 bucket — the "backup". One small export; negligible transfer.

### 5.7 What does NOT need a transaction (explicitly)

- Payment rows are **append-only events** (`type` enum) — creating a Payment is a single insert.
- FollowUp creation is derived (compute `due_date`, insert) — at worst a missed follow-up, caught by the sweep.
- Room state transitions are all guarded conditional updates (single-doc).

---

## 6. Image pipeline — R2 with presigned PUT (no bytes through Mongo)

```
Phone/browser ──POST /api/uploads (JWT)──▶ Express
      ──201 { uploadUrl, objectKey }──▶ phone
phone ──PUT uploadUrl (presigned, S3-compatible)──▶ Cloudflare R2  (direct, no Express, no Mongo)
Express stores `https://<bucket>.r2.dev/<objectKey>` on the Room doc (or returns to client)
```

- `POST /api/uploads` validates auth + returns a **presigned PUT URL** (short-lived). The device uploads the file **directly to R2** — image bytes never cross Express or MongoDB, so M0's transfer caps and server RAM are untouched.
- Server-side caps (enforced at request + at presign time): images only (`jpeg/png/webp`), ≤ 5 MB, ≤ 5 photos per room → `413 FILE_TOO_LARGE` / `415 UNSUPPORTED_TYPE`.
- Mongo stores **only the URL string**.
- Fallback if R2 activation demands a card: swap `r2Service.js` internals for Cloudinary signed-upload; endpoint contract unchanged.

---

## 7. Conventions

- **State machines** (per domain, mirroring the reference repo): each entity with a lifecycle gets an `ALLOWED_TRANSITIONS` map + a `transition(doc, to)` guard that throws `CONFLICT` on an illegal move. Room: `lead → stock → rented`; Booking: `requested → paid → cancelled | refunded`; FollowUp: `due → done | skipped`. Payment is append-only (no transitions).
- **Error envelope** (`core/errors.js` + `core/middleware/errorHandler.js`): every error renders `{ "error": { code, message, fields? } }` with the codes from api-design §4. The handler maps Mongoose validation/duplicate-key → `400 VALIDATION_ERROR` / `409 CONFLICT`, `CastError` → `404`, JWT errors → `401 UNAUTHORIZED`, our `AppError`s passthrough, anything else → `500 INTERNAL`.
- **Validation:** Joi schemas per route body/query/params (`validate.js` middleware). Photo caps match §6.
- **Auth middleware:** `auth.js` (Bearer JWT → `req.user`, 401 on bad/expired), `requireOperator` (403 unless `is_operator`). Phone gate → `403 NEEDS_PHONE`.
- **Rate limiting:** `rateLimit.js` on public + auth + webhook routes (webhook gets a generous limit keyed by IP; the reference repo's per-socket limiter is **not** ported).
- **dbConnect pattern** (`core/db.js`): cached promise, 3-attempt retry, single connection reused by all modules.
- **Jest + supertest + real MongoDB (test DB):** integration tests hit the real Express app over a dedicated `room4u_test` database (`MONGODB_URI_TEST` — local mongod, or a separate database on the same Atlas M0 cluster). Each test suite cleans collections via `tests/helpers/db.js`. No mocked repositories, no mocked DB — and no `mongodb-memory-server` (its binary is too large). Seed helpers per module.
- **No extras ported from the reference repo:** no sockets, no email, no QR/recharts, no SQL-sanitize middleware, no 100 MB body, no disk uploads, no PayChangu mock mode, no password/email-verification flows (Google OAuth only), no roles engine (`is_operator` boolean only).
- **Styling:** plain CSS / CSS modules first — no Tailwind, no CSS-in-JS until it hurts (solo-dev rule).
- **State management:** none. React Context for auth/session only; server state comes from `services/api.js` fetch wrapper. Add a lib only if prop-drilling actually hurts (the template's rule).

---

## 8. Explicitly deferred (deploy phase)

- Real domain + HTTPS for Google OAuth client + PayChangu webhook URL + WhatsApp crawler route.
- R2 bucket creation + CORS for presigned uploads; Cloudinary fallback only if R2 card-walls.
- Free-host tradeoff: a long-running Node host (cheap VPS / free tier that stays awake) vs. serverless cold-start on webhook arrival — decided in Phase 9.
- PayChangu secret + operator email whitelist in env.

---

## Next phase → Build

Everything is designed. Phase 8 builds one vertical slice at a time (auth → listing → claim → leads → status → payments → follow-up → admin → security), per the pipeline.
