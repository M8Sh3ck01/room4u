require('module-alias/register');

const app = require('./app');
const config = require('@config');
const { dbConnect } = require('@core/db');

async function connectDbInBackground() {
  try {
    await dbConnect(config.mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.warn('MongoDB not connected:', err.message);
    console.warn('Set MONGODB_URI in server/.env (e.g. mongodb://127.0.0.1:27017/room4u or your Atlas M0 URI).');
  }
}

app.listen(config.port, () => {
  console.log(`Room4U API listening on http://localhost:${config.port}`);
  connectDbInBackground();
});
