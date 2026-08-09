process.env.NODE_ENV = 'test';
process.env.PAYCHANGU_WEBHOOK_SECRET = 'wh-secret';

const crypto = require('crypto');
const request = require('supertest');

const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');

const Area = require('../src/modules/rooms/area.model');
const Hostel = require('../src/modules/rooms/hostel.model');
const Landlord = require('../src/modules/rooms/landlord.model');
const Room = require('../src/modules/rooms/room.model');
const RoomEvent = require('../src/modules/rooms/roomevent.model');
const Booking = require('../src/modules/bookings/booking.model');
const Payment = require('../src/modules/bookings/payment.model');
const FollowUp = require('../src/modules/bookings/followup.model');
const User = require('../src/modules/users/user.model');

const SECRET = process.env.PAYCHANGU_WEBHOOK_SECRET;
const sign = (body) => crypto.createHmac('sha256', SECRET).update(body).digest('hex');

const fireWebhook = (body, { signature, header = 'Signature' } = {}) =>
  request(app)
    .post('/api/webhooks/paychangu')
    .set('Content-Type', 'application/json')
    .set(header, signature !== undefined ? signature : sign(body))
    .send(body);

const stockRoom = (overrides = {}) => ({
  type: 'shared',
  beds: 2,
  beds_left: 2,
  price: 20000,
  available_from: new Date('2026-09-01'),
  photos: ['https://example.com/a.jpg'],
  status: 'stock',
  deposit_paid_at: new Date(),
  ...overrides,
});

const makeUser = (suffix) =>
  User.create({ google_sub: `wh-${suffix}`, email: `wh-${suffix}@example.com`, name: suffix });

const makeRequestedBooking = (room, user, txRef) =>
  Booking.create({ room_id: room._id, user_id: user._id, status: 'requested', tx_ref: txRef });

const paymentBody = (reference, extra = {}) =>
  JSON.stringify({
    event_type: 'api.charge.payment',
    status: 'success',
    reference,
    amount: 20000,
    ...extra,
  });

describe('POST /api/webhooks/paychangu (Slice 3 W4)', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(disconnectDb);

  let hostel;
  let landlord;

  beforeEach(async () => {
    const [area] = await Area.create([{ name: 'Chibavi' }]);
    [landlord] = await Landlord.create([{ name: 'Nora Banda', phone: '0995 111 222' }]);
    [hostel] = await Hostel.create([
      { name: 'Chibavi Hostel', area_id: area._id, lat: -11.439266, lng: 34.0257 },
    ]);
  });

  it('marks the booking paid, consumes a bed, records the ledger, and creates a follow-up', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('happy');
    await makeRequestedBooking(room, user, 'wh-charge-1');

    const res = await fireWebhook(paymentBody('wh-charge-1', { move_in_date: '2026-09-01' }));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.skipped).toBeUndefined();

    const booking = await Booking.findOne({ tx_ref: 'wh-charge-1' });
    expect(booking.status).toBe('paid');
    expect(booking.paid_at).toBeTruthy();
    expect(booking.move_in_date.toISOString().slice(0, 10)).toBe('2026-09-01');

    const saved = await Room.findById(room.id);
    expect(saved.beds_left).toBe(1);
    expect(saved.rented).toBe(false);
    expect(saved.sold).toHaveLength(1);
    expect(saved.sold[0].charge_id).toBe('wh-charge-1');

    const payments = await Payment.find({}).sort({ type: 1 });
    expect(payments).toHaveLength(2);
    const tenant = payments.find((p) => p.type === 'tenant_payment');
    const fee = payments.find((p) => p.type === 'gateway_fee');
    expect(tenant.amount).toBe(20000);
    expect(tenant.reference).toBe('wh-charge-1');
    expect(fee.amount).toBe(-360);

    const followup = await FollowUp.findOne({ booking_id: booking._id });
    expect(followup).toBeTruthy();
    expect(followup.due_date.toISOString().slice(0, 10)).toBe('2026-09-04');
  });

  it('accepts the legacy x-paychangu-signature header as a fallback', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('legacy');
    await makeRequestedBooking(room, user, 'wh-charge-legacy');

    const res = await fireWebhook(paymentBody('wh-charge-legacy'), { header: 'x-paychangu-signature' });
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBeUndefined();
    expect(await Booking.countDocuments({ status: 'paid' })).toBe(1);
  });

  it('accepts a checkout.payment event (Inline Checkout webhooks)', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('inline');
    await makeRequestedBooking(room, user, 'wh-charge-inline');

    const res = await fireWebhook(
      JSON.stringify({
        event_type: 'checkout.payment',
        status: 'success',
        reference: 'wh-charge-inline',
        charge_id: 'paychangu_12345',
        amount: 20000,
      })
    );

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBeUndefined();

    const booking = await Booking.findOne({ tx_ref: 'wh-charge-inline' });
    expect(booking.status).toBe('paid');
    expect(booking.charge_id).toBe('paychangu_12345');

    const saved = await Room.findById(room.id);
    expect(saved.sold[0].charge_id).toBe('paychangu_12345');

    const payments = await Payment.find({});
    expect(payments).toHaveLength(2);
    expect(payments.every((p) => p.reference === 'wh-charge-inline')).toBe(true);
  });

  it('matches by tx_ref when the payload carries an internal reference too', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('txreflookup');
    await makeRequestedBooking(room, user, 'wh-charge-txref');

    const res = await fireWebhook(
      JSON.stringify({
        event_type: 'checkout.payment',
        status: 'success',
        tx_ref: 'wh-charge-txref',
        reference: '26262633201',
        charge_id: 'paychangu_67890',
        amount: 20000,
      })
    );

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBeUndefined();

    const booking = await Booking.findOne({ tx_ref: 'wh-charge-txref' });
    expect(booking.status).toBe('paid');
    expect(booking.charge_id).toBe('paychangu_67890');

    const saved = await Room.findById(room.id);
    expect(saved.sold[0].charge_id).toBe('paychangu_67890');

    const payments = await Payment.find({});
    expect(payments).toHaveLength(2);
    expect(payments.every((p) => p.reference === 'wh-charge-txref')).toBe(true);
  });

  it('falls back to the room available_from when move_in_date is invalid', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('nudate');
    await makeRequestedBooking(room, user, 'wh-charge-nudate');

    const res = await fireWebhook(paymentBody('wh-charge-nudate', { move_in_date: 'not-a-date' }));
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBeUndefined();

    const booking = await Booking.findOne({ tx_ref: 'wh-charge-nudate' });
    expect(booking.status).toBe('paid');
    expect(booking.move_in_date.toISOString().slice(0, 10)).toBe('2026-09-01');
  });

  it('is idempotent for a duplicate webhook', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('dup');
    await makeRequestedBooking(room, user, 'wh-charge-2');
    const body = paymentBody('wh-charge-2');

    const first = await fireWebhook(body);
    expect(first.status).toBe(200);
    expect(first.body.skipped).toBeUndefined();

    const second = await fireWebhook(body);
    expect(second.status).toBe(200);
    expect(second.body.skipped).toBe(true);

    expect(await Payment.countDocuments({})).toBe(2);
    expect(await FollowUp.countDocuments({})).toBe(1);
    const saved = await Room.findById(room.id);
    expect(saved.beds_left).toBe(1);
    expect(saved.sold).toHaveLength(1);
    expect(await Booking.countDocuments({ status: 'paid' })).toBe(1);
  });

  it('rejects a bad signature with 401 and no side effects', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('bad');
    await makeRequestedBooking(room, user, 'wh-charge-3');

    const res = await fireWebhook(paymentBody('wh-charge-3'), { signature: 'deadbeef' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');

    const booking = await Booking.findOne({ tx_ref: 'wh-charge-3' });
    expect(booking.status).toBe('requested');
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await FollowUp.countDocuments({})).toBe(0);
    expect(await Room.findById(room.id)).toMatchObject({ beds_left: 2, rented: false });
  });

  it('last-bed race: one charge wins the room, the losing booking is cancelled', async () => {
    const [room] = await Room.create([
      stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id, beds: 1, beds_left: 1 }),
    ]);
    const ua = await makeUser('race-a');
    const ub = await makeUser('race-b');
    await makeRequestedBooking(room, ua, 'wh-charge-a');
    await makeRequestedBooking(room, ub, 'wh-charge-b');

    const [ra, rb] = await Promise.all([fireWebhook(paymentBody('wh-charge-a')), fireWebhook(paymentBody('wh-charge-b'))]);
    expect([ra.status, rb.status]).toEqual([200, 200]);
    expect([ra.body.skipped, rb.body.skipped]).toContain(true);

    expect(await Booking.countDocuments({ status: 'paid' })).toBe(1);
    expect(await Booking.countDocuments({ status: 'cancelled' })).toBe(1);
    expect(await Payment.countDocuments({})).toBe(2);
    expect(await FollowUp.countDocuments({})).toBe(1);
    expect(await RoomEvent.countDocuments({ room_id: room._id })).toBe(1);
    expect(await Room.findById(room.id)).toMatchObject({ beds_left: 0, rented: true, status: 'rented' });
  });

  it('rents the room on the last bed and cancels unpaid requests, keeping payers paid', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const a = await makeUser('payer-a');
    const b = await makeUser('payer-b');
    const c = await makeUser('never-pays');
    await makeRequestedBooking(room, a, 'wh-charge-a');
    await makeRequestedBooking(room, b, 'wh-charge-b');
    await makeRequestedBooking(room, c, 'wh-charge-c');

    const first = await fireWebhook(paymentBody('wh-charge-a'));
    expect(first.body.room_rented).toBe(false);
    expect(await Booking.countDocuments({ status: 'requested' })).toBe(2);

    const second = await fireWebhook(paymentBody('wh-charge-b'));
    expect(second.body.room_rented).toBe(true);

    expect(await Booking.countDocuments({ status: 'paid' })).toBe(2);
    expect(await Booking.countDocuments({ status: 'requested' })).toBe(0);
    const cBooking = await Booking.findOne({ tx_ref: 'wh-charge-c' });
    expect(cBooking.status).toBe('cancelled');
    expect(await Payment.countDocuments({})).toBe(4);
    expect(await FollowUp.countDocuments({})).toBe(2);
    expect(await Room.findById(room.id)).toMatchObject({ beds_left: 0, rented: true });
  });

  it('drops a rented room from the public listing', async () => {
    const [room] = await Room.create([
      stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id, beds: 1, beds_left: 1 }),
    ]);
    const user = await makeUser('listed');
    await makeRequestedBooking(room, user, 'wh-charge-list');

    await fireWebhook(paymentBody('wh-charge-list'));

    const listing = await request(app).get('/api/rooms');
    expect(listing.status).toBe(200);
    const ids = listing.body.data.rooms.map((r) => r.id);
    expect(ids).not.toContain(room.id);

    const detail = await request(app).get(`/api/rooms/${room.id}`);
    expect(detail.status).toBe(404);
    expect(detail.body.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('skips a webhook whose booking is no longer requested (defensive)', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await makeUser('ghost');
    await Booking.create({
      room_id: room._id,
      user_id: user._id,
      status: 'cancelled',
      tx_ref: 'wh-charge-cancelled',
      cancelled_at: new Date(),
    });

    const res = await fireWebhook(paymentBody('wh-charge-cancelled'));
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
    expect(res.body.reason).toBe('booking-not-requested');
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await FollowUp.countDocuments({})).toBe(0);
  });

  it('acks and skips a non-success status without side effects', async () => {
    const res = await fireWebhook(
      JSON.stringify({ event_type: 'api.charge.payment', status: 'failed', reference: 'wh-charge-fail', amount: 20000 })
    );
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
    expect(res.body.reason).toBe('status=failed');
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await Booking.countDocuments({})).toBe(0);
  });

  it('acks and skips an unrelated event_type without side effects', async () => {
    const res = await fireWebhook(
      JSON.stringify({ event_type: 'api.payout', status: 'success', reference: 'wh-any', amount: 20000 })
    );
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
    expect(res.body.reason).toBe('event_type=api.payout');
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await Booking.countDocuments({})).toBe(0);
  });

  it('returns 404 for an unknown charge and 400 for a missing charge reference', async () => {
    const missing = await fireWebhook(paymentBody('wh-ghost'));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('BOOKING_NOT_FOUND');

    const noCharge = await fireWebhook(
      JSON.stringify({ event_type: 'api.charge.payment', status: 'success', amount: 20000 })
    );
    expect(noCharge.status).toBe(400);
    expect(noCharge.body.error.code).toBe('VALIDATION_ERROR');

    const notJson = await fireWebhook('not-json{{', { signature: sign('not-json{{') });
    expect(notJson.status).toBe(400);
    expect(notJson.body.error.code).toBe('VALIDATION_ERROR');
  });
});
