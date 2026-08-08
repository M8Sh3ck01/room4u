const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    area_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },
    caretaker_name: { type: String, trim: true, default: null },
    caretaker_phone: { type: String, trim: true, default: null },
    lat: { type: Number, min: -90, max: 90, default: null },
    lng: { type: Number, min: -180, max: 180, default: null },
  },
  { timestamps: true }
);

hostelSchema.index({ area_id: 1 });

const Hostel = mongoose.model('Hostel', hostelSchema);

module.exports = Hostel;
