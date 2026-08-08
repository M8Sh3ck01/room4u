const { appError } = require('@core/errors');
const { consumeBed } = require('@modules/rooms/room.service');
const {
  findByChargeId,
  completePayment,
  cancelRequestsForRoom,
} = require('@modules/bookings/bookings.service');

const toMoveInDate = (raw, fallback) => {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
};

async function handlePayChanguWebhook(rawBody) {
  let body;
  try {
    body = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch (err) {
    throw appError(400, 'VALIDATION_ERROR', 'Webhook body must be valid JSON');
  }

  const { charge_id, status } = body;
  if (!charge_id) throw appError(400, 'VALIDATION_ERROR', 'Missing charge_id');

  if (status && status !== 'SUCCESS') {
    return { ok: true, skipped: true, reason: `status=${status}` };
  }

  const booking = await findByChargeId(charge_id);
  if (!booking) throw appError(404, 'BOOKING_NOT_FOUND', 'No booking for this charge');

  const paidAt = new Date();
  const result = await consumeBed({
    roomId: booking.room_id,
    chargeId: charge_id,
    userId: booking.user_id,
    paidAt,
  });

  if (!result) {
    return { ok: true, skipped: true, reason: 'no-bed' };
  }

  const moveInDate = toMoveInDate(body.move_in_date, result.room.available_from);

  const claimed = await completePayment({ booking, chargeId: charge_id, moveInDate, paidAt });

  if (!claimed) {
    return { ok: true, skipped: true, reason: 'booking-not-requested' };
  }

  if (result.justRented) {
    await cancelRequestsForRoom({ roomId: booking.room_id, exceptChargeId: charge_id, at: paidAt });
  }

  return { ok: true, booking_id: claimed.id, room_rented: result.justRented };
}

module.exports = { handlePayChanguWebhook };
