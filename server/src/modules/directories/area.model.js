const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

const Area = mongoose.model('Area', areaSchema);

const serializeArea = (a) => ({ id: a.id, name: a.name });

module.exports = Area;
module.exports.serializeArea = serializeArea;
