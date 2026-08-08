process.env.NODE_ENV = 'test';

const { connectTestDb, clearDb, disconnectDb } = require('./helpers/db');
const { markPaid } = require('../src/modules/bookings/bookings.service');

const Area = require('../src/modules/rooms/area.model');
const Hostel = require('../src/modules/rooms/hostel.model');
const Landlord = require('../src/modules/rooms/landlord.model');
const Room = require('../src/modules/rooms/room.model');
const Booking = require('../src/modules/bookings/booking.model');
const User = require('../src/modules/users/user.model');

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

describe('markPaid — atomic requested → paid transition (Slice 3 W4)', () => {
  beforeAll(connectTestDb, 30000);
  beforeEach(clearDb);
  afterAll(disconnectDb);

  let room;
  let user;

  beforeEach(async () => {
    const [area] = await Area.create([{ name: 'Chibavi' }]);
    const [landlord] = await Landlord.create([{ name: 'Nora Banda', phone: '0995 111 222' }]);
    const [hostel] = await Hostel.create([
      { name: 'Chibavi Hostel', area_id: area._id, lat: -11.439266, lng: 34.0257 },
    ]);
    [room] = await Room.create([stockRoom({ hostel_id: hostel._id, landlord_id: landlord._id })]);
    user = await User.create({ google_sub: 'sub-markpaid', email: 'markpaid@example.com' });
  });

  it('transitions a requested booking to paid and stamps paid_at + move_in_date', async () => {
    const [booking] = await Booking.create([{ room_id: room._id, user_id: user._id, status: 'requested' }]);
    const moveInDate = new Date('2026-09-01');
    const paidAt = new Date('2026-08-08T12:00:00Z');

    const claimed = await markPaid({ booking, moveInDate, paidAt });

    expect(claimed).not.toBeNull();
    expect(claimed.status).toBe('paid');
    expect(claimed.paid_at.toISOString()).toBe(paidAt.toISOString());
    expect(claimed.move_in_date.toISOString()).toBe(moveInDate.toISOString());
    expect((await Booking.findById(booking._id)).status).toBe('paid');
  });

  it('is a no-op (null) for an already-paid booking', async () => {
    const [booking] = await Booking.create([
      { room_id: room._id, user_id: user._id, status: 'paid', paid_at: new Date() },
    ]);

    const claimed = await markPaid({ booking, moveInDate: new Date() });
    expect(claimed).toBeNull();
    expect((await Booking.findById(booking._id)).status).toBe('paid');
  });

  it('is a no-op (null) for a cancelled or refunded booking', async () => {
    const [cancelled] = await Booking.create([
      { room_id: room._id, user_id: user._id, status: 'cancelled', cancelled_at: new Date() },
    ]);
    const [refunded] = await Booking.create([
      { room_id: room._id, user_id: user._id, status: 'refunded' },
    ]);

    expect(await markPaid({ booking: cancelled, moveInDate: new Date() })).toBeNull();
    expect(await markPaid({ booking: refunded, moveInDate: new Date() })).toBeNull();
    expect((await Booking.findById(cancelled._id)).status).toBe('cancelled');
    expect((await Booking.findById(refunded._id)).status).toBe('refunded');
  });

  it('loses the race: only one concurrent caller wins the transition', async () => {
    const [booking] = await Booking.create([{ room_id: room._id, user_id: user._id, status: 'requested' }]);

    const results = await Promise.all([
      markPaid({ booking, moveInDate: new Date(), paidAt: new Date('2026-08-08T08:00:00Z') }),
      markPaid({ booking, moveInDate: new Date(), paidAt: new Date('2026-08-08T09:00:00Z') }),
    ]);

    expect(results.filter((r) => r !== null)).toHaveLength(1);
    const saved = await Booking.findById(booking._id);
    expect(saved.status).toBe('paid');
    expect(await Booking.countDocuments({ paid_at: { $ne: null } })).toBe(1);
  });

  it('works with an unpopulated booking document (as the webhook finds it)', async () => {
    const [booking] = await Booking.create([{ room_id: room._id, user_id: user._id, status: 'requested' }]);

    const claimed = await markPaid({ booking, moveInDate: new Date('2026-09-01') });
    expect(claimed).not.toBeNull();
    expect(claimed.room_id.toString()).toBe(room._id.toString());
    expect(claimed.user_id.toString()).toBe(user._id.toString());
  });
});
