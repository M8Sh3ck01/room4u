process.env.NODE_ENV = 'test';
process.env.PAYCHANGU_ENABLED = 'true';
process.env.PAYCHANGU_API_URL = 'https://gateway.test';
process.env.PAYCHANGU_SECRET = 'sk-test';
process.env.PAYCHANGU_WEBHOOK_SECRET = 'wh-secret';

const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');
const { createSession } = require('./helpers/session');

const Area = require('../src/modules/rooms/area.model');
const Hostel = require('../src/modules/rooms/hostel.model');
const Landlord = require('../src/modules/rooms/landlord.model');
const Room = require('../src/modules/rooms/room.model');
const Booking = require('../src/modules/bookings/booking.model');
const Payment = require('../src/modules/bookings/payment.model');
const FollowUp = require('../src/modules/bookings/followup.model');

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

const mockVerify = (payload) =>
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: payload }) });

const mockVerifyFailure = () =>
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

describe('Priority 1 — reconcile / verify a stuck "awaiting payment" booking', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(async () => {
    delete process.env.PAYCHANGU_ENABLED;
    delete process.env.PAYCHANGU_API_URL;
    delete process.env.PAYCHANGU_SECRET;
    delete process.env.PAYCHANGU_WEBHOOK_SECRET;
    await disconnectDb();
  });

  let room;

  beforeEach(async () => {
    const [area] = await Area.create([{ name: 'Chibavi' }]);
    const [landlord] = await Landlord.create([{ name: 'Nora Banda', phone: '0995 111 222' }]);
    const [hostel] = await Hostel.create([
      { name: 'Chibavi Hostel', area_id: area._id, lat: -11.439266, lng: 34.0257 },
    ]);
    [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
  });
  it('rescues a paid-but-unconfirmed requested booking: marks paid, consumes bed, writes ledger + follow-up', async () => {
    const { token, user } = await createSession('rescue@example.com');
    const booking = await Booking.create({
      room_id: room._id,
      user_id: user._id,
      status: 'requested',
      tx_ref: 'room4u_rescue',
    });
    const spy = mockVerify({ status: 'success', currency: 'MWK', amount: 20000, tx_ref: 'room4u_rescue' });

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/verify`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.payment.reconciled).toBe(true);
    expect(res.body.data.booking.status).toBe('paid');
    expect(res.body.data.booking.payment_status).toBe('confirmed');

    const saved = await Booking.findById(booking.id);
    expect(saved.status).toBe('paid');
    expect(saved.payment_status).toBe('confirmed');

    const savedRoom = await Room.findById(room.id);
    expect(savedRoom.beds_left).toBe(1);
    expect(savedRoom.sold).toHaveLength(1);
    expect(await Payment.countDocuments({})).toBe(2);
    expect(await FollowUp.countDocuments({})).toBe(1);
    spy.mockRestore();
  });

  it('leaves an unpaid requested booking untouched (no confirmed charge)', async () => {
    const { token, user } = await createSession('unpaid@example.com');
    const booking = await Booking.create({
      room_id: room._id,
      user_id: user._id,
      status: 'requested',
      tx_ref: 'room4u_unpaid',
    });
    const spy = mockVerifyFailure();

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/verify`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.payment.reconciled).toBe(false);
    expect(res.body.data.payment.reason).toBe('not-confirmed');
    expect(res.body.data.booking.status).toBe('requested');
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await FollowUp.countDocuments({})).toBe(0);
    spy.mockRestore();
  });

  it('forbids verifying another user\'s booking', async () => {
    const { user } = await createSession('owner@example.com');
    const { token } = await createSession('intruder@example.com');
    const booking = await Booking.create({
      room_id: room._id,
      user_id: user._id,
      status: 'requested',
      tx_ref: 'room4u_priv',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/verify`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('reporting an already-paid booking as reconciled=false', async () => {
    const { token, user } = await createSession('alreadypaid@example.com');
    const booking = await Booking.create({
      room_id: room._id,
      user_id: user._id,
      status: 'paid',
      payment_status: 'confirmed',
      tx_ref: 'room4u_already',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/verify`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.payment.reconciled).toBe(false);
    expect(res.body.data.payment.reason).toBe('status=paid');
  });

  it('does NOT auto-cancel an expired requested booking when the gateway charge is confirmed', async () => {
    const { token, user } = await createSession('expiredpaid@example.com');
    await Booking.create({
      room_id: room._id,
      user_id: user._id,
      status: 'requested',
      tx_ref: 'room4u_expired',
      expires_at: new Date(Date.now() - 1000),
    });
    const spy = mockVerify({ status: 'success', currency: 'MWK', amount: 20000, tx_ref: 'room4u_expired' });

    const res = await request(app)
      .get(`/api/bookings/${(await Booking.findOne({ tx_ref: 'room4u_expired' })).id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // A confirmed charge must not be silently forfeited — stay requested for reconcile.
    expect(res.body.data.booking.status).toBe('requested');
    spy.mockRestore();
  });

  it('still auto-cancels an expired requested booking when NO charge is confirmed', async () => {
    const { token, user } = await createSession('expiredunpaid@example.com');
    await Booking.create({
      room_id: room._id,
      user_id: user._id,
      status: 'requested',
      tx_ref: 'room4u_stale',
      expires_at: new Date(Date.now() - 1000),
    });
    const spy = mockVerifyFailure();

    const res = await request(app)
      .get(`/api/bookings/${(await Booking.findOne({ tx_ref: 'room4u_stale' })).id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe('cancelled');
    spy.mockRestore();
  });
});

