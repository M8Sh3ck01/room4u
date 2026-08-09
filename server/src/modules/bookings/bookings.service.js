const mongoose = require('mongoose');

const config = require('@config');
const { appError } = require('@core/errors');
const { getClaimableRoom } = require('@modules/rooms/room.service');
const { initiate } = require('@shared/services/paychanguService');
const Booking = require('./booking.model');
const IdempotencyKey = require('./idempotencykey.model');
const Payment = require('./payment.model');
const FollowUp = require('./followup.model');
const { assertCanTransition } = require('./booking.model');

const FOLLOW_UP_DAYS = 3;
const CLAIM_TTL_MS = config.claimTtlMinutes * 60 * 1000;

const bookingPopulate = [
  { path: 'room_id', populate: { path: 'hostel_id', populate: { path: 'area_id', model: 'Area' } } },
];

async function expireIfStale(booking, now = new Date()) {
  if (!booking || booking.status !== 'requested') return false;
  if (!booking.expires_at || booking.expires_at >= now) return false;
  await Booking.updateOne(
    { _id: booking._id, status: 'requested' },
    { $set: { status: 'cancelled', cancelled_at: now } }
  );
  booking.status = 'cancelled';
  booking.cancelled_at = now;
  return true;
}

async function claimRoom({ roomId, userId, idempotencyKey }) {
  const existing = await IdempotencyKey.findOne({ key: idempotencyKey, user_id: userId });
  if (existing) {
    const booking = await Booking.findById(existing.booking_id).populate(bookingPopulate);
    if (!booking) {
      throw appError(409, 'CONFLICT', 'Booking for this key no longer exists');
    }
    if (await expireIfStale(booking)) {
      await IdempotencyKey.deleteOne({ _id: existing._id });
      throw appError(409, 'CONFLICT', 'Your payment link expired. Try reserving again.');
    }
    return { booking, pay_amount: config.amounts.tenantFee, payment_link: existing.payment_link };
  }

  const room = await getClaimableRoom(roomId);
  if (!room) throw appError(404, 'ROOM_NOT_FOUND', 'Room not found');

  const active = await Booking.findOne({
    room_id: room._id,
    user_id: userId,
    status: 'requested',
  });
  if (active) {
    if (await expireIfStale(active)) {
      await IdempotencyKey.deleteOne({ booking_id: active._id, user_id: userId });
    } else {
      const idem = await IdempotencyKey.findOne({ booking_id: active._id, user_id: userId });
      if (idem) {
        await active.populate(bookingPopulate);
        return { booking: active, pay_amount: config.amounts.tenantFee, payment_link: idem.payment_link };
      }
      throw appError(409, 'CONFLICT', 'You already have an active claim on this room');
    }
  }

  if (room.beds_left < 1) throw appError(409, 'NO_BEDS', 'No beds left on this room');

  let booking;
  try {
    booking = await Booking.create({
      room_id: room._id,
      user_id: userId,
      expires_at: new Date(Date.now() + CLAIM_TTL_MS),
    });
  } catch (err) {
    if (err.code === 11000) {
      throw appError(409, 'CONFLICT', 'You already have an active claim on this room');
    }
    throw err;
  }

  const { charge_id, payment_link } = await initiate({ booking, room });
  booking.charge_id = charge_id;
  await booking.save();

  try {
    await IdempotencyKey.create({
      key: idempotencyKey,
      user_id: userId,
      booking_id: booking._id,
      payment_link,
    });
  } catch (err) {
    if (err.code === 11000) {
      const dup = await IdempotencyKey.findOne({ key: idempotencyKey, user_id: userId });
      const dupBooking = await Booking.findById(dup.booking_id).populate(bookingPopulate);
      return { booking: dupBooking, pay_amount: config.amounts.tenantFee, payment_link: dup.payment_link };
    }
    throw err;
  }

  await booking.populate(bookingPopulate);
  return { booking, pay_amount: config.amounts.tenantFee, payment_link };
}

async function getBookingById({ bookingId, user }) {
  const booking = await Booking.findById(bookingId).populate(bookingPopulate);
  if (!booking) throw appError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  await expireIfStale(booking);
  if (!user.is_operator && booking.user_id.toString() !== user.id) {
    throw appError(403, 'FORBIDDEN', 'Not your booking');
  }
  return booking;
}

async function getMyBookings(userId) {
  const bookings = await Booking.find({ user_id: userId })
    .sort({ requested_at: -1 })
    .populate(bookingPopulate);
  for (const booking of bookings) await expireIfStale(booking);
  return bookings;
}

async function cancelBooking({ bookingId, user }) {
  const booking = await Booking.findById(bookingId).populate(bookingPopulate);
  if (!booking) throw appError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  if (!user.is_operator && booking.user_id.toString() !== user.id) {
    throw appError(403, 'FORBIDDEN', 'Not your booking');
  }
  assertCanTransition(booking, 'cancelled');
  booking.status = 'cancelled';
  booking.cancelled_at = new Date();
  await booking.save();
  return booking;
}

async function markPaid({ booking, moveInDate, paidAt = new Date() }) {
  if (booking.status !== 'requested') return null;
  return Booking.findOneAndUpdate(
    { _id: booking._id, status: 'requested' },
    { $set: { status: 'paid', paid_at: paidAt, move_in_date: moveInDate } },
    { returnDocument: 'after' }
  );
}

async function completePayment({ booking, chargeId, moveInDate, paidAt = new Date() }) {
  const claimed = await markPaid({ booking, moveInDate, paidAt });
  if (!claimed) return null;

  await Payment.create([
    {
      booking_id: claimed._id,
      room_id: claimed.room_id,
      type: 'tenant_payment',
      amount: config.amounts.tenantFee,
      method: 'gateway',
      reference: chargeId,
      charge_id: chargeId,
    },
    {
      booking_id: claimed._id,
      room_id: claimed.room_id,
      type: 'gateway_fee',
      amount: -config.amounts.gatewayFee,
      method: 'gateway',
      reference: chargeId,
      charge_id: chargeId,
    },
  ]);

  const dueDate = new Date(moveInDate.getTime() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);
  await FollowUp.create({ booking_id: claimed._id, due_date: dueDate });

  return claimed;
}

async function cancelRequestsForRoom({ roomId, exceptChargeId, at = new Date() }) {
  await Booking.updateMany(
    { room_id: roomId, status: 'requested', charge_id: { $ne: exceptChargeId } },
    { $set: { status: 'cancelled', cancelled_at: at } }
  );
}

async function findByChargeId(chargeId) {
  return Booking.findOne({ charge_id: chargeId });
}

module.exports = {
  claimRoom,
  getBookingById,
  getMyBookings,
  cancelBooking,
  markPaid,
  completePayment,
  cancelRequestsForRoom,
  findByChargeId,
  FOLLOW_UP_DAYS,
};
