process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');

const Area = require('../src/modules/rooms/area.model');
const Hostel = require('../src/modules/rooms/hostel.model');
const Landlord = require('../src/modules/rooms/landlord.model');
const Room = require('../src/modules/rooms/room.model');

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

describe('rooms module — browse listings', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(disconnectDb);

  let areas;
  let hostels;
  let rooms;

  beforeEach(async () => {
    areas = {};
    for (const name of ['Chibavi', 'Luwinga', 'Katoto']) {
      const [area] = await Area.create([{ name }]);
      areas[name] = area;
    }

    const [landlord] = await Landlord.create([{ name: 'Nora Banda', phone: '0995 111 222' }]);

    hostels = {};
    const hostelDocs = await Hostel.create([
      {
        name: 'Chibavi Hostel',
        area_id: areas.Chibavi._id,
        lat: -11.439266,
        lng: 34.0257,
      },
      {
        name: 'Luwinga Hostel',
        area_id: areas.Luwinga._id,
        lat: -11.4494,
        lng: 34.0257,
      },
      {
        name: 'Katoto Hostel',
        area_id: areas.Katoto._id,
        lat: null,
        lng: null,
      },
    ]);
    for (const [i, name] of ['Chibavi', 'Luwinga', 'Katoto'].entries()) {
      hostels[name] = hostelDocs[i];
    }

    const roomDocs = await Room.create([
      stockRoom({ hostel_id: hostels.Chibavi._id, landlord_id: landlord._id, type: 'shared', price: 20000, beds: 3, beds_left: 2 }),
      stockRoom({ hostel_id: hostels.Chibavi._id, landlord_id: landlord._id, type: 'single', price: 15000, beds: 1, beds_left: 1, available_from: new Date('2026-09-15') }),
      stockRoom({ hostel_id: hostels.Luwinga._id, landlord_id: landlord._id, type: 'shared', price: 18000, beds: 4, beds_left: 4 }),
      stockRoom({ hostel_id: hostels.Katoto._id, landlord_id: landlord._id, type: 'single', price: 12000, beds: 1, beds_left: 1 }),
      stockRoom({ hostel_id: hostels.Chibavi._id, landlord_id: landlord._id, type: 'shared', price: 14000, status: 'lead' }),
      stockRoom({ hostel_id: hostels.Luwinga._id, landlord_id: landlord._id, type: 'shared', price: 17000, status: 'rented', rented: true, rented_at: new Date() }),
      stockRoom({ hostel_id: hostels.Katoto._id, landlord_id: landlord._id, type: 'shared', price: 19000, beds_left: 0, rented: true, rented_at: new Date() }),
    ]);
    rooms = { A: roomDocs[0], B: roomDocs[1], C: roomDocs[2], D: roomDocs[3] };
  });

  it('lists only stock rooms with beds left, pinned first by distance', async () => {
    const res = await request(app).get('/api/rooms');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rooms).toHaveLength(4);

    const hostels = res.body.data.rooms.map((r) => r.hostel);
    expect(hostels[0]).toBe('Luwinga Hostel');
    expect(hostels[hostels.length - 1]).toBe('Katoto Hostel');
  });

  it('shows honest distance for the 2.1 km hostel (walk ~32 min)', async () => {
    const res = await request(app).get('/api/rooms');
    const chibavi = res.body.data.rooms.find((r) => r.id === rooms.A.id);

    expect(chibavi).toMatchObject({
      hostel: 'Chibavi Hostel',
      area: 'Chibavi',
      type: 'shared',
      beds: 3,
      beds_left: 2,
      price: 20000,
      available_from: '2026-09-01',
      dist_km: 2.1,
      walk_min: 32,
    });
  });

  it('marks rooms without a pin with null distance, never hides them', async () => {
    const res = await request(app).get('/api/rooms');
    const noPin = res.body.data.rooms.find((r) => r.id === rooms.D.id);

    expect(noPin.dist_km).toBeNull();
    expect(noPin.walk_min).toBeNull();
  });

  it('filters by area', async () => {
    const res = await request(app).get(`/api/rooms?area=${areas.Chibavi._id}`);
    const ids = res.body.data.rooms.map((r) => r.id);
    expect(ids.sort()).toEqual([rooms.A.id, rooms.B.id].sort());
  });

  it('filters by max_price', async () => {
    const res = await request(app).get('/api/rooms?max_price=15000');
    const ids = res.body.data.rooms.map((r) => r.id);
    expect(ids.sort()).toEqual([rooms.B.id, rooms.D.id].sort());
  });

  it('filters by type', async () => {
    const res = await request(app).get('/api/rooms?type=single');
    const ids = res.body.data.rooms.map((r) => r.id);
    expect(ids.sort()).toEqual([rooms.B.id, rooms.D.id].sort());
  });

  it('filters by max_walk_min but keeps no-pin rooms', async () => {
    const res = await request(app).get('/api/rooms?max_walk_min=20');
    const ids = res.body.data.rooms.map((r) => r.id);
    expect(ids.sort()).toEqual([rooms.C.id, rooms.D.id].sort());
  });

  it('filters by available_from (available on or before move-in)', async () => {
    const res = await request(app).get('/api/rooms?available_from=2026-09-10');
    const ids = res.body.data.rooms.map((r) => r.id);
    expect(ids).toContain(rooms.A.id);
    expect(ids).toContain(rooms.C.id);
    expect(ids).toContain(rooms.D.id);
    expect(ids).not.toContain(rooms.B.id);
  });

  it('filters combine (area + max_price)', async () => {
    const res = await request(app).get(`/api/rooms?area=${areas.Chibavi._id}&max_price=15000`);
    const ids = res.body.data.rooms.map((r) => r.id);
    expect(ids).toEqual([rooms.B.id]);
  });

  it('detail includes directions link and locked landlord_contact', async () => {
    const res = await request(app).get(`/api/rooms/${rooms.A.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.room).toMatchObject({
      id: rooms.A.id,
      hostel: 'Chibavi Hostel',
      area: 'Chibavi',
      dist_km: 2.1,
      walk_min: 32,
      landlord_contact: null,
    });
    expect(res.body.data.room.directions_url).toContain('https://www.google.com/maps/dir/?api=1&');
    expect(typeof res.body.data.room.lat).toBe('number');
    expect(typeof res.body.data.room.lng).toBe('number');
  });

  it('detail of a lead room is 404 ROOM_NOT_FOUND', async () => {
    const res = await request(app).get(`/api/rooms/${rooms.A.id}`);
    const lead = await Room.findOne({ status: 'lead' });
    const leadRes = await request(app).get(`/api/rooms/${lead.id}`);

    expect(res.status).toBe(200);
    expect(leadRes.status).toBe(404);
    expect(leadRes.body.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('detail of a full (beds_left 0) room is 404', async () => {
    const full = await Room.findOne({ beds_left: 0 });
    const res = await request(app).get(`/api/rooms/${full.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('detail of an unknown id is 404', async () => {
    const res = await request(app).get(`/api/rooms/${new (require('mongoose').Types.ObjectId)()}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('GET /api/areas returns areas sorted by name', async () => {
    const res = await request(app).get('/api/areas');

    expect(res.status).toBe(200);
    expect(res.body.data.areas.map((a) => a.name)).toEqual(['Chibavi', 'Katoto', 'Luwinga']);
  });
});
