const mongoose = require('mongoose');

const landlordSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true, default: null },
    tier: { type: String, enum: ['full', 'skipped'], default: 'full' },
    flag: { type: String, enum: ['none', 'warn', 'blacklist'], default: 'none' },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

landlordSchema.index({ name: 1 });
landlordSchema.index({ phone: 1 });

const Landlord = mongoose.model('Landlord', landlordSchema);

module.exports = Landlord;
