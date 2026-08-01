require('module-alias/register');

const path = require('path');
const fs = require('fs');
const express = require('express');

const { notFound } = require('@core/middleware/notFound');
const { errorHandler } = require('@core/middleware/errorHandler');

const usersRoutes = require('@modules/users');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', usersRoutes);

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
