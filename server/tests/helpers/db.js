const mongoose = require('mongoose');
const config = require('@config');

const testUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/room4u_test';

async function connectTestDb() {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 15000 });
  } catch (err) {
    throw new Error(
      `Tests need a MongoDB at ${testUri}. ` +
        `Start a local mongod, or set MONGODB_URI_TEST to an Atlas M0 test database.\n` +
        `Original error: ${err.message}`
    );
  }
}

async function clearDb() {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectTestDb, clearDb, disconnectDb, testUri };
