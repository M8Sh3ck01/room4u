const express = require('express');

const { asyncCatch } = require('@core/middleware/asyncCatch');
const { auth, requirePhone } = require('@core/middleware/auth');
const { successResponse } = require('@core/utils/apiResponse');
const { appError } = require('@core/errors');
const mongoose = require('mongoose');
const config = require('@config');
const { claimRoom, getBookingById, getMyBookings, cancelBooking, findByTxRef } = require('./bookings.service');
const { serializeBooking } = require('./booking.model');
const { serializeRoom } = require('@modules/rooms/room.service');
const { processPaidBooking } = require('@shared/services/paychanguWebhook');

const router = express.Router();

router.post(
  '/rooms/:id/claims',
  auth,
  requirePhone,
  asyncCatch(async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      throw appError(400, 'VALIDATION_ERROR', 'Idempotency-Key header is required');
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw appError(404, 'ROOM_NOT_FOUND', 'Room not found');
    }
    const { booking, pay_amount, tx_ref } = await claimRoom({
      roomId: req.params.id,
      userId: req.user.id,
      idempotencyKey,
    });
    successResponse(
      res,
      { booking: serializeBooking(booking), pay_amount, tx_ref },
      'Booking created',
      201
    );
  })
);

router.get(
  '/paychangu/return',
  asyncCatch(async (req, res) => {
    const txRef = req.query.tx_ref;
    if (!txRef) return res.redirect('/');
    const booking = await findByTxRef(txRef);
    if (!booking) return res.redirect('/');

    const target = `/rooms/${booking.room_id.toString()}/reserve`;
    if (!config.paychangu.enabled) return res.redirect(target);
    try {
      await processPaidBooking({ txRef, paidAt: new Date() });
      return res.redirect(`${target}?status=success`);
    } catch (err) {
      return res.redirect(`${target}?status=error`);
    }
  })
);

router.get(
  '/bookings/mine',
  auth,
  asyncCatch(async (req, res) => {
    const bookings = await getMyBookings(req.user.id);
    successResponse(res, { bookings: bookings.map(serializeBooking) }, 'OK', 200);
  })
);

router.get(
  '/bookings/:id',
  auth,
  asyncCatch(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw appError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }
    const booking = await getBookingById({ bookingId: req.params.id, user: req.user });
    successResponse(res, { booking: serializeBooking(booking) }, 'OK', 200);
  })
);

router.get(
  '/bookings/:id/room',
  auth,
  asyncCatch(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw appError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }
    const booking = await getBookingById({ bookingId: req.params.id, user: req.user });
    const room = booking.room_id;
    if (!room || typeof room !== 'object') {
      throw appError(404, 'ROOM_NOT_FOUND', 'Room not found');
    }
    successResponse(
      res,
      { booking: serializeBooking(booking), room: serializeRoom(room, { detail: true }) },
      'OK',
      200
    );
  })
);

router.post(
  '/bookings/:id/cancel',
  auth,
  asyncCatch(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw appError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }
    const booking = await cancelBooking({ bookingId: req.params.id, user: req.user });
    successResponse(res, { booking: serializeBooking(booking) }, 'Booking cancelled', 200);
  })
);

module.exports = router;
