process.env.NODE_ENV = 'test';
process.env.PAYCHANGU_ENABLED = 'true';
process.env.PAYCHANGU_API_URL = 'https://gateway.test';
process.env.PAYCHANGU_SECRET = 'sk-test';
process.env.PAYCHANGU_WEBHOOK_SECRET = 'wh-secret';

const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');

const Area = require('../src/modules/rooms/area.model');
const Hostel = require('../src/modules/rooms/hostel.model');
const Landlord = require('../src/modules/rooms/landlord.model');
const Room = require('../src/modules/rooms/room.model');
const Booking = require('../src/modules/bookings/booking.model');

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

const mockVerify = (data) =>
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data }) });

describe('GET /api/paychangu/return (Inline Checkout callback, gateway enabled)', () => {
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

  it('verifies the tx_ref and redirects to the reserve page with status=success', async () => {
    await Booking.create({
      room_id: room._id,
      user_id: new mongoose.Types.ObjectId(),
      status: 'requested',
      tx_ref: 'room4u_abc',
    });
    const spy = mockVerify({ status: 'success', currency: 'MWK', amount: 20000, tx_ref: 'room4u_abc' });

    const res = await request(app).get('/api/paychangu/return?tx_ref=room4u_abc');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/rooms/${room.id}/reserve?status=success`);

    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe('https://gateway.test/verify-payment/room4u_abc');
    expect(opts.headers.Authorization).toBe('Bearer sk-test');
    spy.mockRestore();
  });

  it('redirects without status when the payment is not yet successful', async () => {
    await Booking.create({
      room_id: room._id,
      user_id: new mongoose.Types.ObjectId(),
      status: 'requested',
      tx_ref: 'room4u_pending',
    });
    const spy = mockVerify({ status: 'failed', currency: 'MWK', amount: 0, tx_ref: 'room4u_pending' });

    const res = await request(app).get('/api/paychangu/return?tx_ref=room4u_pending');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/rooms/${room.id}/reserve`);
    spy.mockRestore();
  });

  it('redirects with status=error when verification itself fails', async () => {
    await Booking.create({
      room_id: room._id,
      user_id: new mongoose.Types.ObjectId(),
      status: 'requested',
      tx_ref: 'room4u_err',
    });
    const spy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const res = await request(app).get('/api/paychangu/return?tx_ref=room4u_err');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/rooms/${room.id}/reserve?status=error`);
    spy.mockRestore();
  });

  it('redirects home when tx_ref is missing or unknown', async () => {
    const missing = await request(app).get('/api/paychangu/return');
    expect(missing.status).toBe(302);
    expect(missing.headers.location).toBe('/');

    const unknown = await request(app).get('/api/paychangu/return?tx_ref=ghost');
    expect(unknown.status).toBe(302);
    expect(unknown.headers.location).toBe('/');
  });
});
