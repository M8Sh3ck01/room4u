const express = require('express');
const bookingsRoutes = require('./bookings.routes');

const router = express.Router();

router.use(bookingsRoutes);

module.exports = router;
