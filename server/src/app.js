require('module-alias/register');

const path = require('path');
const fs = require('fs');
const express = require('express');

const { notFound } = require('@core/middleware/notFound');
const { errorHandler } = require('@core/middleware/errorHandler');

const { verifyWebhookSignature } = require('@shared/services/paychanguService');
const { handlePayChanguWebhook } = require('@shared/services/paychanguWebhook');

const usersRoutes = require('@modules/users');
const roomsRoutes = require('@modules/rooms');
const bookingsRoutes = require('@modules/bookings');

const app = express();

app.post(
  '/api/webhooks/paychangu',
  express.raw({ type: () => true, limit: '1mb' }),
  async (req, res, next) => {
    try {
      const signature = req.headers['signature'] || req.headers['x-paychangu-signature'];
      if (!verifyWebhookSignature(req.body, signature)) {
        return res
          .status(401)
          .json({ error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
      }
      const result = await handlePayChanguWebhook(req.body);
      return res.status(200).json({ ok: true, ...result });
    } catch (err) {
      return next(err);
    }
  }
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', usersRoutes);
app.use('/api', roomsRoutes);
app.use('/api', bookingsRoutes);

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');

if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(clientIndex);
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
