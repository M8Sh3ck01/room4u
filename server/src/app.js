require('module-alias/register');

const express = require('express');

const { notFound } = require('@core/middleware/notFound');
const { errorHandler } = require('@core/middleware/errorHandler');

const usersRoutes = require('@modules/users');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', usersRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
