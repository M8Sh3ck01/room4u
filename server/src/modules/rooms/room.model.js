const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hostel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    landlord_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true },
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: ['single', 'shared'], required: true },
    beds: { type: Number, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
    available_from: { type: Date, required: true },
    maps_link: { type: String, default: null },
    photos: {
      type: [{ type: String }],
      validate: {
        validator: (v) => v && v.length >= 1,
        message: 'Room needs at least one photo',
      },
    },
    status: { type: String, enum: ['lead', 'stock', 'rented'], default: 'lead' },
    inspection_tier: { type: String, enum: ['full', 'skipped'], default: null },
    call_notes: { type: String, default: null },
    ck_vacant: { type: Boolean, default: null },
    ck_photos_real: { type: Boolean, default: null },
    ck_price_ok: { type: Boolean, default: null },
    ck_location_pin: { type: Boolean, default: null },
    ck_features: { type: Boolean, default: null },
    ck_deposit_is_rent: { type: Boolean, default: null },
    ck_refund_agreed: { type: Boolean, default: null },
    deposit_paid_at: { type: Date, default: null },
    rented_at: { type: Date, default: null },
    beds_left: { type: Number, min: 0, default: 1 },
    rented: { type: Boolean, default: false },
    sold: {
      type: [
        {
          user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          charge_id: { type: String },
          paid_at: { type: Date },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

roomSchema.index({ status: 1 });
roomSchema.index({ hostel_id: 1 });
roomSchema.index({ price: 1 });
roomSchema.index({ available_from: 1 });
roomSchema.index({ 'sold.charge_id': 1 }, { unique: true, sparse: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
