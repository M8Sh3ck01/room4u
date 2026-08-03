const express = require('express');
const roomRoutes = require('./room.routes');

const router = express.Router();

router.use(roomRoutes);

module.exports = router;
