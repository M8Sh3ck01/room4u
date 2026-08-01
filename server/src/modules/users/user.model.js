const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    google_sub: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: '' },
    avatar_url: { type: String, default: '' },
    phone: { type: String, trim: true, default: null },
    is_operator: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

const serializeUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  avatar_url: u.avatar_url,
  phone: u.phone,
  is_operator: u.is_operator,
});

module.exports = User;
module.exports.serializeUser = serializeUser;
