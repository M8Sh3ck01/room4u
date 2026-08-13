const config = require('@config');
const Booking = require('@modules/bookings/booking.model');
const { processPaidBooking } = require('@shared/services/paychanguWebhook');

/**
 * Priority 1 — reconcile a single booking against the gateway.
 *
 * Closes the "I paid but my booking still says awaiting payment" hole: when a
 * charge was made at PayChangu but neither the webhook nor the return redirect
 * finalised it, this re-verifies the tx_ref and completes the payment
 * (mark paid, consume bed, write ledger + follow-up). Idempotent — safe to run
 * repeatedly.
 */
async function reconcileBooking({ bookingId }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return { reconciled: false, reason: 'not-found', message: 'Booking not found.' };
  }
  if (booking.status !== 'requested') {
    const message =
      booking.status === 'paid'
        ? 'This booking is already paid.'
        : `This booking is ${booking.status} and cannot be reconciled.`;
    return { reconciled: false, reason: `status=${booking.status}`, message };
  }

  try {
    const result = await processPaidBooking({
      txRef: booking.tx_ref,
      paidAt: new Date(),
      moveInDateRaw: booking.move_in_date,
    });
    if (result && result.skipped) {
      const message =
        result.reason === 'no-bed'
          ? 'Payment was verified, but no bed is left on this room. Our team will follow up about your refund.'
          : 'This payment could not be applied to the booking right now.';
      return { reconciled: false, reason: result.reason, message };
    }
    return { reconciled: true, message: 'Payment confirmed — your bed is secured.' };
  } catch (err) {
    return {
      reconciled: false,
      reason: 'not-confirmed',
      message: 'We could not confirm a completed payment for this booking yet.',
    };
  }
}

/**
 * Reconcile every expired `requested` booking (the sweep the webhook relies on
 * as a safety net). Safe to call from a scheduled job or an operator action.
 */
async function reconcileStaleRequested({ limit = 50 } = {}) {
  const ttlMs = (config.claimTtlMinutes || 5) * 60 * 1000;
  const cutoff = new Date(Date.now() - ttlMs);
  const stale = await Booking.find({
    status: 'requested',
    expires_at: { $lt: cutoff },
  }).limit(limit);

  const results = [];
  for (const booking of stale) {
    results.push({
      booking_id: booking.id,
      ...(await reconcileBooking({ bookingId: booking.id })),
    });
  }
  return results;
}

module.exports = { reconcileBooking, reconcileStaleRequested };
