process.env.NODE_ENV = 'test';
process.env.OPERATOR_EMAILS = 'operator@example.com';

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');
const { createSession } = require('./helpers/session');

const Area = require('../src/modules/rooms/area.model');
const Hostel = require('../src/modules/rooms/hostel.model');
const Landlord = require('../src/modules/rooms/landlord.model');
const Room = require('../src/modules/rooms/room.model');
const Booking = require('../src/modules/bookings/booking.model');

const stockRoom = (overrides = {}) => ({
  type: 'shared',
  beds: 3,
  beds_left: 2,
  price: 20000,
  available_from: new Date('2026-09-01'),
  photos: ['https://example.com/a.jpg'],
  status: 'stock',
  deposit_paid_at: new Date(),
  ...overrides,
});

const claim = (token, roomId, key) =>
  request(app)
    .post(`/api/rooms/${roomId}/claims`)
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', key)
    .send({});

const devLogin = async (email, name = 'Tenant One', is_operator = false) =>
  createSession(email, { name, is_operator });

const loginWithPhone = async (email) => {
  const { token } = await devLogin(email);
  await request(app)
    .patch('/api/me')
    .set('Authorization', `Bearer ${token}`)
    .send({ phone: '0888 123 456' });
  return token;
};

describe('bookings module — claim a bed (Phase 3A)', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(disconnectDb);

  let room;
  let leadRoom;
  let fullRoom;

  beforeEach(async () => {
    const [area] = await Area.create([{ name: 'Chibavi' }]);
    const [landlord] = await Landlord.create([{ name: 'Nora Banda', phone: '0995 111 222' }]);
    const [hostel] = await Hostel.create([
      { name: 'Chibavi Hostel', area_id: area._id, lat: -11.439266, lng: 34.0257 },
    ]);

    const docs = await Room.create([
      stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id }),
      stockRoom({
        hostel_id: hostel._id,
        landlord_id: landlord._id,
        type: 'single',
        beds: 1,
        beds_left: 1,
      }),
      stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id, status: 'lead' }),
      stockRoom({
        hostel_id: hostel._id,
        landlord_id: landlord._id,
        beds_left: 0,
        rented: true,
        rented_at: new Date(),
      }),
    ]);
    room = docs[0];
    leadRoom = docs[2];
    fullRoom = docs[3];
  });

  it('claims a bed and returns a tx_ref (requested)', async () => {
    const token = await loginWithPhone('chisomo@gmail.com');
    const res = await claim(token, room.id, 'key-happy');

    expect(res.status).toBe(201);
    expect(res.body.data.pay_amount).toBe(20000);
    expect(res.body.data.tx_ref).toMatch(/^room4u_/);
    expect(res.body.data.booking).toMatchObject({
      status: 'requested',
      room_id: room.id,
    });
    expect(res.body.data.booking.tx_ref).toBeTruthy();
    expect(res.body.data.booking.room).toMatchObject({
      hostel: 'Chibavi Hostel',
      area: 'Chibavi',
      type: 'shared',
      beds_left: 2,
      price: 20000,
    });

    const booking = await Booking.findById(res.body.data.booking.id);
    expect(booking.status).toBe('requested');
    expect(booking.tx_ref).toBeTruthy();
  });

  it('requires the Idempotency-Key header', async () => {
    const token = await loginWithPhone('nokey@gmail.com');
    const res = await request(app)
      .post(`/api/rooms/${room.id}/claims`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('is 401 without a session', async () => {
    const res = await request(app)
      .post(`/api/rooms/${room.id}/claims`)
      .set('Idempotency-Key', 'key-anon');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('is 403 NEEDS_PHONE until the tenant adds a phone', async () => {
    const { token } = await devLogin('nophone@gmail.com');
    const res = await claim(token, room.id, 'key-nophone');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NEEDS_PHONE');
  });

  it('is 404 ROOM_NOT_FOUND for a lead room and unknown ids', async () => {
    const token = await loginWithPhone('lead@gmail.com');

    const lead = await claim(token, leadRoom.id, 'key-lead');
    expect(lead.status).toBe(404);
    expect(lead.body.error.code).toBe('ROOM_NOT_FOUND');

    const missing = await claim(token, new mongoose.Types.ObjectId(), 'key-missing');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('is 409 NO_BEDS when the room is full', async () => {
    const token = await loginWithPhone('full@gmail.com');
    const res = await claim(token, fullRoom.id, 'key-full');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NO_BEDS');
  });

  it('re-sending the same Idempotency-Key returns the same booking and tx_ref', async () => {
    const token = await loginWithPhone('dup@gmail.com');
    const first = await claim(token, room.id, 'key-same');
    const second = await claim(token, room.id, 'key-same');

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.booking.id).toBe(first.body.data.booking.id);
    expect(second.body.data.tx_ref).toBe(first.body.data.tx_ref);
    expect(await Booking.countDocuments({})).toBe(1);
  });

  it('resumes an existing active claim on the same room instead of erroring', async () => {
    const token = await loginWithPhone('oneclaim@gmail.com');
    const first = await claim(token, room.id, 'key-one-a');
    expect(first.status).toBe(201);

    const second = await claim(token, room.id, 'key-one-b');
    expect(second.status).toBe(201);
    expect(second.body.data.booking.id).toBe(first.body.data.booking.id);
    expect(second.body.data.tx_ref).toBe(first.body.data.tx_ref);
    expect(await Booking.countDocuments({})).toBe(1);
  });

  it('lets a different tenant claim a bed on the same room while beds remain', async () => {
    const a = await loginWithPhone('user-a@gmail.com');
    const b = await loginWithPhone('user-b@gmail.com');
    expect((await claim(a, room.id, 'key-a')).status).toBe(201);
    expect((await claim(b, room.id, 'key-b')).status).toBe(201);
    expect(await Booking.countDocuments({})).toBe(2);
  });

  it('GET /api/bookings/mine returns only my bookings, newest first', async () => {
    const token = await loginWithPhone('mine@gmail.com');
    const other = await loginWithPhone('other@gmail.com');

    await claim(other, room.id, 'key-other');
    const first = await claim(token, room.id, 'key-mine-1');
    const second = await claim(token, fullRoom._id ? fullRoom.id : fullRoom, 'key-mine-2');
    expect(second.status).toBe(409);

    const res = await request(app).get('/api/bookings/mine').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].id).toBe(first.body.data.booking.id);
  });

  it('GET /api/bookings/mine includes paid bookings with room details', async () => {
    const { token, user } = await devLogin('paidmine@gmail.com');
    const booking = await Booking.create({
      room_id: room._id,
      user_id: user.id,
      status: 'paid',
      tx_ref: 'room4u_paid_1',
      paid_at: new Date(),
      move_in_date: new Date('2026-09-01'),
    });

    const res = await request(app).get('/api/bookings/mine').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bookings).toHaveLength(1);
    expect(res.body.data.bookings[0].id).toBe(booking.id);
    expect(res.body.data.bookings[0].status).toBe('paid');
    expect(res.body.data.bookings[0].move_in_date).toBe('2026-09-01');
    expect(res.body.data.bookings[0].room).toMatchObject({
      hostel: 'Chibavi Hostel',
      area: 'Chibavi',
      price: 20000,
    });
  });

  it('GET /api/bookings/:id is visible to the owner only', async () => {
    const token = await loginWithPhone('owner@gmail.com');
    const created = await claim(token, room.id, 'key-owner');
    const bookingId = created.body.data.booking.id;

    const mine = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.booking.status).toBe('requested');

    const otherToken = await loginWithPhone('snoop@gmail.com');
    const other = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe('FORBIDDEN');

    const missing = await request(app)
      .get(`/api/bookings/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('cancels a requested booking and frees nothing on the room', async () => {
    const token = await loginWithPhone('cancel@gmail.com');
    const created = await claim(token, room.id, 'key-cancel');
    const bookingId = created.body.data.booking.id;

    const res = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe('cancelled');
    expect(res.body.data.booking.cancelled_at).toBeTruthy();

    const booking = await Booking.findById(bookingId);
    expect(booking.status).toBe('cancelled');
    expect(booking.cancelled_at).toBeTruthy();

    const savedRoom = await Room.findById(room.id);
    expect(savedRoom.beds_left).toBe(2);
    expect(savedRoom.status).toBe('stock');
  });

  it('cannot cancel twice, cancel another users booking, or cancel a paid booking', async () => {
    const token = await loginWithPhone('twice@gmail.com');
    const created = await claim(token, room.id, 'key-twice');
    const bookingId = created.body.data.booking.id;

    await request(app).post(`/api/bookings/${bookingId}/cancel`).set('Authorization', `Bearer ${token}`);
    const again = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('CONFLICT');

    const otherToken = await loginWithPhone('thief@gmail.com');
    const paid = await Booking.create({
      room_id: room._id,
      user_id: (await devLogin('paid@example.com')).user.id,
      status: 'paid',
      paid_at: new Date(),
    });
    const paidCancel = await request(app)
      .post(`/api/bookings/${paid.id}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(paidCancel.status).toBe(403);

    const paidCancelOwner = await request(app)
      .post(`/api/bookings/${paid.id}/cancel`)
      .set('Authorization', `Bearer ${await loginWithPhone('paid@example.com')}`);
    expect(paidCancelOwner.status).toBe(409);
  });

  it('lets the same tenant re-claim after cancelling', async () => {
    const token = await loginWithPhone('reclaim@gmail.com');
    const first = await claim(token, room.id, 'key-reclaim-1');
    await request(app)
      .post(`/api/bookings/${first.body.data.booking.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    const second = await claim(token, room.id, 'key-reclaim-2');
    expect(second.status).toBe(201);
  });

  it('auto-cancels a stale requested booking on read after the claim window', async () => {
    const token = await loginWithPhone('stale@gmail.com');
    const created = await claim(token, room.id, 'key-stale');
    const bookingId = created.body.data.booking.id;

    await Booking.updateOne(
      { _id: bookingId },
      { $set: { expires_at: new Date(Date.now() - 1000) } }
    );

    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe('cancelled');
    expect(res.body.data.booking.cancelled_at).toBeTruthy();
  });

  it('lets the same tenant re-claim after a stale booking expires', async () => {
    const token = await loginWithPhone('stale2@gmail.com');
    const first = await claim(token, room.id, 'key-stale-2a');

    await Booking.updateOne(
      { _id: first.body.data.booking.id },
      { $set: { expires_at: new Date(Date.now() - 1000) } }
    );

    const second = await claim(token, room.id, 'key-stale-2b');
    expect(second.status).toBe(201);
    expect(second.body.data.booking.id).not.toBe(first.body.data.booking.id);
  });

  it('an operator can view and cancel any requested booking', async () => {
    const { token } = await devLogin('operator@example.com', 'Operator', true);
    const created = await claim(await loginWithPhone('tenant-op@gmail.com'), room.id, 'key-op');
    const bookingId = created.body.data.booking.id;

    const view = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(view.status).toBe(200);

    const cancel = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.booking.status).toBe('cancelled');
  });

  it('GET /api/paychangu/return redirects to the reserve page (disabled gateway)', async () => {
    const token = await loginWithPhone('ret@gmail.com');
    const created = await claim(token, room.id, 'key-return');
    const booking = await Booking.findById(created.body.data.booking.id);

    const res = await request(app).get(`/api/paychangu/return?tx_ref=${booking.tx_ref}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/rooms/${room.id}/reserve`);
  });

  it('GET /api/paychangu/return redirects home for missing or unknown tx_ref', async () => {
    const missing = await request(app).get('/api/paychangu/return');
    expect(missing.status).toBe(302);
    expect(missing.headers.location).toBe('/');

    const unknown = await request(app).get('/api/paychangu/return?tx_ref=ghost');
    expect(unknown.status).toBe(302);
    expect(unknown.headers.location).toBe('/');
  });
});
