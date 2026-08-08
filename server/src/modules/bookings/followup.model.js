const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
    },
    due_date: { type: Date, required: true },
    status: { type: String, enum: ['due', 'done', 'skipped'], default: 'due' },
    outcome: {
      type: String,
      enum: ['all_good', 'refund_claim', 'landlord_issue', 'none'],
      default: null,
    },
    notes: { type: String, default: null },
    done_at: { type: Date, default: null },
  },
  { timestamps: true }
);

followUpSchema.index({ due_date: 1 });
followUpSchema.index({ status: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);

module.exports = FollowUp;
