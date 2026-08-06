const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    payment_link: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

idempotencyKeySchema.index({ key: 1, user_id: 1 }, { unique: true });
idempotencyKeySchema.index({ created_at: 1 }, { expireAfterSeconds: 86400 });

const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);

module.exports = IdempotencyKey;
