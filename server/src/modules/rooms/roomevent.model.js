const mongoose = require('mongoose');

const roomEventSchema = new mongoose.Schema(
  {
    room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    from_status: { type: String, enum: ['lead', 'stock', 'rented'], default: null },
    to_status: { type: String, enum: ['lead', 'stock', 'rented'], default: null },
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

roomEventSchema.index({ room_id: 1 });
roomEventSchema.index({ created_at: 1 });

const RoomEvent = mongoose.model('RoomEvent', roomEventSchema);

module.exports = RoomEvent;
