const config = require('@config');
const { appError } = require('@core/errors');
const { verifyPayment } = require('@shared/services/paychanguService');
const { consumeBed } = require('@modules/rooms/room.service');
const {
  findByTxRef,
  completePayment,
  cancelRequestsForRoom,
} = require('@modules/bookings/bookings.service');

const SUCCESS_STATUSES = new Set(['success', 'SUCCESS']);
const PAYMENT_EVENT_TYPES = new Set(['api.charge.payment', 'checkout.payment']);

const toMoveInDate = (raw, fallback) => {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
};

async function assertVerified(chargeId) {
  const verified = await verifyPayment(chargeId);
  const data = verified && verified.data ? verified.data : verified;
  if (!data || data.status !== 'success') {
    throw appError(502, 'GATEWAY_ERROR', 'Payment verification failed');
  }
  if (data.currency && data.currency !== 'MWK') {
    throw appError(502, 'GATEWAY_ERROR', 'Payment currency mismatch');
  }
  if (Number(data.amount) < config.amounts.tenantFee) {
    throw appError(502, 'GATEWAY_ERROR', 'Payment amount below expected deposit');
  }
}

async function processPaidBooking({
  txRef,
  chargeId,
  paidAt = new Date(),
  moveInDateRaw,
}) {
  const booking = await findByTxRef(txRef);
  if (!booking) throw appError(404, 'BOOKING_NOT_FOUND', 'No booking for this charge');

  if (config.paychangu.enabled) {
    await assertVerified(txRef);
  }

  const gatewayChargeId = chargeId || booking.tx_ref;
  const result = await consumeBed({
    roomId: booking.room_id,
    chargeId: gatewayChargeId,
    userId: booking.user_id,
    paidAt,
  });

  if (!result) {
    return { ok: true, skipped: true, reason: 'no-bed' };
  }

  const moveInDate = toMoveInDate(moveInDateRaw, result.room.available_from);

  const claimed = await completePayment({
    booking,
    txRef: booking.tx_ref,
    chargeId: gatewayChargeId,
    moveInDate,
    paidAt,
  });

  if (!claimed) {
    return { ok: true, skipped: true, reason: 'booking-not-requested' };
  }

  if (result.justRented) {
    await cancelRequestsForRoom({ roomId: booking.room_id, exceptTxRef: booking.tx_ref, at: paidAt });
  }

  return { ok: true, booking_id: claimed.id, room_rented: result.justRented };
}

async function handlePayChanguWebhook(rawBody) {
  let body;
  try {
    body = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody));
  } catch (err) {
    throw appError(400, 'VALIDATION_ERROR', 'Webhook body must be valid JSON');
  }

  if (body.event_type && !PAYMENT_EVENT_TYPES.has(body.event_type)) {
    return { ok: true, skipped: true, reason: `event_type=${body.event_type}` };
  }

  if (body.status && !SUCCESS_STATUSES.has(body.status)) {
    return { ok: true, skipped: true, reason: `status=${body.status}` };
  }

  const ref = body.tx_ref || body.reference || body.charge_id;
  if (!ref) throw appError(400, 'VALIDATION_ERROR', 'Missing charge reference');

  const booking = await findByTxRef(ref);
  if (!booking) throw appError(404, 'BOOKING_NOT_FOUND', 'No booking for this charge');

  if (body.charge_id && booking.charge_id !== body.charge_id) {
    booking.charge_id = body.charge_id;
    await booking.save();
  }

  return processPaidBooking({
    txRef: booking.tx_ref,
    chargeId: body.charge_id,
    paidAt: new Date(),
    moveInDateRaw: body.move_in_date,
  });
}

module.exports = { handlePayChanguWebhook, processPaidBooking };
