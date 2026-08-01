# Task Analysis — Room4U v1

**Version:** v6
**Date:** 2026-07-31
**Source:** Derived from `v5/subsystems.md` (Supply, Verification, Demand, Transaction, Post-Booking) + v1 scope decisions (Google auth for all acting users, open browsing, phone required, PayChangu gateway for tenant collection — outflows manual, no in-app chat, no landlord portal).
**Purpose:** Phase 3 deliverable — every goal, task, data field, action, and flow. Feeds Wireframe (4), DB (5), API (6), Architecture (7).

---

## Actors

| Actor | Auth | Role |
|---|---|---|
| Student | Google (at claim/report) | Browse + claim a bed (Goal 1, 2) **and** report vacancies (Goal 3) — same user, no separate roles |
| Operator (you) | Google | Manage registry, money, follow-ups, landlord trust |

---

## Goal 1 — Tenant: Find a room

**Task:** Browse available rooms and decide which fits.

**Data needed:**
- Room list: photos, area/location, room type + bed count (Single / Shared (3)), per-bed monthly price, beds left, available-from date
- Distance from Mzuni: real km + walk-minutes (from GPS pin), shown on each card
- Status: only `stock` rooms shown (drop off when the last bed is paid)
- No landlord contact or exact address exposed

**Actions:**
- Open listing link (no login)
- Filter by area, price, room type, distance
- View room details (photos, price per bed, area, distance, beds left)

**Flow:**
1. Open link → 2. See available rooms → 3. Filter/search → 4. View room details → 5. Decide → tap "I want this room" (→ Goal 2)

*Source: Demand subsystem (inventory, fee transparency, bypass prevention).*

---

## Goal 2 — Tenant: Claim a bed

**Task:** Reserve a bed in the chosen room with verified identity and contact details.

**Data needed:**
- From Google: name, email
- Manual (required): phone number
- Context: which room, which bed (1 booking = 1 bed), timestamp

**Actions:**
- Google One-Tap sign-in
- Enter phone number
- Confirm claim

**Flow:**
1. Tap "I want this room" → 2. Google sign-in (One-Tap) → 3. Name/email pre-filled → 4. Enter phone (required) → 5. Submit → 6. Booking record created (1 bed), linked to user → 7. Payment link generated (PayChangu) → 8. Tenant pays K20,000 → 9. Webhook confirms → 10. That bed is paid (beds left −1); last bed paid → room `stock → rented`

*Source: Demand subsystem (first come first serve per bed, deposit+agent fee on claim).*

---

## Goal 3 — Spotter: Report a vacant room

**Task:** Submit a structured lead for a soon-to-be-vacant room.

**Data needed (9 core fields + optional caretaker):**
1. Hostel name
2. Location — one-tap GPS "Use my location" OR Google Maps link (optional, never blocks; distance shows once pin is set)
3. Room type (single/shared) + beds if shared (2–4)
4. Monthly price (per bed)
5. Landlord name
6. Landlord phone
7. Landlord WhatsApp
8. Available-from date
9. Photos

**Optional (10–11):** caretaker name + phone — the spotter usually knows them (they live there); otherwise the operator captures them at inspection. Never blocks a lead.

**Actions:**
- Google sign-in
- Fill required fields (caretaker optional)
- Upload photos
- Submit

**Flow:**
1. Open lead form → 2. Google sign-in → 3. Fill required fields → 4. Attach photos → 5. Submit → 6. Lead lands in operator queue (status `lead`) → 7. Spotter identity recorded for payout + false-report tracking

*Source: Supply subsystem (9-field DM lead, false-report policy, per-success cap).*

---

## Goal 4 — Operator: Move a room from lead to stock

**Task:** Verify, inspect, pay deposit, and make the room rentable — without the status ever going stale.

**Data needed:**
- Lead fields (from Goal 3)
- Verification: landlord-call notes, 7-condition checklist results, inspection tier (full/skipped)
- Deposit: paid flag + date (K10,000)
- Room record: landlord (with tier + flags), hostel (with caretaker), status, type, beds, per-bed price, photos, area
- Spotter payout: K3,000 record on successful ownership

**Actions:**
- View leads queue
- Open a lead
- Record call/inspection notes
- Mark checklist pass/fail
- Confirm beds + per-bed price (spotter may have guessed)
- Confirm/enter caretaker name + phone
- Mark deposit paid → status flips `lead → stock` → room auto-appears on listing
- Record spotter payout

**Flow:**
1. Lead arrives (Goal 3) → 2. Call landlord, confirm vacancy → 3. Full or skipped inspection → 4. Record checklist → 5. Pay deposit → 6. Mark paid → room becomes `stock`, visible to tenants → 7. Pay spotter K3,000 (recorded)

*Source: Verification subsystem (7 conditions, tiers, deposit-after-inspection, directory building).*

---

## Goal 5 — Operator: Track money

**Task:** Track every payment and know exactly where the books stand — with tenant payments confirmed instantly by the gateway.

**Data needed:**
- Payment record: type (deposit / agent fee / reporter fee / refund), amount, direction (in/out), method (mobile money/cash), date, linked booking
- Gateway record: PayChangu charge (charge_id, amount, status, webhook payload)
- Booking totals: each tenant pays K20,000 (K10k deposit + K10k agent fee) per bed; net per bed = K19,640 after K360 gateway (1.8%, absorbed — Option A); room-level costs K10k deposit + K3k reporter → net/room = beds×19,640 − 13,000 (single = K6,640)

**Actions:**
- Tenant payment auto-confirmed via PayChangu webhook (K20k per bed → bed paid, beds left −1; last bed → room `stock → rented`, drops off listing) — no manual verify tap
- Record refund (tenant cancel / 2-day guarantee / room fall-through → immediate out-of-pocket refund)
- Record reporter fee (K3,000 per successful ownership, paid manually)
- View books (running totals, per-bed and per-room net)

**Flow:**
1. Tenant pays via PayChangu link → 2. Webhook fires → 3. Bed marked paid (beds left −1) → 4. Last bed? room `stock → rented`, listing auto-updates → 5. Books update

**Gateway notes:** collection only (Airtel Money + Mpamba). Outflows (landlord deposit, spotter K3k, refunds) stay manual mobile money in v1 — no stacking gateway fees on money going out. Payouts API is a later upgrade.

*Source: Transaction subsystem (flow diagram, tracking, immediate refund policy, receipt records).*

---

## Goal 6 — Operator: Follow up post-booking

**Task:** Check in 3 days after move-in and catch problems inside the 2-day guarantee window.

**Data needed:**
- Booking: tenant, room, move-in date
- Follow-up status (due/done)
- Outcome notes (fine / issue)

**Actions:**
- See due follow-ups
- WhatsApp tenant (outside app)
- Log outcome
- If refund claim → record refund + trigger landlord escalation (Goal 7)

**Flow:**
1. Day-3 reminder fires → 2. WhatsApp tenant → 3. Log outcome → 4. Fine → done. Issue → refund path + landlord flag (Goal 7)

*Source: Post-Booking subsystem (one-time follow-up aligned with 2-day window).*

---

## Goal 7 — Operator: Manage landlord trust

**Task:** Keep the landlord directory accurate so trust compounds and money-stealers are cut off.

**Data needed:**
- Landlord: name, phone, WhatsApp, hostel(s)
- Tier: full-inspection / skipped-inspection
- Flags: warn / blacklist
- Notes: incident history

**Actions:**
- Set tier
- Add/update flag (warn → demote to full inspection; repeat or money-stealing → blacklist)
- Record notes

**Flow:**
1. Post-booking issue or verification red flag → 2. Assess trigger (time-wasting vs money-stealing) → 3. Update tier/flag → 4. Trust model adjusts next room from same landlord

*Source: Verification subsystem (directory building) + Post-Booking subsystem (escalation ladder, trigger table).*

---

## Cross-Reference Map

| Goal | Subsystem source | Feeds (pipeline) |
|---|---|---|
| 1 Find a room | Demand (inventory) | Listing screens (4), rooms DB (5), listing API (6) |
| 2 Claim a room | Demand | Claim screen, users/bookings DB (5), auth+claim API (6) |
| 3 Report vacancy | Supply | Lead form, leads DB (5), lead API (6) |
| 4 Lead → stock | Verification | Admin screens, rooms DB (5), status API (6) |
| 5 Track money | Transaction | Books screens, payments DB (5), payments + PayChangu webhook API (6) |
| 6 Follow-up | Post-Booking | Follow-up screens, bookings DB (5), reminder API (6) |
| 7 Landlord trust | Verification + Post-Booking | Directory screens, landlords DB (5), directory API (6) |

**Status lifecycle (single source of truth):** `lead → stock → rented`
- `lead` (operator-only) → `stock` (operator marks deposit paid; visible to tenants) → `rented` (last bed paid via PayChangu webhook; drops off listing). Single = shared room with 1 bed.

---

## Deliberately OUT of v1 (per scope)

- Gateway payouts (landlord deposits, spotter fees, refunds stay manual mobile money in v1)
- In-app chat (WhatsApp is the channel; outcomes are logged here)
- Landlord portal (landlords interact with us, not the app)
- Tenant saved-rooms / message history features
- Multi-agent roles (single operator)
