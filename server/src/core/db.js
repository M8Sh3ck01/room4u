const mongoose = require('mongoose');

let cached = null;

async function dbConnect(uri) {
  if (cached) return cached;

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      cached = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      return cached;
    } catch (err) {
      lastErr = err;
      if (attempt === 3) break;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastErr;
}

module.exports = { dbConnect };
