const express = require('express');
const roomRoutes = require('./room.routes');
const areaRoutes = require('./area.routes');

const router = express.Router();

router.use(roomRoutes);
router.use(areaRoutes);

module.exports = router;
