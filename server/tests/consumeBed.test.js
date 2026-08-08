process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');

const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');
const { consumeBed } = require('../src/modules/rooms/room.service');

const Area = require('../src/modules/rooms/area.model');
const Hostel = require('../src/modules/rooms/hostel.model');
const Landlord = require('../src/modules/rooms/landlord.model');
const Room = require('../src/modules/rooms/room.model');
const RoomEvent = require('../src/modules/rooms/roomevent.model');
const Booking = require('../src/modules/bookings/booking.model');
const User = require('../src/modules/users/user.model');

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

const seedUser = (suffix) =>
  User.create({ google_sub: `sub-${suffix}`, email: `${suffix}@example.com`, name: `User ${suffix}` });

describe('consumeBed — atomic bed consumption for paid charges (Slice 3 W3)', () => {
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

  it('consumes a bed and records the sold charge (not the last bed)', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await seedUser('happy');
    const paidAt = new Date('2026-06-01T10:00:00Z');

    const result = await consumeBed({ roomId: room.id, chargeId: 'charge-happy', userId: user._id, paidAt });

    expect(result).not.toBeNull();
    expect(result.justRented).toBe(false);
    expect(result.room.beds_left).toBe(1);
    expect(result.room.rented).toBe(false);

    const saved = await Room.findById(room.id);
    expect(saved.beds_left).toBe(1);
    expect(saved.sold).toHaveLength(1);
    expect(saved.sold[0].charge_id).toBe('charge-happy');
    expect(saved.sold[0].user_id.toString()).toBe(user._id.toString());
    expect(saved.sold[0].paid_at.toISOString()).toBe(paidAt.toISOString());
    expect(await RoomEvent.countDocuments({ room_id: room._id })).toBe(0);
  });

  it('rents the room on the last bed without touching bookings (sweep belongs to the webhook flow)', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id, beds: 1, beds_left: 1 })]);
    const buyer = await seedUser('buyer');
    const [otherUser] = await User.create([{ google_sub: 'sub-other', email: 'other@example.com' }]);
    const paidAt = new Date('2026-06-02T11:00:00Z');
    await Booking.create([
      { room_id: room._id, user_id: buyer._id, status: 'paid', paid_at: paidAt, charge_id: 'charge-last' },
      { room_id: room._id, user_id: otherUser._id, status: 'requested' },
    ]);

    const result = await consumeBed({ roomId: room.id, chargeId: 'charge-last', userId: buyer._id, paidAt });

    expect(result.justRented).toBe(true);

    const saved = await Room.findById(room.id);
    expect(saved.beds_left).toBe(0);
    expect(saved.rented).toBe(true);
    expect(saved.status).toBe('rented');
    expect(saved.rented_at.toISOString()).toBe(paidAt.toISOString());
    expect(saved.sold).toHaveLength(1);

    const events = await RoomEvent.find({ room_id: room._id });
    expect(events).toHaveLength(1);
    expect(events[0].from_status).toBe('stock');
    expect(events[0].to_status).toBe('rented');
    expect(events[0].actor_id.toString()).toBe(buyer._id.toString());

    const others = await Booking.findOne({ user_id: otherUser._id });
    expect(others.status).toBe('requested');
  });

  it('is a no-op for a duplicate charge_id (double webhook)', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    const user = await seedUser('dup');

    const first = await consumeBed({ roomId: room.id, chargeId: 'charge-1', userId: user._id });
    expect(first).not.toBeNull();

    const second = await consumeBed({ roomId: room.id, chargeId: 'charge-1', userId: user._id });
    expect(second).toBeNull();

    const saved = await Room.findById(room.id);
    expect(saved.beds_left).toBe(1);
    expect(saved.sold).toHaveLength(1);
    expect(saved.rented).toBe(false);
  });

  it('last-bed race: exactly one concurrent consumer wins', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id, beds: 1, beds_left: 1 })]);
    const u1 = await seedUser('race-a');
    const u2 = await seedUser('race-b');

    const results = await Promise.all([
      consumeBed({ roomId: room.id, chargeId: 'charge-race-a', userId: u1._id, paidAt: new Date('2026-06-03T08:00:00Z') }),
      consumeBed({ roomId: room.id, chargeId: 'charge-race-b', userId: u2._id, paidAt: new Date('2026-06-03T08:01:00Z') }),
    ]);

    expect(results.filter((r) => r !== null)).toHaveLength(1);

    const saved = await Room.findById(room.id);
    expect(saved.beds_left).toBe(0);
    expect(saved.sold).toHaveLength(1);
    expect(saved.rented).toBe(true);
    expect(saved.status).toBe('rented');
    expect(await RoomEvent.countDocuments({ room_id: room._id })).toBe(1);
  });

  it('is a no-op when the room is already rented or sold out', async () => {
    const [room] = await Room.create([
      stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id, beds: 1, beds_left: 0, rented: true, status: 'rented', rented_at: new Date() }),
    ]);
    const user = await seedUser('full');

    const result = await consumeBed({ roomId: room.id, chargeId: 'charge-full', userId: user._id });
    expect(result).toBeNull();

    const saved = await Room.findById(room.id);
    expect(saved.beds_left).toBe(0);
    expect(saved.sold).toHaveLength(0);
  });

  it('is a no-op for unknown, invalid, or missing ids', async () => {
    const user = await seedUser('bad');
    const missing = await consumeBed({ roomId: new mongoose.Types.ObjectId(), chargeId: 'charge-x', userId: user._id });
    expect(missing).toBeNull();

    const invalid = await consumeBed({ roomId: 'not-an-objectid', chargeId: 'charge-x', userId: user._id });
    expect(invalid).toBeNull();

    const noCharge = await consumeBed({ roomId: new mongoose.Types.ObjectId(), chargeId: '', userId: user._id });
    expect(noCharge).toBeNull();
  });

  it('rents only when the last bed is consumed across sequential payments', async () => {
    const [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id, beds: 2, beds_left: 2 })]);
    const u1 = await seedUser('seq-a');
    const u2 = await seedUser('seq-b');

    const first = await consumeBed({ roomId: room.id, chargeId: 'charge-seq-a', userId: u1._id });
    expect(first.justRented).toBe(false);
    expect(first.room.beds_left).toBe(1);

    const second = await consumeBed({ roomId: room.id, chargeId: 'charge-seq-b', userId: u2._id });
    expect(second.justRented).toBe(true);
    expect(second.room.beds_left).toBe(0);

    const saved = await Room.findById(room.id);
    expect(saved.rented).toBe(true);
    expect(saved.sold).toHaveLength(2);
    expect(await RoomEvent.countDocuments({ room_id: room._id })).toBe(1);
  });
});
