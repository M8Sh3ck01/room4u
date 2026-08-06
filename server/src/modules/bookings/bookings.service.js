const mongoose = require('mongoose');

const config = require('@config');
const { appError } = require('@core/errors');
const { getClaimableRoom } = require('@modules/rooms/room.service');
const { initiate } = require('@shared/services/paychanguService');
const Booking = require('./booking.model');
const IdempotencyKey = require('./idempotencykey.model');
const { assertCanTransition } = require('./booking.model');

const bookingPopulate = [
  { path: 'room_id', populate: { path: 'hostel_id', populate: { path: 'area_id', model: 'Area' } } },
];

async function claimRoom({ roomId, userId, idempotencyKey }) {
  const existing = await IdempotencyKey.findOne({ key: idempotencyKey, user_id: userId });
  if (existing) {
    const booking = await Booking.findById(existing.booking_id).populate(bookingPopulate);
    if (!booking) {
      throw appError(409, 'CONFLICT', 'Booking for this key no longer exists');
    }
    return { booking, pay_amount: config.amounts.tenantFee, payment_link: existing.payment_link };
  }

  const room = await getClaimableRoom(roomId);
  if (!room) throw appError(404, 'ROOM_NOT_FOUND', 'Room not found');
  if (room.beds_left < 1) throw appError(409, 'NO_BEDS', 'No beds left on this room');

  const active = await Booking.findOne({
    room_id: room._id,
    user_id: userId,
    status: 'requested',
  });
  if (active) {
    throw appError(409, 'CONFLICT', 'You already have an active claim on this room');
  }

  let booking;
  try {
    booking = await Booking.create({ room_id: room._id, user_id: userId });
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
  if (!user.is_operator && booking.user_id.toString() !== user.id) {
    throw appError(403, 'FORBIDDEN', 'Not your booking');
  }
  return booking;
}

async function getMyBookings(userId) {
  return Booking.find({ user_id: userId }).sort({ requested_at: -1 }).populate(bookingPopulate);
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

module.exports = { claimRoom, getBookingById, getMyBookings, cancelBooking };
