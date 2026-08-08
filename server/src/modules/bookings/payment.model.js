const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    type: {
      type: String,
      enum: ['tenant_payment', 'gateway_fee', 'deposit', 'reporter_fee', 'refund'],
      required: true,
    },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['gateway', 'mobile_money', 'cash'], default: 'gateway' },
    reference: { type: String, default: null },
    charge_id: { type: String, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ booking_id: 1 });
paymentSchema.index({ room_id: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ created_at: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
