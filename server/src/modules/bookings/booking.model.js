const mongoose = require('mongoose');

const { appError } = require('@core/errors');

const ALLOWED_TRANSITIONS = {
  requested: ['paid', 'cancelled'],
  paid: ['refunded'],
  cancelled: [],
  refunded: [],
};

const bookingSchema = new mongoose.Schema(
  {
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['requested', 'paid', 'cancelled', 'refunded'],
      default: 'requested',
    },
    // Tracks the state of the gateway charge. Distinct from `status` so a
    //   charge that is confirmed / in-flight / failed is never confused with
    //   "user never initiated payment".
    // none|pending  -> no confirmed charge (default)
    // confirmed     -> gateway confirmed success, booking marked paid
    // failed        -> a charge was attempted but not confirmed
    // refund_pending-> a confirmed charge needs reversing (operator)
    payment_status: {
      type: String,
      enum: ['none', 'pending', 'confirmed', 'failed', 'refund_pending'],
      default: 'none',
    },
    tx_ref: { type: String, default: null },
    charge_id: { type: String, default: null },
    move_in_date: { type: Date, default: null },
    notes: { type: String, default: null },
    requested_at: { type: Date, default: Date.now },
    paid_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    expires_at: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.index(
  { room_id: 1, user_id: 1 },
  { unique: true, partialFilterExpression: { status: 'requested' } }
);
bookingSchema.index({ user_id: 1 });
bookingSchema.index({ status: 1 });

function assertCanTransition(booking, to) {
  const allowed = ALLOWED_TRANSITIONS[booking.status];
  if (!allowed || !allowed.includes(to)) {
    throw appError(409, 'CONFLICT', `Cannot move booking from ${booking.status} to ${to}`);
  }
}

const serializeBooking = (booking) => {
  const room = booking.room_id && typeof booking.room_id === 'object' ? booking.room_id : null;
  return {
    id: booking.id,
    room_id: room ? room.id : booking.room_id,
    status: booking.status,
    payment_status: booking.payment_status || 'none',
    tx_ref: booking.tx_ref,
    charge_id: booking.charge_id,
    move_in_date: booking.move_in_date ? booking.move_in_date.toISOString().slice(0, 10) : null,
    requested_at: booking.requested_at,
    paid_at: booking.paid_at,
    cancelled_at: booking.cancelled_at,
    created_at: booking.created_at,
    ...(room ? { room: serializeRoomReference(room) } : {}),
  };
};

const serializeRoomReference = (room) => {
  const hostel = room.hostel_id && typeof room.hostel_id === 'object' ? room.hostel_id : null;
  const area = hostel && hostel.area_id && typeof hostel.area_id === 'object' ? hostel.area_id : null;
  return {
    id: room.id,
    hostel: hostel ? hostel.name : '',
    area: area ? area.name : '',
    type: room.type,
    beds: room.beds,
    beds_left: room.beds_left,
    price: room.price,
    available_from: room.available_from ? room.available_from.toISOString().slice(0, 10) : null,
  };
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
module.exports.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;
module.exports.assertCanTransition = assertCanTransition;
module.exports.serializeBooking = serializeBooking;
